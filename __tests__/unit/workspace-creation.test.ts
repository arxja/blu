// @vitest-environment node

import mongoose from "mongoose";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  connectDB: vi.fn(),

  tenantFindOne: vi.fn(),
  tenantCreate: vi.fn(),
  tenantCountDocuments: vi.fn(),

  dashboardUserFindById: vi.fn(),

  membershipCreate: vi.fn(),

  recordAuditEvent: vi.fn(),
  invalidateUserWorkspacesCache: vi.fn(),
}));

vi.mock("@/lib/database/mongoose", () => ({
  connectDB: mocks.connectDB,
}));

vi.mock("@/lib/database/models/tenant.model", () => ({
  TenantModel: {
    findOne: mocks.tenantFindOne,
    create: mocks.tenantCreate,
    countDocuments: mocks.tenantCountDocuments,
  },
  default: {
    findOne: mocks.tenantFindOne,
    create: mocks.tenantCreate,
    countDocuments: mocks.tenantCountDocuments,
  },
}));

vi.mock("@/lib/database/models/dashboard-user.model", () => ({
  DashboardUserModel: {
    findById: mocks.dashboardUserFindById,
  },
  default: {
    findById: mocks.dashboardUserFindById,
  },
}));

vi.mock("@/lib/database/models/membership.model", () => ({
  MembershipModel: {
    create: mocks.membershipCreate,
  },
  default: {
    create: mocks.membershipCreate,
  },
}));

vi.mock("@/services/audit.service", () => ({
  recordAuditEvent: mocks.recordAuditEvent,
}));

vi.mock("@/lib/redis", () => ({
  invalidateUserWorkspacesCache: mocks.invalidateUserWorkspacesCache,
}));

import { createWorkspace } from "@/services/workspace.service";

const USER_ID = "507f1f77bcf86cd799439011";
const TENANT_ID = "507f1f77bcf86cd799439012";

const validInput = {
  companyName: "Acme Inc",
  subdomain: "acme",
  billingEmail: "billing@acme.com",
  plan: "free",
  logo: "",
} as const;

const createdTenant = {
  _id: TENANT_ID,
  companyName: "Acme Inc",
  subdomain: "acme",
  ownerId: new mongoose.Types.ObjectId(USER_ID),
  activeMemberCount: 1,
  logoUrl: "",
  plan: "free",
  status: "active",
  billingEmail: "billing@acme.com",
  quotas: {},
};

function mockTenantQuery<T>(value: T) {
  return {
    session: vi.fn().mockReturnThis(),
    lean: vi.fn().mockResolvedValue(value),
  };
}

function mockCountQuery(value: number) {
  return {
    session: vi.fn().mockReturnThis(),
    then: (resolve: (value: number) => number) => resolve(value),
  };
}

function buildCreatedTenant(overrides: Record<string, unknown> = {}) {
  const plan = (overrides.plan as string | undefined) ?? "free";
  const status =
    (overrides.status as string | undefined) ??
    (plan === "free" ? "active" : "trialing");

  return {
    ...createdTenant,
    ...overrides,
    _id: TENANT_ID,
    ownerId: new mongoose.Types.ObjectId(USER_ID),
    plan,
    status,
    logoUrl:
      (overrides.logoUrl as string | undefined) ??
      (overrides.logo as string | undefined) ??
      "",
  };
}

describe("createWorkspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.connectDB.mockResolvedValue({
      transaction: vi.fn(
        async (callback: (session: unknown) => Promise<unknown>) =>
          callback({}),
      ),
    });

    mocks.tenantFindOne.mockReturnValue(mockTenantQuery(null));
    mocks.tenantCountDocuments.mockReturnValue(mockCountQuery(0));

    mocks.dashboardUserFindById.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      session: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue({ freeWorkspaceLimit: 1 }),
    });

    mocks.tenantCreate.mockImplementation(
      async (docs: Array<Record<string, unknown>>) => [
        buildCreatedTenant(docs[0]),
      ],
    );

    mocks.membershipCreate.mockResolvedValue([
      {
        userId: USER_ID,
        tenantId: TENANT_ID,
        role: "owner",
        isActive: true,
      },
    ]);

    mocks.recordAuditEvent.mockResolvedValue(undefined);
    mocks.invalidateUserWorkspacesCache.mockResolvedValue(undefined);
  });

  it("creates a tenant and owner membership atomically", async () => {
    const result = await createWorkspace(USER_ID, validInput);

    expect(result).toEqual(
      buildCreatedTenant({ plan: "free", status: "active" }),
    );

    expect(mocks.tenantFindOne).toHaveBeenCalledWith({
      subdomain: "acme",
    });

    expect(mocks.tenantCreate).toHaveBeenCalledOnce();

    const [tenantDocs, tenantOptions] = mocks.tenantCreate.mock.calls[0];

    expect(tenantDocs).toHaveLength(1);
    expect(tenantDocs[0]).toMatchObject({
      companyName: "Acme Inc",
      subdomain: "acme",
      ownerId: expect.objectContaining({
        toString: expect.any(Function),
      }),
      activeMemberCount: 1,
      plan: "free",
      status: "active",
      billingEmail: "billing@acme.com",
    });

    expect(tenantOptions).toMatchObject({
      session: expect.anything(),
    });

    expect(mocks.membershipCreate).toHaveBeenCalledOnce();

    const [membershipDocs, membershipOptions] =
      mocks.membershipCreate.mock.calls[0];

    expect(membershipDocs).toHaveLength(1);
    expect(membershipDocs[0]).toMatchObject({
      role: "owner",
      isActive: true,
      tenantId: TENANT_ID,
    });

    expect(membershipOptions).toMatchObject({
      session: expect.anything(),
    });
  });

  it("normalizes validated input before creation", async () => {
    await createWorkspace(USER_ID, {
      companyName: "  Acme Inc  ",
      subdomain: " ACME ",
      billingEmail: "BILLING@ACME.COM ",
      logo: "",
      plan: "free",
    });

    expect(mocks.tenantFindOne).toHaveBeenCalledWith({
      subdomain: "acme",
    });

    const [tenantDocs] = mocks.tenantCreate.mock.calls[0];
    expect(tenantDocs[0].companyName).toBe("Acme Inc");
    expect(tenantDocs[0].subdomain).toBe("acme");
    expect(tenantDocs[0].billingEmail).toBe("billing@acme.com");
  });

  it("rejects an invalid user id", async () => {
    await expect(
      createWorkspace("invalid-user-id", validInput),
    ).rejects.toMatchObject({
      statusCode: 401,
      errorCode: "UNAUTHORIZED",
    });

    expect(mocks.connectDB).not.toHaveBeenCalled();
    expect(mocks.tenantCreate).not.toHaveBeenCalled();
    expect(mocks.membershipCreate).not.toHaveBeenCalled();
  });

  it("rejects invalid workspace input", async () => {
    await expect(
      createWorkspace(USER_ID, {
        companyName: "A",
        subdomain: "INVALID SUBDOMAIN!",
        billingEmail: "not-an-email",
        logo: "",
        plan: "free",
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      errorCode: "BAD_REQUEST",
    });

    expect(mocks.connectDB).not.toHaveBeenCalled();
    expect(mocks.tenantCreate).not.toHaveBeenCalled();
    expect(mocks.membershipCreate).not.toHaveBeenCalled();
  });

  it("rejects reserved subdomains", async () => {
    await expect(
      createWorkspace(USER_ID, {
        ...validInput,
        subdomain: "admin",
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      errorCode: "BAD_REQUEST",
    });

    expect(mocks.tenantCreate).not.toHaveBeenCalled();
  });

  it("rejects an already existing subdomain", async () => {
    mocks.tenantFindOne.mockReturnValue(
      mockTenantQuery({
        _id: TENANT_ID,
        subdomain: "acme",
      }),
    );

    await expect(createWorkspace(USER_ID, validInput)).rejects.toMatchObject({
      statusCode: 409,
      errorCode: "CONFLICT",
    });

    expect(mocks.tenantCreate).not.toHaveBeenCalled();
    expect(mocks.membershipCreate).not.toHaveBeenCalled();
    expect(mocks.recordAuditEvent).not.toHaveBeenCalled();
    expect(mocks.invalidateUserWorkspacesCache).not.toHaveBeenCalled();
  });

  it("writes the audit event only after successful creation", async () => {
    await createWorkspace(USER_ID, validInput);

    expect(mocks.recordAuditEvent).toHaveBeenCalledOnce();
    expect(mocks.recordAuditEvent).toHaveBeenCalledWith({
      tenantId: TENANT_ID,
      actorId: USER_ID,
      action: "workspace.created",
      resourceType: "workspace",
      resourceId: TENANT_ID,
      metadata: {
        subdomain: "acme",
        plan: "free",
        status: "active",
      },
    });
  });

  it("invalidates the user's workspace cache after creation", async () => {
    await createWorkspace(USER_ID, validInput);

    expect(mocks.invalidateUserWorkspacesCache).toHaveBeenCalledOnce();
    expect(mocks.invalidateUserWorkspacesCache).toHaveBeenCalledWith(USER_ID);
  });

  it("does not invalidate cache when the transaction fails", async () => {
    const transactionError = new Error("transaction failed");

    mocks.connectDB.mockResolvedValue({
      transaction: vi.fn(async () => {
        throw transactionError;
      }),
    });

    await expect(createWorkspace(USER_ID, validInput)).rejects.toThrow(
      "transaction failed",
    );

    expect(mocks.recordAuditEvent).not.toHaveBeenCalled();
    expect(mocks.invalidateUserWorkspacesCache).not.toHaveBeenCalled();
  });

  it("does not fail workspace creation if audit logging fails", async () => {
    mocks.recordAuditEvent.mockRejectedValue(new Error("audit unavailable"));

    const result = await createWorkspace(USER_ID, validInput);

    expect(result).toEqual(
      buildCreatedTenant({ plan: "free", status: "active" }),
    );
    expect(mocks.invalidateUserWorkspacesCache).toHaveBeenCalledOnce();
  });

  it("does not fail workspace creation if cache invalidation fails", async () => {
    mocks.invalidateUserWorkspacesCache.mockRejectedValue(
      new Error("redis unavailable"),
    );

    const result = await createWorkspace(USER_ID, validInput);

    expect(result).toEqual(
      buildCreatedTenant({ plan: "free", status: "active" }),
    );
  });

  it("creates a free workspace as active", async () => {
    const tenant = await createWorkspace(USER_ID, {
      companyName: "Acme",
      subdomain: "acme",
      billingEmail: "billing@acme.com",
      logo: "",
      plan: "free",
    });

    expect(tenant.plan).toBe("free");
    expect(tenant.status).toBe("active");
    expect(tenant.quotas).toEqual({});
  });

  it("creates a pro workspace as trialing", async () => {
    const tenant = await createWorkspace(USER_ID, {
      companyName: "Acme",
      subdomain: "acme",
      billingEmail: "billing@acme.com",
      logo: "",
      plan: "pro",
    });

    expect(tenant.plan).toBe("pro");
    expect(tenant.status).toBe("trialing");
    expect(tenant.quotas).toEqual({});
  });

  it("rejects a second free workspace", async () => {
    mocks.tenantCountDocuments
      .mockReturnValueOnce(mockCountQuery(0))
      .mockReturnValueOnce(mockCountQuery(1));

    await createWorkspace(USER_ID, {
      companyName: "First",
      subdomain: "first",
      billingEmail: "billing@example.com",
      logo: "",
      plan: "free",
    });

    await expect(
      createWorkspace(USER_ID, {
        companyName: "Second",
        subdomain: "second",
        billingEmail: "billing@example.com",
        logo: "",
        plan: "free",
      }),
    ).rejects.toMatchObject({
      message: "You have reached your free workspace limit.",
    });
  });
});
