// @vitest-environment node

import mongoose from "mongoose";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  tenantFindOne: vi.fn(),
  tenantSave: vi.fn(),

  isProcessed: vi.fn(),
  markProcessed: vi.fn(),

  sendPaymentSuccess: vi.fn(),
  sendPaymentFailed: vi.fn(),
  sendTrialEnding: vi.fn(),

  logInfo: vi.fn(),
  logWarn: vi.fn(),
  logError: vi.fn(),
}));

vi.mock("@/lib/database/models/tenant.model", () => ({
  TenantModel: {
    findOne: mocks.tenantFindOne,
  },
}));

vi.mock("@/lib/idempotency/mongo-idempotency-store", () => ({
  idempotencyStore: {
    isProcessed: mocks.isProcessed,
    markProcessed: mocks.markProcessed,
  },
}));

vi.mock("@/lib/email", () => ({
  getEmailService: () => ({
    sendPaymentSuccess: mocks.sendPaymentSuccess,
    sendPaymentFailed: mocks.sendPaymentFailed,
    sendTrialEnding: mocks.sendTrialEnding,
  }),
}));

vi.mock("@/lib/logger", () => ({
  log: {
    info: mocks.logInfo,
    warn: mocks.logWarn,
    error: mocks.logError,
  },
}));

vi.mock("@/lib/constants", () => {
  const plans = [
    {
      id: "free",
      name: "Free",
      stripePriceId: null,
      limits: {
        monthlyEvents: 100_000,
        dataRetentionDays: 30,
        ingestionEventsPerSec: 50,
        seats: 1,
      },
    },
    {
      id: "pro",
      name: "Pro",
      stripePriceId: "price_pro_test",
      limits: {
        monthlyEvents: 1_000_000,
        dataRetentionDays: 180,
        ingestionEventsPerSec: 500,
        seats: 10,
      },
    },
    {
      id: "enterprise",
      name: "Enterprise",
      stripePriceId: "price_enterprise_test",
      limits: {
        monthlyEvents: 10_000_000,
        dataRetentionDays: 730,
        ingestionEventsPerSec: 5_000,
        seats: -1,
      },
    },
  ];

  return {
    PLANS: plans,
    getPlanById: (id: string) => {
      const plan = plans.find((item) => item.id === id);

      if (!plan) {
        throw new Error(`Unknown plan id: ${id}`);
      }

      return plan;
    },
  };
});

import { handleWebhookEvent } from "@/services/tenant-billing.service";

type FakeTenant = {
  _id: mongoose.Types.ObjectId;
  plan: "free" | "pro" | "enterprise";
  status: "active" | "pending_payment" | "trialing" | "past_due" | "suspended";
  billingEmail: string;
  companyName: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  trialEndsAt?: Date;
  quotas?: Record<string, unknown>;
  save: ReturnType<typeof vi.fn>;
};

function createTenant(overrides: Partial<FakeTenant> = {}): FakeTenant {
  const tenant: FakeTenant = {
    _id: new mongoose.Types.ObjectId(),
    plan: "pro",
    status: "pending_payment",
    billingEmail: "billing@acme.com",
    companyName: "Acme",
    stripeCustomerId: undefined,
    stripeSubscriptionId: undefined,
    trialEndsAt: undefined,
    quotas: {
      customOverride: true,
    },
    save: mocks.tenantSave,
    ...overrides,
  };

  return tenant;
}

function createWebhookEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: `evt_${new mongoose.Types.ObjectId().toString()}`,
    type: "checkout.session.completed",
    customerId: "cus_test_123",
    provider: "stripe",
    data: {},
    ...overrides,
  };
}

const tenantId = new mongoose.Types.ObjectId().toString();

describe("tenant-billing.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.isProcessed.mockResolvedValue(false);
    mocks.markProcessed.mockResolvedValue(undefined);

    mocks.tenantSave.mockResolvedValue(undefined);

    mocks.sendPaymentSuccess.mockResolvedValue(undefined);
    mocks.sendPaymentFailed.mockResolvedValue(undefined);
    mocks.sendTrialEnding.mockResolvedValue(undefined);

    mocks.tenantFindOne.mockResolvedValue(null);
  });

  describe("idempotency", () => {
    it("skips an already processed event", async () => {
      mocks.isProcessed.mockResolvedValue(true);

      const event = createWebhookEvent();

      await handleWebhookEvent(event);

      expect(mocks.tenantFindOne).not.toHaveBeenCalled();
      expect(mocks.tenantSave).not.toHaveBeenCalled();
      expect(mocks.markProcessed).not.toHaveBeenCalled();
    });

    it("marks a successfully processed event", async () => {
      const tenant = createTenant();

      mocks.tenantFindOne.mockResolvedValue(tenant);

      const event = createWebhookEvent({
        data: {
          client_reference_id: tenantId,
          customer: "cus_test_123",
          subscription: "sub_test_123",
          payment_status: "paid",
          metadata: {
            tenantId,
            planId: "pro",
          },
        },
      });

      await handleWebhookEvent(event);

      expect(mocks.markProcessed).toHaveBeenCalledWith(event.id);
    });

    it("does not mark an event processed when handling fails", async () => {
      mocks.tenantFindOne.mockResolvedValue(null);

      const event = createWebhookEvent({
        data: {
          client_reference_id: tenantId,
          customer: "cus_test_123",
          subscription: "sub_test_123",
          payment_status: "paid",
          metadata: {
            tenantId,
            planId: "pro",
          },
        },
      });

      await expect(handleWebhookEvent(event)).rejects.toThrow();

      expect(mocks.markProcessed).not.toHaveBeenCalled();
    });
  });

  describe("checkout.session.completed", () => {
    it("synchronizes a paid Checkout Session with the Tenant", async () => {
      const tenant = createTenant();

      mocks.tenantFindOne.mockResolvedValue(tenant);

      await handleWebhookEvent(
        createWebhookEvent({
          data: {
            client_reference_id: tenantId,
            customer: "cus_test_123",
            subscription: "sub_test_123",
            payment_status: "paid",
            metadata: {
              tenantId,
              planId: "pro",
            },
          },
        }),
      );

      expect(tenant.stripeCustomerId).toBe("cus_test_123");

      expect(tenant.stripeSubscriptionId).toBe("sub_test_123");

      expect(tenant.status).toBe("active");

      expect(tenant.plan).toBe("pro");

      expect(mocks.tenantSave).toHaveBeenCalledOnce();
    });

    it("uses the Tenant ID instead of the owner's ID", async () => {
      const tenant = createTenant();

      mocks.tenantFindOne.mockResolvedValue(tenant);

      await handleWebhookEvent(
        createWebhookEvent({
          data: {
            client_reference_id: tenantId,
            customer: "cus_test_123",
            subscription: "sub_test_123",
            payment_status: "paid",
            metadata: {
              tenantId,
              planId: "pro",
            },
          },
        }),
      );

      expect(mocks.tenantFindOne).toHaveBeenCalledOnce();

      const [query] = mocks.tenantFindOne.mock.calls[0];

      expect(query.$or).toEqual(
        expect.arrayContaining([
          {
            _id: new mongoose.Types.ObjectId(tenantId),
          },
        ]),
      );
    });

    it("does not activate an unpaid Checkout Session", async () => {
      const tenant = createTenant({
        status: "pending_payment",
      });

      mocks.tenantFindOne.mockResolvedValue(tenant);

      await handleWebhookEvent(
        createWebhookEvent({
          data: {
            client_reference_id: tenantId,
            customer: "cus_test_123",
            subscription: "sub_test_123",
            payment_status: "unpaid",
            metadata: {
              tenantId,
              planId: "pro",
            },
          },
        }),
      );

      expect(tenant.status).toBe("pending_payment");

      expect(tenant.stripeCustomerId).toBe("cus_test_123");

      expect(tenant.stripeSubscriptionId).toBe("sub_test_123");
    });

    it("does not overwrite Tenant quota overrides", async () => {
      const tenant = createTenant({
        quotas: {
          customOverride: true,
        },
      });

      mocks.tenantFindOne.mockResolvedValue(tenant);

      await handleWebhookEvent(
        createWebhookEvent({
          data: {
            client_reference_id: tenantId,
            customer: "cus_test_123",
            subscription: "sub_test_123",
            payment_status: "paid",
            metadata: {
              tenantId,
              planId: "pro",
            },
          },
        }),
      );

      expect(tenant.quotas).toEqual({
        customOverride: true,
      });
    });
  });

  describe("checkout.session.async_payment_succeeded", () => {
    it("activates the Tenant after delayed payment succeeds", async () => {
      const tenant = createTenant();

      mocks.tenantFindOne.mockResolvedValue(tenant);

      await handleWebhookEvent(
        createWebhookEvent({
          type: "checkout.session.async_payment_succeeded",
          data: {
            client_reference_id: tenantId,
            customer: "cus_test_123",
            subscription: "sub_test_123",
            metadata: {
              tenantId,
              planId: "pro",
            },
          },
        }),
      );

      expect(tenant.status).toBe("active");

      expect(tenant.stripeCustomerId).toBe("cus_test_123");

      expect(tenant.stripeSubscriptionId).toBe("sub_test_123");
    });
  });

  describe("checkout.session.async_payment_failed", () => {
    it("keeps an initial payment failure pending", async () => {
      const tenant = createTenant({
        status: "pending_payment",
      });

      mocks.tenantFindOne.mockResolvedValue(tenant);

      await handleWebhookEvent(
        createWebhookEvent({
          type: "checkout.session.async_payment_failed",
          data: {
            client_reference_id: tenantId,
            customer: "cus_test_123",
            subscription: "sub_test_123",
            metadata: {
              tenantId,
              planId: "pro",
            },
          },
        }),
      );

      expect(tenant.status).toBe("pending_payment");

      expect(mocks.tenantSave).not.toHaveBeenCalled();
    });
  });

  describe("customer.subscription.updated", () => {
    it("activates a subscription when Stripe reports active", async () => {
      const tenant = createTenant({
        stripeSubscriptionId: "sub_test_123",
      });

      mocks.tenantFindOne.mockResolvedValue(tenant);

      await handleWebhookEvent(
        createWebhookEvent({
          type: "customer.subscription.updated",
          data: {
            id: "sub_test_123",
            customer: "cus_test_123",
            status: "active",
            metadata: {
              tenantId,
            },
            items: {
              data: [
                {
                  price: {
                    id: "price_pro_test",
                  },
                },
              ],
            },
          },
        }),
      );

      expect(tenant.status).toBe("active");
      expect(tenant.plan).toBe("pro");
      expect(tenant.stripeSubscriptionId).toBe("sub_test_123");
    });

    it("maps Stripe incomplete to pending_payment", async () => {
      const tenant = createTenant({
        status: "pending_payment",
        stripeSubscriptionId: "sub_test_123",
      });

      mocks.tenantFindOne.mockResolvedValue(tenant);

      await handleWebhookEvent(
        createWebhookEvent({
          type: "customer.subscription.updated",
          data: {
            id: "sub_test_123",
            customer: "cus_test_123",
            status: "incomplete",
            metadata: {
              tenantId,
            },
            items: {
              data: [
                {
                  price: {
                    id: "price_pro_test",
                  },
                },
              ],
            },
          },
        }),
      );

      expect(tenant.status).toBe("pending_payment");
    });

    it("maps Stripe past_due to past_due", async () => {
      const tenant = createTenant({
        status: "active",
        stripeSubscriptionId: "sub_test_123",
      });

      mocks.tenantFindOne.mockResolvedValue(tenant);

      await handleWebhookEvent(
        createWebhookEvent({
          type: "customer.subscription.updated",
          data: {
            id: "sub_test_123",
            customer: "cus_test_123",
            status: "past_due",
            metadata: {
              tenantId,
            },
            items: {
              data: [
                {
                  price: {
                    id: "price_pro_test",
                  },
                },
              ],
            },
          },
        }),
      );

      expect(tenant.status).toBe("past_due");
    });

    it("ignores events from an old subscription", async () => {
      const tenant = createTenant({
        status: "active",
        stripeSubscriptionId: "sub_current",
      });

      mocks.tenantFindOne.mockResolvedValue(tenant);

      await handleWebhookEvent(
        createWebhookEvent({
          type: "customer.subscription.updated",
          data: {
            id: "sub_old",
            customer: "cus_test_123",
            status: "past_due",
            metadata: {
              tenantId,
            },
            items: {
              data: [
                {
                  price: {
                    id: "price_pro_test",
                  },
                },
              ],
            },
          },
        }),
      );

      expect(tenant.status).toBe("active");

      expect(mocks.tenantSave).not.toHaveBeenCalled();
    });

    it("updates the Tenant plan from the actual Stripe Price", async () => {
      const tenant = createTenant({
        plan: "pro",
        stripeSubscriptionId: "sub_test_123",
      });

      mocks.tenantFindOne.mockResolvedValue(tenant);

      /*
       * Enterprise price demonstrates that the subscription's
       * actual Price, not Checkout input, controls the plan.
       */
      await handleWebhookEvent(
        createWebhookEvent({
          type: "customer.subscription.updated",
          data: {
            id: "sub_test_123",
            customer: "cus_test_123",
            status: "active",
            metadata: {
              tenantId,
            },
            items: {
              data: [
                {
                  price: {
                    id: "price_enterprise_test",
                  },
                },
              ],
            },
          },
        }),
      );

      expect(tenant.plan).toBe("enterprise");
    });
  });

  describe("invoice.paid", () => {
    it("activates the Tenant after a successful invoice", async () => {
      const tenant = createTenant({
        status: "pending_payment",
        stripeSubscriptionId: "sub_test_123",
      });

      mocks.tenantFindOne.mockResolvedValue(tenant);

      await handleWebhookEvent(
        createWebhookEvent({
          type: "invoice.paid",
          data: {
            customer: "cus_test_123",
            subscription: "sub_test_123",
            amount_paid: 4900,
          },
        }),
      );

      expect(tenant.status).toBe("active");

      expect(mocks.sendPaymentSuccess).toHaveBeenCalledWith(
        "billing@acme.com",
        "Acme",
        49,
      );
    });

    it("does not allow an old subscription invoice to reactivate the tenant", async () => {
      const tenant = createTenant({
        status: "past_due",
        stripeSubscriptionId: "sub_current",
      });

      mocks.tenantFindOne.mockResolvedValue(tenant);

      await handleWebhookEvent(
        createWebhookEvent({
          type: "invoice.paid",
          data: {
            customer: "cus_test_123",
            subscription: "sub_old",
            amount_paid: 4900,
          },
        }),
      );

      expect(tenant.status).toBe("past_due");
      expect(mocks.tenantSave).not.toHaveBeenCalled();
    });

    it("continues billing synchronization if the receipt email fails", async () => {
      const tenant = createTenant({
        status: "pending_payment",
        stripeSubscriptionId: "sub_test_123",
      });

      mocks.tenantFindOne.mockResolvedValue(tenant);

      mocks.sendPaymentSuccess.mockRejectedValue(new Error("SMTP unavailable"));

      await expect(
        handleWebhookEvent(
          createWebhookEvent({
            type: "invoice.paid",
            data: {
              customer: "cus_test_123",
              subscription: "sub_test_123",
              amount_paid: 4900,
            },
          }),
        ),
      ).resolves.toBeUndefined();

      expect(tenant.status).toBe("active");
      expect(mocks.tenantSave).toHaveBeenCalledOnce();
    });
  });

  describe("invoice.payment_failed", () => {
    it("moves an active tenant to past_due", async () => {
      const tenant = createTenant({
        status: "active",
        stripeSubscriptionId: "sub_test_123",
      });

      mocks.tenantFindOne.mockResolvedValue(tenant);

      await handleWebhookEvent(
        createWebhookEvent({
          type: "invoice.payment_failed",
          data: {
            customer: "cus_test_123",
            subscription: "sub_test_123",
          },
        }),
      );

      expect(tenant.status).toBe("past_due");

      expect(mocks.sendPaymentFailed).toHaveBeenCalledWith(
        "billing@acme.com",
        "Acme",
      );
    });

    it("does not convert an initial pending payment into past_due", async () => {
      const tenant = createTenant({
        status: "pending_payment",
        stripeSubscriptionId: "sub_test_123",
      });

      mocks.tenantFindOne.mockResolvedValue(tenant);

      await handleWebhookEvent(
        createWebhookEvent({
          type: "invoice.payment_failed",
          data: {
            customer: "cus_test_123",
            subscription: "sub_test_123",
          },
        }),
      );

      expect(tenant.status).toBe("pending_payment");

      expect(mocks.tenantSave).not.toHaveBeenCalled();
    });

    it("ignores a failed invoice from an old subscription", async () => {
      const tenant = createTenant({
        status: "active",
        stripeSubscriptionId: "sub_current",
      });

      mocks.tenantFindOne.mockResolvedValue(tenant);

      await handleWebhookEvent(
        createWebhookEvent({
          type: "invoice.payment_failed",
          data: {
            customer: "cus_test_123",
            subscription: "sub_old",
          },
        }),
      );

      expect(tenant.status).toBe("active");
      expect(mocks.tenantSave).not.toHaveBeenCalled();
    });
  });

  describe("customer.subscription.deleted", () => {
    it("suspends the tenant without silently downgrading it to free", async () => {
      const tenant = createTenant({
        plan: "pro",
        status: "active",
        stripeSubscriptionId: "sub_test_123",
      });

      mocks.tenantFindOne.mockResolvedValue(tenant);

      await handleWebhookEvent(
        createWebhookEvent({
          type: "customer.subscription.deleted",
          data: {
            id: "sub_test_123",
            customer: "cus_test_123",
            metadata: {
              tenantId,
            },
          },
        }),
      );

      expect(tenant.plan).toBe("pro");
      expect(tenant.status).toBe("suspended");
    });

    it("ignores deletion of an old subscription", async () => {
      const tenant = createTenant({
        plan: "pro",
        status: "active",
        stripeSubscriptionId: "sub_current",
      });

      mocks.tenantFindOne.mockResolvedValue(tenant);

      await handleWebhookEvent(
        createWebhookEvent({
          type: "customer.subscription.deleted",
          data: {
            id: "sub_old",
            customer: "cus_test_123",
            metadata: {
              tenantId,
            },
          },
        }),
      );

      expect(tenant.status).toBe("active");

      expect(mocks.tenantSave).not.toHaveBeenCalled();
    });
  });
});
