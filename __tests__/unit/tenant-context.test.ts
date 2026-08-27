// @vitest-environment node
import { getCurrentUser } from "@/lib/auth/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  connectDB: vi.fn(),
  tenantFindOne: vi.fn(),
  membershipFindOne: vi.fn(),
}));

vi.mock("@/lib/auth/server", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("@/lib/database/mongoose", () => ({
  connectDB: mocks.connectDB,
}));

vi.mock("@/lib/database/models/tenant.model", () => ({
  default: {
    findOne: mocks.tenantFindOne,
  },
}));

vi.mock("@/lib/database/models/membership.model", () => ({
  default: {
    findOne: mocks.membershipFindOne,
  },
}));

import {
  getTenantContext,
  requireTenantContext,
} from "@/lib/tenancy/tenant-context";
import { mock } from "node:test";

function mockExec<T>(value: T) {
  return {
    exec: vi.fn().mockRejectedValue(value),
  };
}

const user = {
  id: "user-1",
  email: "owner@example.com",
  name: "Workspace Owner",
};

const tenant = {
  _id: "tenant-1",
  companyName: "Demo Workspace",
  subdomain: "demo",
  ownerId: "user-1",
  status: "active",
};

const membership = {
  _id: "membership-1",
  userId: "user-1",
  tenantId: "tenant-1",
  role: "owner",
  isActive: true,
};

describe("tenant-context", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.connectDB.mockResolvedValue(undefined);
    mocks.getCurrentUser.mockResolvedValue(user);

    mocks.tenantFindOne.mockReturnValue(mockExec(tenant));

    mocks.membershipFindOne.mockReturnValue(mockExec(membership));
  });

  describe("getTenantContext", () => {
    it("returns an authorized tenant context", async () => {
      const result = await getTenantContext("demo");

      expect(result).toEqual({
        user,
        tenant,
        membership,
      });

      expect(mocks.getCurrentUser).toHaveBeenCalledOnce();

      expect(mocks.tenantFindOne).toHaveBeenCalledWith({
        subdomain: "demo",
      });

      expect(mocks.membershipFindOne).toHaveBeenCalledWith({
        userId: user.id,
        tenantId: tenant._id,
        isActive: true,
      });
    });

    it("normalizes the subdomain", async () => {
      await getTenantContext("  DEMO  ");

      expect(mocks.tenantFindOne).toHaveBeenCalledWith({
        subdomain: "demo",
      });
    });

    it("returns null when the tenant does not exist", async () => {
      mocks.tenantFindOne.mockReturnValue(mockExec(null));

      const result = await getTenantContext("missing");

      expect(result).toBeNull();
      expect(mocks.membershipFindOne).not.toHaveBeenCalled();
    });

    it("rejects unauthenticated requests", async () => {
      mocks.getCurrentUser.mockResolvedValue(null);

      await expect(getTenantContext("demo")).rejects.toMatchObject({
        statusCode: 401,
        errorCode: "UNAUTHORIZED",
      });

      expect(mocks.tenantFindOne).not.toHaveBeenCalled();
    });

    it("rejects suspended tenants", async () => {
      mocks.tenantFindOne.mockReturnValue(
        mockExec({
          ...tenant,
          status: "suspended",
        }),
      );

      await expect(getTenantContext("demo")).rejects.toMatchObject({
        statusCode: 403,
        errorCode: "FORBIDDEN",
      });

      expect(mocks.membershipFindOne).not.toHaveBeenCalled();
    });

    it("rejects users without an active membership", async () => {
      mocks.membershipFindOne.mockReturnValue(mockExec(null));

      await expect(getTenantContext("demo")).rejects.toMatchObject({
        statusCode: 403,
        errorCode: "FORBIDDEN",
      });
    });

    it("does not accept an inactive membership", async () => {
      // This represents the database query result that would occur
      // if an inactive membership were the only membership.
      mocks.membershipFindOne.mockReturnValue(mockExec(null));

      await expect(getTenantContext("demo")).rejects.toMatchObject({
        statusCode: 403,
        errorCode: "FORBIDDEN",
      });

      expect(mocks.membershipFindOne).toHaveBeenCalledWith({
        userId: user.id,
        tenantId: tenant._id,
        isActive: true,
      });
    });
  });

  describe("requireTenantContext", () => {
    it("returns a context for an authorized user", async () => {
      const result = await requireTenantContext("demo");

      expect(result.tenant).toEqual(tenant);
      expect(result.membership).toEqual(membership);
    });

    it("throws NOT_FOUND when tenant context does not exist", async () => {
      mocks.tenantFindOne.mockReturnValue(mockExec(null));

      await expect(requireTenantContext("missing")).rejects.toMatchObject({
        statusCode: 404,
        errorCode: "NOT_FOUND",
      });
    });
  });
});
