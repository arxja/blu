# SaaSify - Billing System Overview

It receives events from Stripe, verifies their authenticity, processes them with at-least-once semantics (with idempotency via MongoDB TTL), and updates your multi‑tenant SaaS data model (Tenant) accordingly.
All heavy work is deferred to a background queue, so the webhook endpoint always responds immediately with `202 Accepted`.

## Architecture

```mermaid
graph TD
    A[Stripe Webhook] --> B[Signature Verification]
B --> C[Provider Abstraction]
C --> D[Idempotency Guard]
D --> E[Job Queue]
E --> F[Immediate 202]
F --> G[Tenant Billing Service]
G --> H[Email Notification]

    style A fill:#1a1a1a,stroke:#666,color:#fff
    style B fill:#1a1a1a,stroke:#666,color:#fff
    style C fill:#1a1a1a,stroke:#666,color:#fff
    style D fill:#1a1a1a,stroke:#666,color:#fff
    style E fill:#1a1a1a,stroke:#666,color:#fff
    style F fill:#1a1a1a,stroke:#666,color:#fff
    style G fill:#1a1a1a,stroke:#666,color:#fff
    style H fill:#1a1a1a,stroke:#666,color:#fff
```

## Key Design Decisions

- **Provider Abstraction** – Stripe is encapsulated behind a `PaymentProvider` interface. Adding Paddle or another provider later only requires a new adapter.
- **Idempotency with MongoDB** – Every event is recorded in a `ProcessedWebhooks` collection with a 24‑hour TTL. Duplicate events are automatically ignored.
- **Queue Adapter Pattern** – The webhook route uses a `QueueAdapter` to enqueue jobs. The demo uses an in‑memory implementation with retries. Switching to JetQueue in production requires no changes outside the adapter.
- **Tenant‑First Updates** – All billing logic reads and writes to the `Tenant` model. Quotas, plan, and status are updated atomically.

## Core Components

| Component               | Responsibility                                          |
| ----------------------- | ------------------------------------------------------- |
| `PaymentProvider`       | Signature verification, event parsing                   |
| `MongoIdempotencyStore` | Prevents double‑processing                              |
| `QueueAdapter`          | Defers work to background                               |
| `TenantBillingService`  | Handles all Stripe event types and updates the database |
| `EmailService`          | Sends transactional emails (no‑op in demo)              |
| Webhook route           | Receives raw body, verifies, enqueues                   |

For details on each part, see the specific guides.
