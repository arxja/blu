// @vitest-environment node
import { describe, expect, it } from "vitest";
import AuditLog from "@/lib/database/models/auditLog.model";

describe("AuditLog model", () => {
  it("requires tenantId", () => {
    const doc = new AuditLog({
      action: "workspace.created",
      resourceType: "workspace",
    });

    const error = doc.validateSync();

    expect(error?.errors.tenantId).toBeDefined();
  });

  it("accepts a valid audit event", () => {
    const doc = new AuditLog({
      tenantId: "507f1f77bcf86cd799439011",

      actorId: "507f1f77bcf86cd799439012",

      action: "workspace.created",

      resourceType: "workspace",

      metadata: {
        subdomain: "demo",
      },
    });

    const error = doc.validateSync();

    expect(error).toBeUndefined();
  });

  it("rejects an unknown audit action", () => {
    const doc = new AuditLog({
      tenantId: "507f1f77bcf86cd799439011",
      action: "unknown.event",
      resourceType: "workspace",
    });

    const error = doc.validateSync();

    expect(error?.errors.action).toBeDefined();
  });
});
