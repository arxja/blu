// @vitest-environment node

import { describe, it, expect, vi, beforeEach } from "vitest";

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

import { handleWebhookEvent } from "@/services/tenant-billing.service";
import { idempotencyStore } from "@/lib/idempotency/mongo-idempotency-store";
import Tenant from "@/lib/database/models/tenant.model";
import { PLANS } from "@/lib/constants";
import { WebhookEvent } from "@/types/types";

vi.mock("@/lib/idempotency/mongo-idempotency-store");
vi.mock("@/lib/database/models/tenant.model");

describe("handleWebhookEvent", () => {
  let mockTenant: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Stub environment variables
    vi.stubEnv("STRIPE_PRO_MONTHLY_PRICE_ID", "price_pro_monthly");
    vi.stubEnv(
      "STRIPE_ENTERPRISE_MONTHLY_PRICE_ID",
      "price_enterprise_monthly",
    );

    // Create fresh mock tenant for each test
    mockTenant = {
      _id: "tenant1",
      plan: "free",
      status: "trialing",
      quotas: {
        monthlyEvents: 0,
        retentionDays: 30,
        apiRateLimit: 100,
        seats: 1,
      },
      save: vi.fn().mockResolvedValue(undefined),
      stripeCustomerId: null,
    };

    vi.mocked(idempotencyStore.isProcessed).mockResolvedValue(false);
    vi.mocked(Tenant.findOne).mockResolvedValue(mockTenant);
  });

  const buildEvent = (overrides: Partial<WebhookEvent> = {}): WebhookEvent => ({
    id: "evt_test",
    type: "checkout.session.completed",
    data: {
      customer: "cus_123",
      client_reference_id: "user_1",
      metadata: { price_id: process.env.STRIPE_PRO_MONTHLY_PRICE_ID },
    },
    customerId: "cus_123",
    provider: "stripe",
    ...overrides,
  });

  it("upgrades tenant to pro on checkout.session.completed", async () => {
    await handleWebhookEvent(buildEvent());

    expect(mockTenant.plan).toBe("pro");
    expect(mockTenant.status).toBe("active");
    expect(mockTenant.stripeCustomerId).toBe("cus_123");
    expect(mockTenant.quotas.monthlyEvents).toBe(
      PLANS.find((p) => p.id === "pro")!.limits.monthlyEvents,
    );
    expect(mockTenant.save).toHaveBeenCalled();
    expect(idempotencyStore.markProcessed).toHaveBeenCalledWith("evt_test");
  });

  it("downgrades to free on subscription deleted", async () => {
    const event = buildEvent({
      type: "customer.subscription.deleted",
      data: {
        customer: "cus_123",
      },
    });

    await handleWebhookEvent(event);

    expect(mockTenant.plan).toBe("free");
    expect(mockTenant.status).toBe("suspended");
    expect(mockTenant.quotas.monthlyEvents).toBe(
      PLANS.find((p) => p.id === "free")!.limits.monthlyEvents,
    );
  });

  it("upgrades to enterprise when enterprise price matches", async () => {
    vi.stubEnv("STRIPE_PRO_MONTHLY_PRICE_ID", "price_pro_monthly");

    const event = buildEvent({
      data: {
        customer: "cus_123",
        client_reference_id: "user_1",
        metadata: { price_id: process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID },
      },
    });

    await handleWebhookEvent(event);

    expect(mockTenant.plan).toBe("enterprise");
    expect(mockTenant.status).toBe("active");
  });

  it("skips processing if idempotency key already exists", async () => {
    vi.mocked(idempotencyStore.isProcessed).mockResolvedValue(true);

    await handleWebhookEvent(buildEvent());

    expect(Tenant.findOne).not.toHaveBeenCalled();
    expect(idempotencyStore.markProcessed).not.toHaveBeenCalled();
  });

  it("throws error when checkout session has no customer", async () => {
    const event = buildEvent({
      data: {
        customer: null,
        client_reference_id: "user_1",
        metadata: { price_id: process.env.STRIPE_PRO_MONTHLY_PRICE_ID },
      },
      customerId: null,
    });

    await expect(handleWebhookEvent(event)).rejects.toThrow(
      "Missing customer ID in checkout.session.completed",
    );
  });

  it("does not update tenant when customer not found", async () => {
    vi.mocked(Tenant.findOne).mockResolvedValue(null);

    const event = buildEvent();
    await handleWebhookEvent(event);

    // Tenant should not be modified since it wasn't found
    expect(mockTenant.plan).toBe("free");
    expect(mockTenant.save).not.toHaveBeenCalled();
  });
});
