# Email Service

Transactional emails are abstracted behind an `EmailService` interface, making it easy to stay in demo mode or enable real sending.

## Interface

`types/types.ts`:

```ts
export interface EmailService {
  sendPaymentSuccess(email: string, tenantName: string, amount: number): Promise<void>;
  sendPaymentFailed(email: string, tenantName: string): Promise<void>;
  sendTrialEnding(email: string, tenantName: string, endDate: Date): Promise<void>;
}
```

## No‑Op Implementation (Demo)

`lib/email/noop-email-service.ts` simply logs each email call. No actual messages are sent.

## Factory

`lib/email/index.ts` exports `getEmailService()`. It checks the environment variable `ENABLE_EMAIL_SENDING`:

- If `'true'`, it would instantiate a real SMTP service (e.g., Resend, SendGrid) – not yet built.
- Otherwise, it returns a `NoopEmailService`.

## Adding a Real Email Sender

1. Create a class that implements `EmailService` (e.g., `SmtpEmailService`).
2. Register it in the factory when `ENABLE_EMAIL_SENDING='true'`.

All the billing code calls the same methods without modification.