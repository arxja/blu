// @vitest-environment node

import mongoose from "mongoose";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createTenantCheckoutSession } from "@/services/tenant-billing.service";

import { authorizeTenantAccess } from "@/lib/tenancy/tenant-access";
import { requireMinimumRole } from "@/lib/tenancy/authorization";
import { getPaymentProvider } from "@/lib/payment-provider";
import { getPlanById } from "@/lib/constants";

vi.mock("@/lib/tenancy/tenant-access", () => ({
  authorizeTenantAccess: vi.fn(),
}));

vi.mock("@/lib/tenancy/authorization", () => ({
  requireMinimumRole: vi.fn(),
}));

vi.mock("@/lib/payment-provider", () => ({
  getPaymentProvider: vi.fn(),
}));

vi.mock("@/lib/constants/pricing.constants", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/constants/pricing.constants")>();
  return {
    ...actual,
    getPlanById: vi.fn(),
  };
});

describe("createTenantCheckoutSession", () => {
  const userId = new mongoose.Types.ObjectId().toString();
  const tenantId = new mongoose.Types.ObjectId().toString();

  const createCheckoutSession = vi.fn();

  const tenant = {
    _id: new mongoose.Types.ObjectId(tenantId),
    plan: "pro",
    status: "pending_payment",
    billingEmail: "billing@acme.com",
    stripeCustomerId: undefined,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(authorizeTenantAccess).mockResolvedValue({
      tenant,
      membership: {
        role: "owner",
      },
    } as never);

    vi.mocked(requireMinimumRole).mockReturnValue(undefined);

    vi.mocked(getPlanById).mockReturnValue({
      id: "pro",
      stripePriceId: "price_pro_123",
    } as never);

    vi.mocked(getPaymentProvider).mockReturnValue({
      createCheckoutSession,
    } as never);

    createCheckoutSession.mockResolvedValue({
      id: "cs_test_123",
      url: "https://checkout.stripe.com/cs_test_123",
    });
  });

  it("creates a checkout session for a pending Pro tenant", async () => {
    const result = await createTenantCheckoutSession({
      userId,
      tenantId,
      successUrl: "https://acme.blu.test/billing/success",
      cancelUrl: "https://acme.blu.test/billing/cancel",
    });

    expect(result).toEqual({
      id: "cs_test_123",
      url: "https://checkout.stripe.com/cs_test_123",
    });

    expect(authorizeTenantAccess).toHaveBeenCalledWith(userId, tenantId);

    expect(requireMinimumRole).toHaveBeenCalledWith("owner", "admin");

    expect(createCheckoutSession).toHaveBeenCalledWith({
      tenantId,
      planId: "pro",
      priceId: "price_pro_123",
      customerEmail: "billing@acme.com",
      stripeCustomerId: undefined,
      successUrl: "https://acme.blu.test/billing/success",
      cancelUrl: "https://acme.blu.test/billing/cancel",
    });
  });

  it("allows an admin to start checkout", async () => {
    vi.mocked(authorizeTenantAccess).mockResolvedValue({
      tenant,
      membership: {
        role: "admin",
      },
    } as never);

    await createTenantCheckoutSession({
      userId,
      tenantId,
      successUrl: "https://acme.blu.test/billing/success",
      cancelUrl: "https://acme.blu.test/billing/cancel",
    });

    expect(requireMinimumRole).toHaveBeenCalledWith("admin", "admin");

    expect(createCheckoutSession).toHaveBeenCalledOnce();
  });

  it("rejects a free tenant", async () => {
    vi.mocked(authorizeTenantAccess).mockResolvedValue({
      tenant: {
        ...tenant,
        plan: "free",
      },
      membership: {
        role: "owner",
      },
    } as never);

    await expect(
      createTenantCheckoutSession({
        userId,
        tenantId,
        successUrl: "https://acme.blu.test/billing/success",
        cancelUrl: "https://acme.blu.test/billing/cancel",
      }),
    ).rejects.toThrow("Free workspaces do not require payment.");

    expect(createCheckoutSession).not.toHaveBeenCalled();
  });

  it("rejects Enterprise from self-service checkout", async () => {
    vi.mocked(authorizeTenantAccess).mockResolvedValue({
      tenant: {
        ...tenant,
        plan: "enterprise",
      },
      membership: {
        role: "owner",
      },
    } as never);

    await expect(
      createTenantCheckoutSession({
        userId,
        tenantId,
        successUrl: "https://acme.blu.test/billing/success",
        cancelUrl: "https://acme.blu.test/billing/cancel",
      }),
    ).rejects.toThrow("Enterprise workspaces require contacting sales.");

    expect(createCheckoutSession).not.toHaveBeenCalled();
  });

  it("rejects a Pro tenant that is not awaiting payment", async () => {
    vi.mocked(authorizeTenantAccess).mockResolvedValue({
      tenant: {
        ...tenant,
        status: "active",
      },
      membership: {
        role: "owner",
      },
    } as never);

    await expect(
      createTenantCheckoutSession({
        userId,
        tenantId,
        successUrl: "https://acme.blu.test/billing/success",
        cancelUrl: "https://acme.blu.test/billing/cancel",
      }),
    ).rejects.toThrow("This workspace is not awaiting initial payment.");

    expect(createCheckoutSession).not.toHaveBeenCalled();
  });

  it("passes an existing Stripe customer to Checkout", async () => {
    vi.mocked(authorizeTenantAccess).mockResolvedValue({
      tenant: {
        ...tenant,
        stripeCustomerId: "cus_existing_123",
      },
      membership: {
        role: "owner",
      },
    } as never);

    await createTenantCheckoutSession({
      userId,
      tenantId,
      successUrl: "https://acme.blu.test/billing/success",
      cancelUrl: "https://acme.blu.test/billing/cancel",
    });

    expect(createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        stripeCustomerId: "cus_existing_123",
      }),
    );
  });

  it("rejects invalid user IDs", async () => {
    await expect(
      createTenantCheckoutSession({
        userId: "invalid",
        tenantId,
        successUrl: "https://acme.blu.test/billing/success",
        cancelUrl: "https://acme.blu.test/billing/cancel",
      }),
    ).rejects.toThrow("Invalid user id.");

    expect(authorizeTenantAccess).not.toHaveBeenCalled();
    expect(createCheckoutSession).not.toHaveBeenCalled();
  });

  it("rejects invalid tenant IDs", async () => {
    await expect(
      createTenantCheckoutSession({
        userId,
        tenantId: "invalid",
        successUrl: "https://acme.blu.test/billing/success",
        cancelUrl: "https://acme.blu.test/billing/cancel",
      }),
    ).rejects.toThrow("Invalid tenant id.");

    expect(authorizeTenantAccess).not.toHaveBeenCalled();
    expect(createCheckoutSession).not.toHaveBeenCalled();
  });

  it("propagates Stripe errors without changing tenant state", async () => {
    createCheckoutSession.mockRejectedValue(new Error("Stripe unavailable"));

    await expect(
      createTenantCheckoutSession({
        userId,
        tenantId,
        successUrl: "https://acme.blu.test/billing/success",
        cancelUrl: "https://acme.blu.test/billing/cancel",
      }),
    ).rejects.toThrow("Stripe unavailable");
  });
});
