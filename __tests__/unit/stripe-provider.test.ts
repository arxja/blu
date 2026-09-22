// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const createCheckoutSessionMock = vi.fn();

vi.mock("stripe", () => {
  return {
    default: class Stripe {
      checkout = {
        sessions: {
          create: createCheckoutSessionMock,
        },
      };

      webhooks = {
        constructEvent: vi.fn(),
      };
    },
  };
});

vi.mock("@/lib/config", () => ({
  serverConfig: {
    STRIPE_SECRET_KEY: "sk_test_fake",
    STRIPE_WEBHOOK_SECRET: "whsec_test_fake",
  },
}));

vi.mock("@/lib/logger/", () => ({
  log: {
    security: vi.fn(),
  },
}));

import { StripeProvider } from "@/lib/payment-provider/stripe-provider";

describe("StripeProvider.createCheckoutSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a subscription checkout session", async () => {
    createCheckoutSessionMock.mockResolvedValue({
      id: "cs_test_123",
      url: "https://checkout.stripe.com/cs_test_123",
    });

    const provider = new StripeProvider();

    const result = await provider.createCheckoutSession({
      tenantId: "tenant_123",
      planId: "pro",
      priceId: "price_pro",
      customerEmail: "billing@acme.com",
      successUrl: "https://app.blu.test/billing/success",
      cancelUrl: "https://app.blu.test/billing/cancel",
    });

    expect(result).toEqual({
      id: "cs_test_123",
      url: "https://checkout.stripe.com/cs_test_123",
    });

    expect(createCheckoutSessionMock).toHaveBeenCalledOnce();

    expect(createCheckoutSessionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "subscription",

        line_items: [
          {
            price: "price_pro",
            quantity: 1,
          },
        ],

        client_reference_id: "tenant_123",

        metadata: {
          tenantId: "tenant_123",
          planId: "pro",
        },

        subscription_data: {
          metadata: {
            tenantId: "tenant_123",
            planId: "pro",
          },
        },

        customer_email: "billing@acme.com",

        success_url: "https://app.blu.test/billing/success",
        cancel_url: "https://app.blu.test/billing/cancel",
      }),
    );
  });

  it("uses an existing Stripe customer when provided", async () => {
    createCheckoutSessionMock.mockResolvedValue({
      id: "cs_test_456",
      url: "https://checkout.stripe.com/cs_test_456",
    });

    const provider = new StripeProvider();

    await provider.createCheckoutSession({
      tenantId: "tenant_456",
      planId: "pro",
      priceId: "price_pro",
      customerEmail: "billing@acme.com",
      stripeCustomerId: "cus_123",
      successUrl: "https://app.blu.test/billing/success",
      cancelUrl: "https://app.blu.test/billing/cancel",
    });

    expect(createCheckoutSessionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: "cus_123",
      }),
    );

    const call = createCheckoutSessionMock.mock.calls[0][0];

    expect(call).not.toHaveProperty("customer_email");
  });

  it("does not configure a trial", async () => {
    createCheckoutSessionMock.mockResolvedValue({
      id: "cs_test_789",
      url: "https://checkout.stripe.com/cs_test_789",
    });

    const provider = new StripeProvider();

    await provider.createCheckoutSession({
      tenantId: "tenant_789",
      planId: "pro",
      priceId: "price_pro",
      customerEmail: "billing@acme.com",
      successUrl: "https://app.blu.test/billing/success",
      cancelUrl: "https://app.blu.test/billing/cancel",
    });

    const call = createCheckoutSessionMock.mock.calls[0][0];

    expect(call).not.toHaveProperty("trial_period_days");
    expect(call.subscription_data).not.toHaveProperty("trial_period_days");
  });

  it("throws when Stripe does not return a checkout URL", async () => {
    createCheckoutSessionMock.mockResolvedValue({
      id: "cs_test_no_url",
      url: null,
    });

    const provider = new StripeProvider();

    await expect(
      provider.createCheckoutSession({
        tenantId: "tenant_123",
        planId: "pro",
        priceId: "price_pro",
        customerEmail: "billing@acme.com",
        successUrl: "https://app.blu.test/billing/success",
        cancelUrl: "https://app.blu.test/billing/cancel",
      }),
    ).rejects.toThrow("Stripe Checkout session did not return a URL.");
  });
});
