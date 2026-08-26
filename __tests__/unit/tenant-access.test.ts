// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const findTenantById = vi.fn();
const findMembership = vi.fn();

vi.mock("@/lib/database/mongoose", () => ({
  connectDB: vi.fn(),
}));

vi.mock("@/lib/database/models/tenant.model", () => ({
  default: {
    findById: (...args: unknown[]) => ({
      exec: () => findTenantById(...args),
    }),
  },
}));

vi.mock("@/lib/database/models/membership.model", () => ({
  default: {
    findOne: (...args: unknown[]) => ({
      exec: () => findMembership(...args),
    }),
  },
}));

import { authorizeTenantAccess } from "@/lib/tenancy/tenant-access";

describe("authorizeTenantAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows an active tenant member", async () => {
    const tenant = {
      _id: "507f1f77bcf86cd799439011",
      status: "active",
      subdomain: "demo",
    };

    const membership = {
      userId: "507f1f77bcf86cd799439012",
      tenantId: tenant._id,
      role: "owner",
      isActive: true,
    };

    findTenantById.mockResolvedValue(tenant);
    findMembership.mockResolvedValue(membership);

    const result = await authorizeTenantAccess(
      "507f1f77bcf86cd799439012",
      "507f1f77bcf86cd799439011",
    );

    expect(result.tenant).toBe(tenant);
    expect(result.membership).toBe(membership);

    expect(findMembership).toHaveBeenCalledWith({
      userId: "507f1f77bcf86cd799439012",
      tenantId: tenant._id,
      isActive: true,
    });
  });

  it("rejects a non-member", async () => {
    findTenantById.mockResolvedValue({
      _id: "507f1f77bcf86cd799439011",
      status: "active",
      subdomain: "demo",
    });

    findMembership.mockResolvedValue(null);

    await expect(
      authorizeTenantAccess(
        "507f1f77bcf86cd799439012",
        "507f1f77bcf86cd799439011",
      ),
    ).rejects.toMatchObject({
      errorCode: "FORBIDDEN",
      statusCode: 403,
    });
  });

  it("rejects an inactive tenant", async () => {
    findTenantById.mockResolvedValue({
      _id: "507f1f77bcf86cd799439011",
      status: "suspended",
      subdomain: "demo",
    });

    await expect(
      authorizeTenantAccess(
        "507f1f77bcf86cd799439012",
        "507f1f77bcf86cd799439011",
      ),
    ).rejects.toMatchObject({
      errorCode: "FORBIDDEN",
      statusCode: 403,
    });

    expect(findMembership).not.toHaveBeenCalled();
  });

  it("rejects an invalid tenant id", async () => {
    await expect(
      authorizeTenantAccess("507f1f77bcf86cd799439012", "not-an-object-id"),
    ).rejects.toMatchObject({
      errorCode: "BAD_REQUEST",
      statusCode: 400,
    });

    expect(findTenantById).not.toHaveBeenCalled();
  });
});
