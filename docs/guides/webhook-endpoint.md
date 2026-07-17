# Webhook Endpoint

The single endpoint at `/api/webhooks/stripe` receives all Stripe events.

## Route Setup

`app/api/webhooks/stripe/route.ts`:

- **Signature verification** – Uses `getPaymentProvider('stripe').verifySignature()`.
- **Immediate 202** – On valid signature, we parse the event, enqueue it, and return `{ received: true }` with status `202`.
- **Error responses** – Missing signature → `400`, invalid signature → `401`.

## Code Walkthrough

```ts
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature");
  // ... verification ...
  const event = provider.parseEvent(rawBody);
  queue.enqueue({ id: event.id, event }, async (job) => {
    await handleWebhookEvent(job.event);
  });
  return NextResponse.json({ received: true }, { status: 202 });
}
```

Because `queue.enqueue` defers the work, Stripe gets its response in under a second.
