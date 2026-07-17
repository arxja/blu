// @vitest-environment node

import { describe, it, expect, vi, beforeEach } from "vitest";

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

vi.mock("@/lib/email", () => ({
  getEmailService: vi.fn(),
}));

vi.mock("@/lib/config", () => ({
  serverConfig: {
    STRIPE_PRO_MONTHLY_PRICE_ID: "price_pro_monthly",
    STRIPE_ENTERPRISE_MONTHLY_PRICE_ID: "price_enterprise_monthly",
  },
}));

vi.mock("@/lib/constants", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/constants")>();
  return {
    ...actual,
    getPlanById: (id: string) => actual.PLANS.find((p) => p.id === id),
  };
});

import { handleWebhookEvent } from "@/services/tenant-billing.service";
import { idempotencyStore } from "@/lib/idempotency/mongo-idempotency-store";
import Tenant from "@/lib/database/models/tenant.model";
import { PLANS } from "@/lib/constants";
import { WebhookEvent } from "@/types/types";
import { getEmailService } from "@/lib/email";
import type { EmailService } from "@/types/types";

vi.mock("@/lib/idempotency/mongo-idempotency-store");
vi.mock("@/lib/database/models/tenant.model");

describe("handleWebhookEvent", () => {
  let mockTenant: any;
  let emailServiceMock: EmailService;

  beforeEach(() => {
    vi.clearAllMocks();

    vi.stubEnv("STRIPE_PRO_MONTHLY_PRICE_ID", "price_pro_monthly");
    vi.stubEnv(
      "STRIPE_ENTERPRISE_MONTHLY_PRICE_ID",
      "price_enterprise_monthly",
    );

    emailServiceMock = {
      sendPaymentSuccess: vi.fn(),
      sendPaymentFailed: vi.fn(),
      sendTrialEnding: vi.fn(),
    } as EmailService;

    vi.mocked(getEmailService).mockReturnValue(emailServiceMock);

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
      billingEmail: "test@example.com",
      companyName: "Test Corp",
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
      data: { customer: "cus_123" },
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
    await expect(handleWebhookEvent(event)).rejects.toThrow(
      "Tenant not found for checkout session",
    );
    expect(mockTenant.plan).toBe("free");
    expect(mockTenant.save).not.toHaveBeenCalled();
    expect(idempotencyStore.markProcessed).not.toHaveBeenCalled();
  });

  it("updates plan and quotas on subscription updated with new price", async () => {
    const event = buildEvent({
      type: "customer.subscription.updated",
      data: {
        id: "sub_1",
        customer: "cus_123",
        status: "active",
        items: {
          data: [
            {
              price: {
                id: process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID,
              },
            },
          ],
        },
      },
    });
    await handleWebhookEvent(event);
    expect(mockTenant.plan).toBe("enterprise");
    expect(mockTenant.quotas.monthlyEvents).toBe(
      PLANS.find((p) => p.id === "enterprise")!.limits.monthlyEvents,
    );
  });

  it("sets status to past_due on invoice.payment_failed", async () => {
    const event = buildEvent({ type: "invoice.payment_failed" });
    await handleWebhookEvent(event);
    expect(mockTenant.status).toBe("past_due");
    expect(emailServiceMock.sendPaymentFailed).toHaveBeenCalledWith(
      mockTenant.billingEmail,
      mockTenant.companyName,
    );
  });

  it("sets status back to active on invoice.payment_succeeded", async () => {
    mockTenant.status = "past_due";
    const event = buildEvent({
      type: "invoice.payment_succeeded",
      data: { amount_paid: 4900 },
    });
    await handleWebhookEvent(event);
    expect(mockTenant.status).toBe("active");
    expect(emailServiceMock.sendPaymentSuccess).toHaveBeenCalledWith(
      mockTenant.billingEmail,
      mockTenant.companyName,
      49,
    );
  });

  it("sends trial ending email", async () => {
    const event = buildEvent({
      type: "customer.subscription.trial_will_end",
      data: { trial_end: Math.floor(Date.now() / 1000) + 3 * 86400 },
    });
    await handleWebhookEvent(event);
    expect(emailServiceMock.sendTrialEnding).toHaveBeenCalledWith(
      mockTenant.billingEmail,
      mockTenant.companyName,
      expect.any(Date),
    );
  });

  it("handles subscription updated with missing tenant", async () => {
    vi.mocked(Tenant.findOne).mockResolvedValue(null);
    const event = buildEvent({ type: "customer.subscription.updated" });
    // Should not throw, just log and return
    await expect(handleWebhookEvent(event)).resolves.not.toThrow();
    expect(mockTenant.save).not.toHaveBeenCalled();
  });

  it("handles invoice payment failed with missing tenant", async () => {
    vi.mocked(Tenant.findOne).mockResolvedValue(null);
    const event = buildEvent({ type: "invoice.payment_failed" });
    await handleWebhookEvent(event);
    expect(mockTenant.save).not.toHaveBeenCalled();
  });

  it("handles subscription deleted with missing customer ID", async () => {
    const event = buildEvent({
      type: "customer.subscription.deleted",
      customerId: undefined,
      data: { customer: undefined },
    });
    await handleWebhookEvent(event);
    expect(Tenant.findOne).not.toHaveBeenCalled();
  });
});
