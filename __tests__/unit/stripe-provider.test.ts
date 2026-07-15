// @vitest-environment node

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock logger
vi.mock("@/lib/logger", () => ({
  log: {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    security: vi.fn(),
    perf: vi.fn(),
    request: vi.fn(),
  },
}));

// Mock config
vi.mock("@/lib/config", () => ({
  serverConfig: {
    NODE_ENV: "development",
    DATABASE_URL: "mongodb://localhost:27017/test",
    JWT_SECRET: "test-secret",
    STRIPE_SECRET_KEY: "sk_test_123",
    APP_URL: "http://localhost:3000",
    LOG_LEVEL: "debug",
    STRIPE_WEBHOOK_SECRET: "whsec_test",
  },
}));

import { StripeProvider } from "@/lib/payment-provider/stripe-provider";

describe("StripeProvider", () => {
  let provider: StripeProvider;
  let constructEventMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new StripeProvider();

    const stripeInstance = (provider as any).stripe;
    constructEventMock = vi.fn();
    stripeInstance.webhooks = {
      constructEvent: constructEventMock,
    };
  });

  it("verifies a valid signature", () => {
    constructEventMock.mockReturnValue({ id: "evt_1" });

    const result = provider.verifySignature("raw", "sig");

    expect(result).toBe(true);
    expect(constructEventMock).toHaveBeenCalledWith("raw", "sig", "whsec_test");
  });

  it("rejects an invalid signature", () => {
    constructEventMock.mockImplementation(() => {
      throw new Error("Signature verification failed");
    });

    const result = provider.verifySignature("raw", "bad_sig");

    expect(result).toBe(false);
    expect(constructEventMock).toHaveBeenCalledWith(
      "raw",
      "bad_sig",
      "whsec_test",
    );
  });

  it("parses a checkout.session.completed event with customer", () => {
    const rawBody = JSON.stringify({
      id: "evt_1",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_1",
          customer: "cus_123",
          client_reference_id: "user_abc",
        },
      },
    });

    const event = provider.parseEvent(rawBody);

    expect(event.id).toBe("evt_1");
    expect(event.type).toBe("checkout.session.completed");
    expect(event.customerId).toBe("cus_123");
    expect(event.data.id).toBe("cs_1");
    expect(event.provider).toBe("stripe");
  });

  it("parses an event with customer_id instead of customer", () => {
    const rawBody = JSON.stringify({
      id: "evt_2",
      type: "invoice.paid",
      data: {
        object: {
          id: "in_1",
          customer_id: "cus_456",
        },
      },
    });

    const event = provider.parseEvent(rawBody);

    expect(event.id).toBe("evt_2");
    expect(event.customerId).toBe("cus_456");
  });

  it("parses an event with no customer information", () => {
    const rawBody = JSON.stringify({
      id: "evt_3",
      type: "charge.refunded",
      data: {
        object: {
          id: "ch_1",
        },
      },
    });

    const event = provider.parseEvent(rawBody);

    expect(event.id).toBe("evt_3");
    expect(event.customerId).toBeNull();
  });
});
