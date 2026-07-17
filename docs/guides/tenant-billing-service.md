# Tenant Billing Service

`services/tenant-billing.service.ts` contains the core business logic that responds to Stripe events.
It reads the event type and applies the appropriate changes to the `Tenant` model.

## Handled Event Types

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Upgrade tenant to the purchased plan (pro or enterprise), set status `active`, update quotas, store `stripeCustomerId`. |
| `customer.subscription.updated` | Sync plan/quotas if the price changed, update status from Stripe’s status (`active`, `past_due`, `trialing`, etc.), update `trialEndsAt`. |
| `customer.subscription.deleted` | Downgrade tenant to free plan, set status `suspended`, reset quotas. |
| `invoice.payment_succeeded` | Set tenant status to `active` (if not already) and send a payment success email. |
| `invoice.payment_failed` | Set status to `past_due` and send a payment failure email. |
| `customer.subscription.trial_will_end` | Send a trial ending reminder email. |

## Processing Flow

1. **Idempotency check** – Skip if event already processed.
2. **Switch on event type** – Route to the appropriate handler function.
3. **Database update** – Use Mongoose to find the tenant by `stripeCustomerId` and modify relevant fields.
4. **Email notification** – Call `getEmailService()` which returns a no‑op in demo or a real sender in production.
5. **Mark as processed** – Insert into `ProcessedWebhooks`.

## Finding the Tenant

The service locates a tenant using:
- `stripeCustomerId` (stored on the tenant) – available in most subscription/invoice events.
- `client_reference_id` from the checkout session – set during the checkout process to the tenant’s `ownerId`.

If no tenant is found, the event is logged and ignored (you may later choose to auto‑create tenants).

## Error Handling

Any error during processing is logged and re‑thrown, so the queue’s retry mechanism can attempt it again (up to 3 times in the in‑memory queue).