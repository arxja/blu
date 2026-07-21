// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QuotaService } from "@/services/quota-tenant.service";
import Tenant from "@/lib/database/models/tenant.model";
import TenantUsage from "@/lib/database/models/tenant-usage.model";

vi.mock("@/lib/database/models/tenant.model");
vi.mock("@/lib/database/models/tenant-usage.model");

describe("QuotaService", () => {
  const tenantId = "tenant123";

  function mockQueryWithLean(data: any) {
    return {
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockReturnValue(data),
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows event tracking if under limit", async () => {
    const tenantData = {
      plan: "pro",
      status: "active",
      quotas: { monthlyEvents: 1000 },
    };
    const usageData = { count: 500 };

    vi.mocked(Tenant.findById).mockReturnValue(
      mockQueryWithLean(tenantData) as any,
    );
    vi.mocked(TenantUsage.findOne).mockReturnValue(
      mockQueryWithLean(usageData) as any,
    );

    const service = new QuotaService(tenantId);
    const result = await service.canTrackEvent(1);
    expect(result.allowed).toBe(true);
  });

  it("rejects event tracking if limit exceeded", async () => {
    const tenantData = { quotas: { monthlyEvents: 1000 } };
    const usageData = { count: 1000 };

    vi.mocked(Tenant.findById).mockReturnValue(
      mockQueryWithLean(tenantData) as any,
    );
    vi.mocked(TenantUsage.findOne).mockReturnValue(
      mockQueryWithLean(usageData) as any,
    );

    const service = new QuotaService(tenantId);
    const result = await service.canTrackEvent(1);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("reached");
  });

  it("allows unlimited (-1) resources", async () => {
    const tenantData = { quotas: { seats: -1 } };

    vi.mocked(Tenant.findById).mockReturnValue(
      mockQueryWithLean(tenantData) as any,
    );

    const service = new QuotaService(tenantId);
    const result = await service.canInviteMember(999);
    expect(result.allowed).toBe(true);
  });
});
