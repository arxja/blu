# Payment Provider Abstraction

The payment provider layer isolates Stripe’s API and signing methods from the rest of the application.

## Interface

Located in `types/types.ts`:

```ts
export interface WebhookEvent {
  id: string;
  type: string;
  data: any;
  customerId: string | null;
  provider: string;
}

export interface PaymentProvider {
  verifySignature(rawBody: string, signature: string): boolean;
  parseEvent(rawBody: string): WebhookEvent;
}
```

## StripeProvider

`lib/payment-provider/stripe-provider.ts` implements the interface using the `stripe` SDK.

- **Signature verification** – Uses `stripe.webhooks.constructEvent`. Returns `true` only if the signature matches the secret.
- **Event parsing** – Parses the raw JSON and extracts `customerId` from `data.object.customer` or `data.object.customer_id`.

## Factory

`lib/payment-provider/index.ts` exports `getPaymentProvider('stripe')` which returns a singleton `StripeProvider`. For additional providers, extend the factory.

## Why an abstraction?

If you ever switch to Paddle, LemonSqueezy, or another payment processor, you only need to:

1. Implement a new `PaymentProvider` class.
2. Register it in the factory.

The webhook route and all business logic remain unchanged.