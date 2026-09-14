// @vitest-environment node
import { AuditLogModel } from "@/lib/database/models/auditLog.model";
import { describe, expect, it } from "vitest";

describe("AuditLog model", () => {
  it("requires tenantId", () => {
    const doc = new AuditLogModel({
      action: "workspace.created",
      resourceType: "workspace",
    });

    const error = doc.validateSync();

    expect(error?.errors.tenantId).toBeDefined();
  });

  it("accepts a valid audit event", () => {
    const doc = new AuditLogModel({
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
    const doc = new AuditLogModel({
      tenantId: "507f1f77bcf86cd799439011",
      action: "unknown.event",
      resourceType: "workspace",
    });

    const error = doc.validateSync();

    expect(error?.errors.action).toBeDefined();
  });
});
