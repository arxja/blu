# Multi-Tenancy Architecture

> **Status:** Implemented and merged
>
> **Scope:** Subdomain-based multi-tenancy for the Blu SaaS application
>
> **Audience:** Blu maintainers, contributors, open-source developers, and future employees

## 1. Overview

Blu uses a **shared-database, shared-application, subdomain-based multi-tenant architecture**.

The control plane runs on the application host, while each tenant is addressed through its own subdomain:

```text
Development
  Control plane: app.blu.test
  Tenant:        demo.blu.test
  Tenant:        acme.blu.test

Production
  Control plane: app.blu.so
  Tenant:        demo.blu.so
  Tenant:        acme.blu.so
```

A user's identity is global. Tenant membership determines which workspaces the user can access, and `tenantId` scopes tenant-owned data.

The four core rules are:

1. **JWT identifies the user.**
2. **Hostname identifies the tenant being requested.**
3. **Membership authorizes the user for that tenant.**
4. **`tenantId` isolates tenant-owned data.**

---

## 2. Goals

The tenancy layer is responsible for:

- allowing one user to belong to multiple tenants;
- routing tenant requests by subdomain;
- keeping the control plane separate from tenant applications;
- authorizing tenant access through memberships;
- sharing authentication across the root domain and tenant subdomains;
- keeping tenant-owned database records scoped by `tenantId`;
- keeping development and production domain behavior structurally equivalent.

It is **not** responsible for making every business rule globally. Role permissions, quotas, billing enforcement, and tenant-specific business rules sit above the core tenancy layer.

---

## 3. High-Level Architecture

```mermaid
flowchart TD
    U[User]

    U -->|Sign in| CP[Control Plane\napp.blu.test / app.blu.so]
    CP --> D[/dashboard]
    D -->|Select workspace| L[Launch Route\n/api/workspaces/:tenantId/launch]

    L --> A[authorizeTenantAccess]
    A --> M[(Membership)]
    A --> T[(Tenant)]
    A -->|Authorized| R[307 Redirect\nhttps/http://{subdomain}.base-domain]

    R --> TH[demo.blu.test / demo.blu.so]
    TH --> P[Next.js Proxy\nproxy.ts]

    P -->|Tenant request| DR[/s/[subdomain]/...]
    P -->|API request| API[/api/*]
    P -->|Control-plane host| APP[Control-plane routes]

    DR --> TC[requireTenantContext(subdomain)]
    TC --> T
    TC --> M
    TC --> UDB[(DashboardUser)]
    TC --> TA[Tenant Application]

    TA --> DATA[(MongoDB\nTenant-owned data scoped by tenantId)]
    API --> DATA

    CP -. shared HttpOnly cookie .-> TH
```

---

## 4. Request and Routing Model

### 4.1 Control-plane request

A request such as:

```text
http://app.blu.test:3000/dashboard
```

is treated as a control-plane request.

The proxy recognizes the application host and lets normal App Router routing handle the request:

```text
app.blu.test/dashboard
    -> proxy.ts
    -> /dashboard
    -> app/(dashboard)/dashboard/page.tsx
```

### 4.2 Tenant request

A request such as:

```text
http://demo.blu.test:3000/analytics
```

is treated as a tenant request.

The proxy extracts `demo` and rewrites the request internally:

```text
demo.blu.test/analytics
    -> proxy.ts
    -> /s/demo/analytics
    -> app/s/[subdomain]/analytics/page.tsx
```

The browser continues to display the tenant hostname. `/s/demo` is an internal application route.

### 4.3 API request

API requests are **not** tenant-page rewrites.

For example:

```text
demo.blu.test/api/auth/me
```

remains an API request:

```text
demo.blu.test/api/auth/me
    -> proxy.ts
    -> /api/auth/me
    -> app/api/auth/me/route.ts
```

This is important because authentication and service APIs are shared application infrastructure.

---

## 5. Identity, Tenant, and Membership

### 5.1 DashboardUser

`DashboardUser` represents the global identity.

A user is **not owned by a tenant**. This allows the same account to join multiple workspaces.

Relevant fields include:

```text
_id
email
name
passwordHash
isActive
lastLoginAt
```

### 5.2 Tenant

`Tenant` represents a customer/workspace.

The critical routing field is:

```text
subdomain
```

Example:

```text
Tenant.subdomain = "demo"
```

maps to:

```text
demo.blu.test
demo.blu.so
```

depending on the environment.

### 5.3 Membership

`Membership` is the relationship between users and tenants.

```text
userId
tenantId
role
isActive
```

The unique compound index on `(userId, tenantId)` prevents duplicate memberships.

The role model currently supports:

```text
owner
admin
analyst
viewer
```

Membership is the authorization bridge. Knowing a tenant's subdomain does **not** grant access to that tenant.

---

## 6. Authentication Model

Blu uses a JWT stored in an HttpOnly cookie.

The JWT contains the user's global identity:

```text
userId
email
```

It intentionally does **not** contain `tenantId`.

Tenant selection is request-specific:

```text
JWT
  -> user identity

Hostname / dynamic route
  -> tenant identity

Membership
  -> user-to-tenant authorization
```

### Cookie scope

Development:

```env
AUTH_COOKIE_DOMAIN=blu.test
AUTH_COOKIE_SECURE=false
```

Production:

```env
AUTH_COOKIE_DOMAIN=blu.so
AUTH_COOKIE_SECURE=true
```

This allows one authenticated session to be usable on the control-plane host and tenant subdomains.

---

## 7. Tenant Context

Tenant pages should obtain their authorization context through the tenancy service rather than reimplementing tenant lookup.

The intended abstraction is:

```ts
const context = await requireTenantContext(subdomain);
```

The resulting context contains:

```text
user
tenant
membership
```

The lookup sequence is:

```text
subdomain
   -> Tenant
   -> Membership(userId, tenantId, isActive)
   -> TenantContext
```

This gives tenant application code a trusted tenant identity and membership.

---

## 8. Workspace Launch Flow

The dashboard displays the tenants the current user belongs to.

The launch flow is server-authorized:

```text
/dashboard
   -> select workspace
   -> /api/workspaces/:tenantId/launch
   -> authenticate current user
   -> authorizeTenantAccess(userId, tenantId)
   -> load Tenant.subdomain
   -> redirect to tenant host
```

The client is not allowed to simply claim access to a tenant by changing its URL.

For a user who is not a member:

```text
userId + tenantId
      -> no active Membership
      -> 403 Forbidden
```

---

## 9. Data Isolation

The tenancy layer is not complete merely because subdomains are isolated.

Every tenant-owned document must carry a `tenantId` field.

Current tenant-scoped models include:

```text
Event
Dashboard
Report
ApiKey
Invitation
TenantUsage
```

The required query pattern is:

```ts
Event.find({
  tenantId,
  ...otherFilters,
});
```

Tenant-scoped services should obtain `tenantId` from trusted tenant context rather than from arbitrary client request data.

### Security invariant

A request operating inside tenant `T1` must never be able to select `T2` simply by supplying another tenant ID in query/body parameters.

The application should derive the authoritative tenant from the resolved tenant context and use that ID for all tenant-owned queries.

---

## 10. Redis and Caching

Redis is an optimization layer, not the source of truth for tenant authorization.

The project currently caches items such as:

```text
user workspace lists
tenant lookups
membership-related data
```

MongoDB remains authoritative for:

```text
Tenant
Membership
DashboardUser
```

Membership mutations should invalidate the relevant cached workspace/membership records so that the cache does not become stale.

---

## 11. Environment Configuration

### Development

```env
APP_URL=http://app.blu.test:3000
APP_BASE_DOMAIN=blu.test
AUTH_COOKIE_DOMAIN=blu.test
AUTH_COOKIE_SECURE=false
NEXT_PUBLIC_API_URL=/api
```

Local DNS/hosts configuration must resolve tenant hosts to the local application during development.

### Production

```env
APP_URL=https://app.blu.so
APP_BASE_DOMAIN=blu.so
AUTH_COOKIE_DOMAIN=blu.so
AUTH_COOKIE_SECURE=true
NEXT_PUBLIC_API_URL=/api
```

The application code should not hard-code `blu.so`, `blu.test`, or `localhost` into tenancy logic. Domain behavior comes from configuration.

---

## 12. Proxy Responsibilities

`proxy.ts` is intentionally lightweight.

It is responsible for:

- determining whether the request belongs to the control plane or a tenant host;
- performing cheap authentication/session checks where appropriate;
- rewriting tenant page requests to `/s/[subdomain]/...`;
- leaving API requests as API requests;
- redirecting unauthenticated tenant users to the control-plane sign-in page.

It is **not** the main membership authorization layer and should not become a database-heavy business-logic entry point.

Authoritative tenant authorization belongs in server-side tenant context/access services.

---

## 13. Responsibility Boundaries

```text
proxy.ts
  -> host classification + routing

jwt.ts / auth server helpers
  -> user authentication

hostname.ts
  -> hostname and tenant URL utilities

tenant-access.ts
  -> explicit access checks for tenant selection/launch

tenant-context.ts
  -> tenant request authorization context

models/
  -> MongoDB persistence

services/repositories
  -> tenant-scoped business/data operations

Redis
  -> caching/optimization
```

Avoid moving all of these responsibilities into `proxy.ts` or a single "tenant service".

---

## 14. What Was Intentionally Rejected

The following approaches were considered during implementation and are not part of the final architecture:

- putting `tenantId` inside the JWT;
- trusting a client-supplied `tenantId` as the tenant authority;
- relying on a custom `/_tenant` private route;
- doing full membership/database authorization inside Proxy on every request;
- using separate authentication sessions for every tenant subdomain;
- treating Redis as the authorization source of truth;
- using host-only cookies that cannot cross tenant subdomains;
- hard-coding the production domain into client components.

The final design intentionally follows the simpler **hostname -> dynamic route -> tenant context** model.

---

## 16. Developer Rules

When adding a new tenant-scoped feature:

1. Add `tenantId` to the persisted document if the record belongs to a tenant.
2. Resolve tenant access through the current tenant context.
3. Never trust `tenantId` from the client as the authorization source.
4. Scope all tenant-owned MongoDB queries by the authoritative `tenantId`.
5. Add at least one test demonstrating correct tenant isolation.
6. Keep Proxy focused on routing and inexpensive request checks.

### Example

```ts
const context = await requireTenantContext(subdomain);

const dashboards = await Dashboard.find({
  tenantId: context.tenant._id,
});
```

Not:

```ts
const dashboards = await Dashboard.find({
  tenantId: requestBody.tenantId,
});
```

---

## 17. Testing Matrix

The minimum tenancy test matrix should eventually include:

| Scenario                               | Expected                 |
| -------------------------------------- | ------------------------ |
| Root host request                      | Control-plane route      |
| Valid tenant host                      | Dynamic tenant route     |
| Unknown tenant                         | Not found                |
| Authenticated member                   | Allowed                  |
| Authenticated non-member               | Forbidden                |
| Inactive membership                    | Forbidden                |
| Suspended tenant                       | Restricted/forbidden     |
| Tenant A user requesting Tenant B data | Denied / no leakage      |
| Tenant A analytics query               | Tenant A data only       |
| Tenant B analytics query               | Tenant B data only       |
| Development host                       | Works under `*.blu.test` |
| Production host                        | Works under `*.blu.so`   |

---

## 18. Summary

Blu's tenancy model is deliberately simple:

```text
User identity
    |
    | JWT
    v
Control plane
    |
    | choose workspace
    v
Tenant host
    |
    | Proxy extracts subdomain
    v
Dynamic tenant route
    |
    | TenantContext
    v
Tenant + Membership
    |
    | authoritative tenantId
    v
Tenant-scoped data
```

The core architecture is complete. Future work should extend the tenant-aware application and data layer without adding unnecessary complexity to the fundamental routing model.
