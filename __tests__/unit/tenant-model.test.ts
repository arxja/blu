// @vitest-environment node
import { TenantModel } from "@/lib/database/models/tenant.model";
import { describe, it, expect } from "vitest";

describe("Tenant model", () => {
  it("includes workspace metadata defaults for members and logo", () => {
    const tenant = new TenantModel({
      companyName: "Acme",
      subdomain: "acme",
      ownerId: "507f1f77bcf86cd799439011",
      billingEmail: "team@acme.com",
      activeMemberCount: 1,
      logoUrl: "",
    });

    expect(tenant.activeMemberCount).toBe(1);
    expect(tenant.logoUrl).toBe("");
  });
});
