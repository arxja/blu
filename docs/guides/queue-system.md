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

## In‑Memory Implementation (Demo Only)

`lib/queue/in-memory.ts` provides a simple in‑process queue with:

- **Exponential backoff retries** – 4 total execution attempts (1 initial + 3 retries) with delays: 200 ms, 400 ms, 800 ms.
- **Dead‑letter collection** – failed jobs are stored in an array for inspection.
- **Non‑blocking execution** – jobs are started with `setTimeout(0)` so the HTTP response goes out immediately.

> ⚠️ **Demo-only implementation** – This queue is designed for local development and testing only. In serverless environments like Vercel, the `setTimeout`-based execution is not reliable because:
> - The serverless function may terminate before queued jobs complete
> - Retries and dead-letter collection cannot be guaranteed across function invocations
> - Jobs in memory are lost on function shutdown
>
> **For production webhook processing, use a durable queue (see Production Migration below).**

## Production Migration (JetQueue)

When you’re ready for production, replace the in‑memory queue with JetQueue while keeping the same `QueueAdapter` interface.

### What changes

1. **New adapter** – Write `JetQueueAdapter` that pushes jobs to a persistent queue instead of running them in‑process.
2. **Job serialization** – JetQueue needs plain data, not functions. Instead of passing a callback, you’ll push just the event data and have a separate worker that calls the appropriate handler from a registry.
3. **Worker** – A dedicated process (or serverless endpoint) pulls jobs and invokes `handleWebhookEvent`.
4. **Configuration** – Add `JETQUEUE_CONNECTION_STRING` to env vars.
5. **Route import** – Update the webhook route to use the new adapter instead of the direct `in-memory` import. Consider using a factory pattern or environment-based module selection to switch between implementations.

### What stays the same

- The `QueueAdapter` interface.
- Business logic (`tenant-billing.service.ts`) – untouched.

### Registry example for worker

```ts
import { handleWebhookEvent } from '@/services/tenant-billing.service';

export const jobHandlers = {
  'stripe.webhook': handleWebhookEvent,
};
```

The webhook route will then call `queue.enqueue({ id: event.id, event })` without a callback.