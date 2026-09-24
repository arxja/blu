// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/workspaces/[tenantId]/billing/status/route";

import { getCurrentUser } from "@/lib/auth/server";
import { authorizeTenantAccess } from "@/lib/tenancy/tenant-access";

vi.mock("@/lib/auth/server", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/tenancy/tenant-access", () => ({
  authorizeTenantAccess: vi.fn(),
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

describe("GET /api/workspaces/[tenantId]/billing/status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null as never);

    const response = await GET(
      new Request(
        `http://app.blu.test:3000/api/workspaces/${TENANT_ID}/billing/status`,
      ),
      createContext(),
    );

    expect(response.status).toBe(401);
    expect(authorizeTenantAccess).not.toHaveBeenCalled();
  });

  it("returns the tenant billing state for an authorized member", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: USER_ID,
    } as never);

    vi.mocked(authorizeTenantAccess).mockResolvedValue({
      tenant: {
        plan: "pro",
        status: "pending_payment",
        subdomain: "acme",
      },
      membership: {
        role: "owner",
      },
    } as never);

    const response = await GET(
      new Request(
        `http://app.blu.test:3000/api/workspaces/${TENANT_ID}/billing/status`,
      ),
      createContext(),
    );

    const body = await response.json();

    expect(response.status).toBe(200);

    expect(body).toEqual({
      status: "pending_payment",
      plan: "pro",
      subdomain: "acme",
    });

    expect(authorizeTenantAccess).toHaveBeenCalledWith(USER_ID, TENANT_ID);
  });

  it("returns active when Stripe synchronization has activated the tenant", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: USER_ID,
    } as never);

    vi.mocked(authorizeTenantAccess).mockResolvedValue({
      tenant: {
        plan: "pro",
        status: "active",
        subdomain: "acme",
      },
      membership: {
        role: "owner",
      },
    } as never);

    const response = await GET(
      new Request(
        `http://app.blu.test:3000/api/workspaces/${TENANT_ID}/billing/status`,
      ),
      createContext(),
    );

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("active");
  });

  it("does not expose Stripe identifiers", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: USER_ID,
    } as never);

    vi.mocked(authorizeTenantAccess).mockResolvedValue({
      tenant: {
        plan: "pro",
        status: "active",
        subdomain: "acme",
        stripeCustomerId: "cus_secret",
        stripeSubscriptionId: "sub_secret",
      },
      membership: {
        role: "owner",
      },
    } as never);

    const response = await GET(
      new Request(
        `http://app.blu.test:3000/api/workspaces/${TENANT_ID}/billing/status`,
      ),
      createContext(),
    );

    const body = await response.json();

    expect(body).not.toHaveProperty("stripeCustomerId");
    expect(body).not.toHaveProperty("stripeSubscriptionId");
  });

  it("passes authorization errors through", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: USER_ID,
    } as never);

    const error = new Error("Forbidden");
    Object.assign(error, {
      errorCode: "FORBIDDEN",
      statusCode: 403,
    });

    vi.mocked(authorizeTenantAccess).mockRejectedValue(error);

    const response = await GET(
      new Request(
        `http://app.blu.test:3000/api/workspaces/${TENANT_ID}/billing/status`,
      ),
      createContext(),
    );

    expect(response.status).toBe(403);
  });
});
