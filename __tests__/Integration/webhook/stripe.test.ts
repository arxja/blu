import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/config", () => ({
  serverConfig: {
    NODE_ENV: "test",
    DATABASE_URL: "postgresql://test:test@localhost:5432/test",
    JWT_SECRET: "test-secret",
    STRIPE_SECRET_KEY: "sk_test_123",
    STRIPE_PRO_MONTHLY_PRICE_ID: "price_pro_test",
    STRIPE_ENTERPRISE_MONTHLY_PRICE_ID: "price_enterprise_test",
    APP_URL: "http://localhost:3000",
    LOG_LEVEL: "debug",
    STRIPE_WEBHOOK_SECRET: "whsec_test",
  },
  getServerConfig: () => ({
    NODE_ENV: "test",
    DATABASE_URL: "postgresql://test:test@localhost:5432/test",
    JWT_SECRET: "test-secret",
    STRIPE_SECRET_KEY: "sk_test_123",
    STRIPE_PRO_MONTHLY_PRICE_ID: "price_pro_test",
    STRIPE_ENTERPRISE_MONTHLY_PRICE_ID: "price_enterprise_test",
    APP_URL: "http://localhost:3000",
    LOG_LEVEL: "debug",
    STRIPE_WEBHOOK_SECRET: "whsec_test",
  }),
}));


// Mock logger with all possible exports
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
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
  default: {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

// Import the modules you want to mock
import { getPaymentProvider } from "@/lib/payment-provider";
import { queue } from "@/lib/queue/in-memory";
import { handleWebhookEvent } from "@/services/tenant-billing.service";

// Mock the modules using the SAME path you import from
vi.mock("@/lib/payment-provider");
vi.mock("@/lib/queue/in-memory"); // Fixed: matches the import path
vi.mock("@/services/tenant-billing.service");

import { POST } from "@/app/api/webhooks/stripe/route";

// Helper to create a mock Request
function mockRequest(body: string, headers: Record<string, string>) {
  return {
    text: () => Promise.resolve(body),
    headers: {
      get: (name: string) => headers[name.toLowerCase()] || null,
    },
  } as any;
}

describe("Stripe webhook route", () => {
  const validBody = JSON.stringify({ id: "evt_1", type: "test" });
  const validSignature = "t=123,v1=abc";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 if stripe-signature header missing", async () => {
    const req = mockRequest(validBody, {});
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Missing signature");
  });

  it("returns 401 if signature verification fails", async () => {
    const mockProvider = {
      verifySignature: () => false,
      parseEvent: () => ({
        id: "evt_1",
        type: "test",
        data: {},
        customerId: null,
        provider: "stripe",
      }),
    };
    vi.mocked(getPaymentProvider).mockReturnValue(mockProvider);

    const req = mockRequest(validBody, { "stripe-signature": "bad" });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 202 and enqueues job for valid signature", async () => {
    const mockEvent = {
      id: "evt_1",
      type: "test",
      data: {},
      customerId: null,
      provider: "stripe" as const,
    };

    const mockProvider = {
      verifySignature: () => true,
      parseEvent: () => mockEvent,
    };
    vi.mocked(getPaymentProvider).mockReturnValue(mockProvider);

    const req = mockRequest(validBody, { "stripe-signature": validSignature });
    const res = await POST(req);

    expect(res.status).toBe(202);
    const json = await res.json();
    expect(json.received).toBe(true);

    expect(vi.mocked(queue.enqueue)).toHaveBeenCalledTimes(1);

    // The enqueue callback should call handleWebhookEvent
    const enqueueArgs = vi.mocked(queue.enqueue).mock.calls[0];
    expect(enqueueArgs[0].id).toBe("evt_1");

    // Execute the handler callback to verify it calls business logic
    await enqueueArgs[1](enqueueArgs[0]);
    expect(handleWebhookEvent).toHaveBeenCalledWith(enqueueArgs[0].event);
  });

  it("returns 500 if enqueue fails", async () => {
    const mockEvent = {
      id: "evt_1",
      type: "test",
      data: {},
      customerId: null,
      provider: "stripe" as const,
    };

    const mockProvider = {
      verifySignature: () => true,
      parseEvent: () => mockEvent,
    };
    vi.mocked(getPaymentProvider).mockReturnValue(mockProvider);

    // Use vi.mocked() to get the mock type
    vi.mocked(queue.enqueue).mockRejectedValue(new Error("Queue full"));

    const req = mockRequest(validBody, { "stripe-signature": validSignature });
    const res = await POST(req);

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBeDefined();
  });
});
