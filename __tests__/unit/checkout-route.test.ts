// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/workspaces/[tenantId]/billing/checkout/route";

import { getCurrentUser } from "@/lib/auth/server";
import { createTenantCheckoutSession } from "@/services/tenant-billing.service";

vi.mock("@/lib/auth/server", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/services/tenant-billing.service", () => ({
  createTenantCheckoutSession: vi.fn(),
}));

const USER_ID = "507f1f77bcf86cd799439011";
const TENANT_ID = "507f1f77bcf86cd799439012";

function createContext(tenantId = TENANT_ID) {
  return {
    params: Promise.resolve({
      tenantId,
    }),
  };
}

describe("POST /api/workspaces/[tenantId]/billing/checkout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a Checkout Session and returns its URL", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: USER_ID,
    } as never);

    vi.mocked(createTenantCheckoutSession).mockResolvedValue({
      id: "cs_test_123",
      url: "https://checkout.stripe.com/cs_test_123",
    });

    const response = await POST(
      new Request(
        "http://app.blu.test:3000/api/workspaces/507f1f77bcf86cd799439012/billing/checkout",
        {
          method: "POST",
        },
      ),
      createContext(),
    );

    const body = await response.json();

    expect(response.status).toBe(200);

    expect(body).toEqual({
      url: "https://checkout.stripe.com/cs_test_123",
    });

    expect(createTenantCheckoutSession).toHaveBeenCalledOnce();

    const call = vi.mocked(createTenantCheckoutSession).mock.calls[0][0];

    expect(call.userId).toBe(USER_ID);
    expect(call.tenantId).toBe(TENANT_ID);

    expect(call.successUrl).toContain("/billing/checkout/success");

    expect(call.successUrl).toContain("tenantId=507f1f77bcf86cd799439012");

    expect(call.successUrl).toContain("session_id=%7BCHECKOUT_SESSION_ID%7D");

    expect(call.cancelUrl).toContain("/billing/checkout/cancel");

    expect(call.cancelUrl).toContain("tenantId=507f1f77bcf86cd799439012");
  });

  it("does not accept client-provided checkout URLs", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: USER_ID,
    } as never);

    vi.mocked(createTenantCheckoutSession).mockResolvedValue({
      id: "cs_test_123",
      url: "https://checkout.stripe.com/cs_test_123",
    });

    const request = new Request(
      "http://app.blu.test:3000/api/workspaces/507f1f77bcf86cd799439012/billing/checkout",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          successUrl: "https://evil.example.com",
          cancelUrl: "https://evil.example.com",
        }),
      },
    );

    const response = await POST(request, createContext());

    expect(response.status).toBe(200);

    const call = vi.mocked(createTenantCheckoutSession).mock.calls[0][0];

    expect(call.successUrl).not.toContain("evil.example.com");
    expect(call.cancelUrl).not.toContain("evil.example.com");
  });

  it("propagates AppError responses", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: USER_ID,
    } as never);

    const error = new (class extends Error {
      errorCode = "FORBIDDEN";
      statusCode = 403;
    })("You do not have permission.");

    vi.mocked(createTenantCheckoutSession).mockRejectedValue(error);

    const response = await POST(
      new Request(
        "http://app.blu.test:3000/api/workspaces/507f1f77bcf86cd799439012/billing/checkout",
        {
          method: "POST",
        },
      ),
      createContext(),
    );

    const body = await response.json();

    expect(response.status).toBe(403);

    expect(body).toEqual({
      error: "You do not have permission.",
      code: "FORBIDDEN",
    });
  });

  it("returns 500 when an unexpected error occurs", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: USER_ID,
    } as never);

    vi.mocked(createTenantCheckoutSession).mockRejectedValue(
      new Error("Stripe unavailable"),
    );

    const response = await POST(
      new Request(
        "http://app.blu.test:3000/api/workspaces/507f1f77bcf86cd799439012/billing/checkout",
        {
          method: "POST",
        },
      ),
      createContext(),
    );

    const body = await response.json();

    expect(response.status).toBe(500);

    expect(body).toEqual({
      error: "Unable to start checkout.",
      code: "INTERNAL_ERROR",
    });
  });
});
