// @vitest-environment node

import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { Types } from "mongoose";

import { connectDB } from "@/lib/database/mongoose";
import * as arcjetModule from "@/lib/arcjet/ingestion";

import {
  callIngest,
  cleanupTestTenant,
  createTestTenant,
  makeEvent,
  readTenantEvents,
} from "../helpers/ingestion";

// ─────────────────────────────────────────────────────────────────
// Warm up connections once per file.
//
// The first test that touches Mongo pays for the Atlas handshake,
// the Neon client init, and Arcjet's first remote call. Warming up
// in `beforeAll` moves that cost out of any single test's timeout.
// ─────────────────────────────────────────────────────────────────

beforeAll(async () => {
  await connectDB();
});

// ─────────────────────────────────────────────────────────────────
// Tenant lifecycle tracking.
//
// Every test that creates a tenant pushes its id here. `afterEach`
// cleans them all up. Tenants created inside failed tests still get
// cleaned up because afterEach always runs.
// ─────────────────────────────────────────────────────────────────

const createdTenants: Types.ObjectId[] = [];

afterEach(async () => {
  await Promise.all(createdTenants.map(cleanupTestTenant));
  createdTenants.length = 0;
  vi.restoreAllMocks();
});

// ─────────────────────────────────────────────────────────────────
// Hardening matrix — matches the rows from the Phase 1 doc.
//
// timeout: 30s accommodates real Neon + Atlas + Arcjet round-trips.
// ─────────────────────────────────────────────────────────────────

describe("POST /api/ingest — hardening matrix", { timeout: 30_000 }, () => {
  // ────────── Acceptance ──────────

  it("accepts a single valid event", async () => {
    const t = await createTestTenant();
    createdTenants.push(t.tenantId);

    const event = makeEvent({ event: "single_event" });
    const { status, body } = await callIngest({
      apiKey: t.apiKey,
      body: { events: [event] },
    });

    expect(status).toBe(200);
    expect(body).toEqual({ accepted: 1, duplicates: 0 });

    const rows = await readTenantEvents(t.publicId);
    expect(rows).toHaveLength(1);
    expect(rows[0].eventId).toBe(event.eventId);
    expect(rows[0].tenantId).toBe(t.publicId);
    expect(rows[0].eventName).toBe("single_event");
  });

  it("accepts a valid batch", async () => {
    const t = await createTestTenant();
    createdTenants.push(t.tenantId);

    const events = Array.from({ length: 5 }, () => makeEvent());
    const { status, body } = await callIngest({
      apiKey: t.apiKey,
      body: { events },
    });

    expect(status).toBe(200);
    expect(body).toEqual({ accepted: 5, duplicates: 0 });

    const rows = await readTenantEvents(t.publicId);
    expect(rows).toHaveLength(5);
  });

  // ────────── API key rejection ──────────

  it("rejects a missing API key with 401", async () => {
    const { status, body } = await callIngest({
      body: { events: [makeEvent()] },
    });

    expect(status).toBe(401);
    expect(body).toMatchObject({
      error: { code: "UNAUTHORIZED" },
    });
  });

  it("rejects an unknown API key with 401", async () => {
    const { status, body } = await callIngest({
      apiKey: "blu_" + "0".repeat(64),
      body: { events: [makeEvent()] },
    });

    expect(status).toBe(401);
    expect(body).toMatchObject({
      error: { code: "UNAUTHORIZED", message: "Invalid API key" },
    });
  });

  it("rejects an inactive API key with uniform 401", async () => {
    const t = await createTestTenant({ keyActive: false });
    createdTenants.push(t.tenantId);

    const { status, body } = await callIngest({
      apiKey: t.apiKey,
      body: { events: [makeEvent()] },
    });

    expect(status).toBe(401);
    expect(body).toMatchObject({
      error: { code: "UNAUTHORIZED", message: "Invalid API key" },
    });
  });

  // ────────── Tenant status rejection ──────────

  it.each([
    ["pending_payment"],
    ["past_due"],
    ["suspended"],
    ["trialing"],
  ] as const)("rejects tenant in status '%s' with 403", async (status) => {
    const t = await createTestTenant({ status });
    createdTenants.push(t.tenantId);

    const { status: httpStatus, body } = await callIngest({
      apiKey: t.apiKey,
      body: { events: [makeEvent()] },
    });

    expect(httpStatus).toBe(403);
    expect(body).toMatchObject({
      error: { code: "FORBIDDEN", message: "Tenant is not active" },
    });
  });

  // ────────── Event payload rejection ──────────

  it("rejects an event with a malformed eventId", async () => {
    const t = await createTestTenant();
    createdTenants.push(t.tenantId);

    const { status, body } = await callIngest({
      apiKey: t.apiKey,
      body: { events: [makeEvent({ eventId: "not-a-uuid" })] },
    });

    expect(status).toBe(400);
    expect(body).toMatchObject({
      error: {
        code: "BAD_REQUEST",
        message: "Request payload failed validation.",
      },
    });
    const details = (body as { error: { details: unknown[] } }).error.details;
    expect(Array.isArray(details)).toBe(true);
    expect(JSON.stringify(details)).toContain("eventId");
  });

  it("rejects an empty events array", async () => {
    const t = await createTestTenant();
    createdTenants.push(t.tenantId);

    const { status, body } = await callIngest({
      apiKey: t.apiKey,
      body: { events: [] },
    });

    expect(status).toBe(400);
    expect(body).toMatchObject({ error: { code: "BAD_REQUEST" } });
  });

  it("rejects a request with unknown top-level fields", async () => {
    const t = await createTestTenant();
    createdTenants.push(t.tenantId);

    const { status } = await callIngest({
      apiKey: t.apiKey,
      body: {
        events: [makeEvent()],
        tenantId: "attempt-to-override",
      },
    });

    expect(status).toBe(400);
  });

  // ────────── Payload size ──────────

  it("rejects oversized payload with 413 (Content-Length lie)", async () => {
    const t = await createTestTenant();
    createdTenants.push(t.tenantId);

    const { status, body } = await callIngest({
      apiKey: t.apiKey,
      body: { events: [makeEvent()] },
      contentLength: 10 * 1024 * 1024,
    });

    expect(status).toBe(413);
    expect(body).toMatchObject({ error: { code: "PAYLOAD_TOO_LARGE" } });
  });

  // ────────── Rate limit ──────────

  it("rejects with 429 when the burst limit is exceeded", async () => {
    const t = await createTestTenant({
      quotas: { ingestionEventsPerSec: 1, ingestionBurstEvents: 1 },
    });
    createdTenants.push(t.tenantId);

    // Arcjet's decision engine is unreliable in local dev (it
    // substitutes 127.0.0.1 for the client IP and its state machine
    // doesn't work correctly). We mock the decision to "denied" for
    // this one call. The handler's contract — call protectIngestion,
    // check isDenied, return 429 — is what we're verifying.
    vi.spyOn(arcjetModule, "protectIngestion").mockResolvedValueOnce({
      isDenied: () => true,
      reason: { isRateLimit: () => true },
    } as never);

    const { status, body } = await callIngest({
      apiKey: t.apiKey,
      body: { events: [makeEvent(), makeEvent()] },
    });

    expect(status).toBe(429);
    expect(body).toMatchObject({ error: { code: "RATE_LIMITED" } });
  });

  // ────────── Monthly quota ──────────

  it("rejects with 429 when the monthly event quota is exhausted", async () => {
    const t = await createTestTenant({
      quotas: { monthlyEvents: 0 },
    });
    createdTenants.push(t.tenantId);

    const { status, body } = await callIngest({
      apiKey: t.apiKey,
      body: { events: [makeEvent()] },
    });

    expect(status).toBe(429);
    expect(body).toMatchObject({ error: { code: "RATE_LIMITED" } });
  });

  // ────────── Deduplication ──────────

  it("deduplicates a repeated eventId within a tenant", async () => {
    const t = await createTestTenant();
    createdTenants.push(t.tenantId);

    const event = makeEvent();

    const first = await callIngest({
      apiKey: t.apiKey,
      body: { events: [event] },
    });
    expect(first.status).toBe(200);
    expect(first.body).toEqual({ accepted: 1, duplicates: 0 });

    const second = await callIngest({
      apiKey: t.apiKey,
      body: { events: [event] },
    });
    expect(second.status).toBe(200);
    expect(second.body).toEqual({ accepted: 0, duplicates: 1 });

    const rows = await readTenantEvents(t.publicId);
    expect(rows).toHaveLength(1);
  });

  // ────────── Tenant isolation ──────────

  it("never lets Tenant A's key write to Tenant B's data", async () => {
    const a = await createTestTenant();
    const b = await createTestTenant();
    createdTenants.push(a.tenantId, b.tenantId);

    await callIngest({
      apiKey: a.apiKey,
      body: { events: [makeEvent(), makeEvent()] },
    });

    const aRows = await readTenantEvents(a.publicId);
    expect(aRows).toHaveLength(2);
    expect(aRows.every((r) => r.tenantId === a.publicId)).toBe(true);

    const bRows = await readTenantEvents(b.publicId);
    expect(bRows).toHaveLength(0);
  });

  // ────────── SDK retry semantics ──────────

  it("produces no duplicates when the same batch is sent twice (SDK retry)", async () => {
    const t = await createTestTenant();
    createdTenants.push(t.tenantId);

    const batch = [makeEvent(), makeEvent(), makeEvent()];

    const first = await callIngest({
      apiKey: t.apiKey,
      body: { events: batch },
    });
    expect(first.body).toEqual({ accepted: 3, duplicates: 0 });

    const second = await callIngest({
      apiKey: t.apiKey,
      body: { events: batch },
    });
    expect(second.body).toEqual({ accepted: 0, duplicates: 3 });

    const rows = await readTenantEvents(t.publicId);
    expect(rows).toHaveLength(3);
  });
});
