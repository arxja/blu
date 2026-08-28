import { connectDB } from "@/lib/database/mongoose";
import { requestContext } from "@/lib/logger";
import { AuditEventInput } from "@/types/audit";
import AuditLog from "@/lib/database/models/auditLog.model";
import mongoose from "mongoose";

export async function recordAuditEvent(input: AuditEventInput): Promise<void> {
  const context = requestContext.getStore();

  await connectDB();

  await AuditLog.create({
    tenantId: new mongoose.Types.ObjectId(input.tenantId.toString()),

    actorId: input.actorId
      ? new mongoose.Types.ObjectId(input.actorId.toString())
      : undefined,

    action: input.action,
    resourceType: input.resourceType,

    resourceId: input.resourceId
      ? new mongoose.Types.ObjectId(input.resourceId.toString())
      : undefined,

    metadata: input.metadata,
    requestId: input.requestId ?? context?.requestId,
  });
}
