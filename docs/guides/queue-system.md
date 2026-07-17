# Job Queue System

The webhook route must respond quickly (< 2 seconds) to avoid Stripe timeouts.
To achieve this, we **defer all business logic** to a background queue.

## QueueAdapter Interface

`types/types.ts`:

```ts
export interface QueueAdapter {
  enqueue(job: QueueJob, handler: (job: QueueJob) => Promise<void>): void;
}
```

The `QueueJob` contains the webhook event.

## In‑Memory Implementation (Demo)

`lib/queue/in-memory.ts` provides a simple but robust in‑process queue with:

- **Exponential backoff retries** – up to 3 attempts with delays: 200 ms, 400 ms, 800 ms.
- **Dead‑letter collection** – failed jobs are stored in an array for inspection.
- **Non‑blocking execution** – jobs are started with `setTimeout(0)` so the HTTP response goes out immediately.

This implementation works well on Vercel because most webhook handlers finish well within the function’s remaining lifetime.

## Production Migration (JetQueue)

When you’re ready for production, replace the in‑memory queue with JetQueue while keeping the same `QueueAdapter` interface.

### What changes

1. **New adapter** – Write `JetQueueAdapter` that pushes jobs to a persistent queue instead of running them in‑process.
2. **Job serialization** – JetQueue needs plain data, not functions. Instead of passing a callback, you’ll push just the event data and have a separate worker that calls the appropriate handler from a registry.
3. **Worker** – A dedicated process (or serverless endpoint) pulls jobs and invokes `handleWebhookEvent`.
4. **Configuration** – Add `JETQUEUE_CONNECTION_STRING` to env vars.

### What stays the same

- The `QueueAdapter` interface.
- All callers (webhook route, any future producers).
- Business logic (`tenant-billing.service.ts`) – untouched.

### Registry example for worker

```ts
import { handleWebhookEvent } from '@/services/tenant-billing.service';

export const jobHandlers = {
  'stripe.webhook': handleWebhookEvent,
};
```

The webhook route will then call `queue.enqueue({ id: event.id, event })` without a callback.