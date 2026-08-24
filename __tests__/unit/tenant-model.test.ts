// @vitest-environment node
import { describe, it, expect } from "vitest";
import Tenant from "@/lib/database/models/tenant.model";

describe("Tenant model", () => {
  it("includes workspace metadata defaults for members and logo", () => {
    const tenant = new Tenant({
      companyName: "Acme",
      subdomain: "acme",
      ownerId: "507f1f77bcf86cd799439011",
      billingEmail: "team@acme.com",
    });

    expect(tenant.members).toBe(1);
    expect(tenant.logo).toBe("");
  });
});
