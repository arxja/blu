// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  connectDB: vi.fn(),

  tenantFindOne: vi.fn(),
  tenantCreate: vi.fn(),

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
  },
  default: {
    findOne: mocks.tenantFindOne,
    create: mocks.tenantCreate,
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
  logoUrl: "",
} as const;

const createdTenant = {
  _id: TENANT_ID,
  companyName: "Acme Inc",
  subdomain: "acme",
  ownerId: USER_ID,
  activeMemberCount: 1,
  logoUrl: "",
  plan: "free",
  status: "trialing",
  billingEmail: "billing@acme.com",
};

function mockTenantQuery<T>(value: T) {
  return {
    session: vi.fn().mockReturnThis(),
    lean: vi.fn().mockResolvedValue(value),
  };
}

describe("createWorkspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    /*
     * Fake Mongoose connection.
     */
    mocks.connectDB.mockResolvedValue({
      transaction: vi.fn(
        async (callback: (session: unknown) => Promise<unknown>) =>
          callback({}),
      ),
    });

    /*
     * Default: subdomain available.
     */
    mocks.tenantFindOne.mockReturnValue(mockTenantQuery(null));

    /*
     * Tenant creation succeeds.
     */
    mocks.tenantCreate.mockResolvedValue([createdTenant]);

    /*
     * Membership creation succeeds.
     */
    mocks.membershipCreate.mockResolvedValue([
      {
        userId: USER_ID,
        tenantId: TENANT_ID,
        role: "owner",
        isActive: true,
      },
    ]);

    /*
     * Post-commit side effects succeed.
     */
    mocks.recordAuditEvent.mockResolvedValue(undefined);

    mocks.invalidateUserWorkspacesCache.mockResolvedValue(undefined);
  });

  it("creates a tenant and owner membership atomically", async () => {
    const result = await createWorkspace(USER_ID, validInput);

    expect(result).toEqual(createdTenant);

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
      status: "trialing",
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

    expect(result).toEqual(createdTenant);

    expect(mocks.invalidateUserWorkspacesCache).toHaveBeenCalledOnce();
  });

  it("does not fail workspace creation if cache invalidation fails", async () => {
    mocks.invalidateUserWorkspacesCache.mockRejectedValue(
      new Error("redis unavailable"),
    );

    const result = await createWorkspace(USER_ID, validInput);

    expect(result).toEqual(createdTenant);
  });
});
