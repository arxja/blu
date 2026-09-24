export interface WebhookEvent {
  id: string;
  type: string;
  data: any;
  customerId: string | null;
  provider: string;
}

export interface CreateCheckoutSessionInput {
  tenantId: string;
  planId: string;
  priceId: string;
  customerEmail: string;
  stripeCustomerId?: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutSessionResult {
  id: string;
  url: string;
}

export interface PaymentProvider {
  verifySignature(rawBody: string, signature: string): boolean;

  parseEvent(rawBody: string): WebhookEvent;

  createCheckoutSession(
    input: CreateCheckoutSessionInput,
  ): Promise<CheckoutSessionResult>;
}
