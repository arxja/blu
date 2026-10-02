# Architecture Decision Records

Short records of the architectural decisions that shaped Blu.
Each entry captures context, decision, and consequences.

Format adapted from Michael Nygard's ADR pattern.

---

## ADR-001: Contract-first via OpenAPI + Fern

**Status:** Accepted

### Context

The ingestion API and its client SDKs must stay in sync. If the server
evolves independently of the SDKs, clients break silently — a server
adds a required field, an SDK doesn't send it, and events fail validation
in production with no warning.

Hand-maintained types drift. Every serious platform eventually
introduces a contract as the single source of truth. The question was
whether to adopt one now or wait until we had multiple client languages.

### Decision

Define `POST /api/ingest` in an OpenAPI 3.1 document. Generate the
Python SDK via Fern. Hand-write the TypeScript SDK against the same
contract. The OpenAPI file is the source of truth — anything that
contradicts it is wrong.

### Consequences

- **Positive:** One file defines the API. Change it, regenerate the
  Python client, adjust the TS SDK. The verification in Phase 8 (a
  Python-originated event and a JS-originated event are indistinguishable
  in Postgres) proved the contract is truly language-agnostic.
- **Positive:** Third-party integrations can be generated in any
  language Fern supports, without us writing anything new.
- **Negative:** Two definitions of the same shape now exist (OpenAPI
  and Zod in `lib/validations/ingestion.ts`). They must be manually
  kept aligned. We accepted this over generating Zod from OpenAPI
  because hand-written Zod produces better error messages.
- **Negative:** Contract changes require coordination across repos
  (Blu app, SDK monorepo, Fern generation).

---

## ADR-002: Polyglot persistence (MongoDB control plane, PostgreSQL data plane)

**Status:** Accepted

### Context

Blu handles two fundamentally different workloads:

- **Operational state** — tenants, users, memberships, API keys, plans,
  quotas. Low volume, transactional, read and written constantly by the
  dashboard.
- **Event data** — behavioral telemetry. High volume, append-only,
  aggregated analytically.

Trying to serve both from one database means either the operational
side pays for analytics-scale infrastructure, or the analytics side
inherits the operational schema's limitations.

### Decision

Split storage by workload:

- **MongoDB** — control plane. Tenants, users, memberships, API keys,
  plans, quotas, audit logs, webhook idempotency.
- **PostgreSQL (Neon)** — data plane. Raw events in one table,
  `events`.

### Consequences

- **Positive:** Each database is used for what it's good at. Mongo's
  flexible schema handles evolving operational state without
  migrations. Postgres's strong typing and query planner handle
  analytical workloads properly.
- **Positive:** Events can scale independently — partition, shard, or
  move to a columnar store later without touching the operational side.
- **Negative:** Every ingestion request touches both databases. API key
  resolution (Mongo) must produce a tenant identifier that Postgres
  understands (see ADR-003).
- **Negative:** No cross-database transactions. If persistence to
  Postgres succeeds but the quota increment in Mongo fails, they
  diverge. We accept this — the quota counter is bookkeeping, not
  truth. A nightly reconciliation is possible but not yet built.

---

## ADR-003: `publicId` as the cross-database identity

**Status:** Accepted

### Context

Events in Postgres need to be keyed by tenant. The obvious choice —
Mongo's `_id` — is a 24-character ObjectId string. That works
technically but couples Postgres to Mongo's identity scheme.

Three problems with using ObjectId as a foreign key:

1. **Coupling.** Postgres rows break if tenancy ever moves to another
   system.
2. **Exposure.** ObjectIds embed a timestamp and machine identifier.
   They're parseable and reveal internal structure.
3. **Non-portability.** A future analytics warehouse or third-party
   tool expects opaque identifiers, not MongoDB artifacts.

The tenant's `subdomain` was another candidate, but subdomains can
change (rebrands, migrations). A stable identity must not change.

### Decision

Add `Tenant.publicId` — a UUID v4 generated on tenant creation. It is:

- **Immutable.** Cannot be updated through the Mongoose schema.
- **Indexed.** Unique in Mongo.
- **Used as `events.tenant_id` in Postgres.** The Postgres column is a
  native `uuid` type.

`_id` stays internal to Mongo. `publicId` is the portable identity used
everywhere data leaves Mongo's boundary.

### Consequences

- **Positive:** Postgres is decoupled from Mongo. If tenancy ever moves,
  event data doesn't need migration.
- **Positive:** The value is opaque. Nothing about the customer leaks
  through the identifier.
- **Positive:** UUID is a native Postgres type — efficient storage (16
  bytes vs 36 for text), native validation, standard tooling.
- **Negative:** Two identifiers for the same entity. Code must know
  which one to use in which context. Naming (`tenantId` = publicId in
  ingestion context, `tenantObjectId` = Mongo `_id`) reduces the risk
  but doesn't eliminate it.
- **Negative:** Existing tenants need a backfill. In practice, the seed
  recreates everything, so this was a non-issue for Blu.

---

## ADR-004: SDK retry classification via `TransportError`

**Status:** Accepted

### Context

The original SDK implementation retried every failed delivery up to
`maxRetries` times with exponential backoff, then re-queued the batch.
The intent was "retry until success."

This breaks badly for permanent failures. A 400 (invalid payload) or
401 (bad API key) will never succeed on retry. Sending the same request
forever creates a self-inflicted DDoS: the SDK hammers the ingestion
endpoint with requests that will always fail.

The SDK developer is unlikely to notice during testing because they
test with valid keys and valid payloads. The failure mode appears only
under production conditions — bad keys from misconfiguration, or old
SDK versions sending a field the server no longer accepts.

### Decision

Transports classify every failure as either **retryable** or
**permanent** and throw a `TransportError` with a `retryable` boolean:

- **Retryable:** 429 (rate limit), 5xx (server error), network failures,
  timeouts.
- **Permanent:** 4xx except 429 (bad request, unauthorized, forbidden,
  payload too large).

The `EventQueue` reads the flag: retryable errors follow the existing
backoff/retry path; permanent errors drop the batch with a
`console.warn`.

Unknown error types default to **retryable** — a conservative choice
that assumes transient failures when classification is impossible.

### Consequences

- **Positive:** Permanent failures no longer loop. The SDK stops
  attacking the server when the request will never succeed.
- **Positive:** Transient failures still retry with backoff, preserving
  data delivery guarantees for recoverable cases.
- **Positive:** The classification happens once — in the transport,
  which knows the HTTP status. The queue consumes a boolean and stays
  ignorant of HTTP semantics.
- **Negative:** A permanent failure drops the batch. One valid batch is
  lost. We accepted this over infinite retries because losing one batch
  is better than hammering the server.
- **Negative:** The retry loop needs to distinguish `TransportError`
  from generic errors. If a future transport throws something else, the
  classification may be silently wrong.

---

## ADR-005: Uniform 401 responses for all API key failures

**Status:** Accepted

### Context

An invalid API key can fail for several distinct reasons:

- The key hash doesn't match any record.
- The key exists but is inactive.
- The key exists but has expired.
- The key exists and is valid, but its tenant record is missing.

Each failure has a legitimate debug-friendly error message. A developer
integrating with `/api/ingest` would benefit from knowing _which_ of
these went wrong.

But the same information is useful to an attacker. If different
messages leak which failures are "not found" versus "expired," an
attacker can enumerate valid keys and distinguish "this key never
existed" from "this key existed and was revoked."

### Decision

All four failure modes return the exact same response:

```json
{ "error": { "code": "UNAUTHORIZED", "message": "Invalid API key" } }
```

Status code is 401 in all cases. Message is identical. No timing  
information is exposed (key lookup is by hashed value through an  
indexed Mongo query, so response time doesn't vary meaningfully by  
result).

Errors that require a valid key are allowed to be specific:

- **403 — "API key lacks track permission"** — the caller authenticated  
  successfully; the message is safe.
- **403 — "Tenant is not active"** — same reasoning.

### Consequences

- **Positive:** Attackers cannot enumerate keys or distinguish revoked  
  from invalid. The security posture is standard and auditable.
- **Positive:** The rule is simple to remember and enforce — if the key  
  isn't fully valid, the response is uniform.
- **Negative:** Real users debugging their integration get less  
  information. An expired key looks identical to a typo'd key. We  
  accepted this — production key management belongs in the dashboard,  
  not in error messages on the ingestion endpoint.
- **Negative:** Support conversations are harder. "My key doesn't work"  
  has three possible internal causes the client can't see. Server-side  
  logs carry the differentiation for our own investigation.

---

## ADR-006: In-process handler testing instead of an HTTP test server

**Status:** Accepted

### Context

Integration tests for `/api/ingest` need to exercise the full pipeline:  
auth resolution, validation, rate limiting, quota enforcement,  
persistence. There are three common approaches:

1.  **Real HTTP server.** Start Next.js in the test harness, hit it with  
    `fetch`. Highest fidelity, slowest, most infrastructure.
2.  **In-process handler call.** Import the route handler (`POST`) and  
    call it directly with a constructed `NextRequest`. Fast, no server  
    needed, still exercises all business logic.
3.  **Mock the handler.** Fastest, but doesn't test anything about  
    integration — just the caller's expectations.

Approach 3 is a unit test in disguise and was rejected immediately.

Approach 1 is the highest-fidelity option, but requires managing server  
lifecycle, port allocation, and parallel-test isolation. For a solo  
project without CI integration of a real server, that infrastructure  
cost outweighs the fidelity gain — the only thing it verifies that  
approach 2 doesn't is HTTP framing (chunked encoding, headers, TLS),  
which we verified manually during Phase 6.

### Decision

Integration tests use approach 2. `callIngest()` in  
`__tests__/Integration/helpers/ingestion.ts` constructs a `NextRequest`  
and calls the route handler directly. Tests run against real Mongo,  
real Neon, real Upstash Redis, and real Arcjet — only the HTTP layer  
is bypassed.

### Consequences

- **Positive:** Tests run in ~75 seconds for 18 cases. A real-server  
  harness would take 3–5× as long for the same coverage.
- **Positive:** No server lifecycle management, no port conflicts, no  
  parallel-test collisions on ports.
- **Positive:** Every dependency is real. Bugs in Drizzle queries,  
  Arcjet config, or Mongo indexing all surface.
- **Negative:** HTTP framing is untested. Chunked encoding, header  
  casing, and real `fetch` behavior aren't verified by the suite. We  
  accept this — Phase 6's manual curl session covered those, and they  
  don't change often.
- **Negative:** `NextRequest` construction must match what Next.js  
  actually receives. If Next.js changes its request class in a future  
  version, `callIngest` needs adjustment.
- **Negative:** The test imports production code directly. A syntax  
  error in the route file will fail the test with a build error rather  
  than a runtime HTTP error, which is a slightly different debugging  
  experience.

---

## Future ADRs

When Blu is extended with the Understand / Decide / Act layers, likely  
ADRs will include:

- Pre-aggregation strategy for analytics queries at scale
- Rule engine evaluation model (event-driven vs. scheduled)
- Action adapter interface and failure semantics
- Multi-region event storage (if ever)
