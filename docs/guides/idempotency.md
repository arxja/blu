# Idempotency & Deduplication

Stripe may deliver the same webhook event more than once.
To prevent double‑processing (e.g., upgrading a tenant twice), we use an **idempotency store** backed by MongoDB.

## How it works

1. When an event arrives, we check if its `event.id` already exists in the `processedwebhooks` collection.
2. If it exists, the event is skipped.
3. If not, we process it and then insert a record with a TTL index (24 hours).

## MongoDB Model

`lib/database/models/processedWebhook.model.ts`:

```ts
import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  eventId: { type: String, required: true, unique: true },
  processedAt: { type: Date, default: Date.now, expires: 86400 } // 24h TTL
});
```

The TTL index automatically removes old documents, so the collection stays small.

## Store Class

`lib/idempotency/mongo-idempotency-store.ts`:

- `isProcessed(eventId)` – checks existence.
- `markProcessed(eventId)` – inserts the event; ignores duplicate key errors (code 11000).

This class is used inside `tenant-billing.service.ts` before any business logic runs.