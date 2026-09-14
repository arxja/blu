import {
  Schema,
  model,
  models,
  type HydratedDocument,
  type Model,
  type Types,
} from "mongoose";
import { AuditActions, type AuditAction } from "@/lib/audit/actions";
import { AuditResourceTypes, type AuditResourceType } from "@/lib/audit/types";

// ---- Plain shape ----

export interface AuditLog {
  tenantId: Types.ObjectId;
  actorId?: Types.ObjectId;
  action: AuditAction;
  resourceType: AuditResourceType;
  resourceId?: Types.ObjectId;
  metadata?: Record<string, unknown>;
  requestId?: string;
  createdAt: Date;
}

export type AuditLogDocument = HydratedDocument<AuditLog>;

// ---- Schema ----

const AuditLogSchema = new Schema<AuditLog>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Tenant",
      immutable: true,
    },
    actorId: {
      type: Schema.Types.ObjectId,
      ref: "DashboardUser",
      immutable: true,
    },
    action: {
      type: String,
      required: true,
      enum: Object.values(AuditActions),
      immutable: true,
    },
    resourceType: {
      type: String,
      required: true,
      enum: AuditResourceTypes,
      immutable: true,
    },
    resourceId: {
      type: Schema.Types.ObjectId,
      immutable: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: undefined,
      immutable: true,
    },
    requestId: {
      type: String,
      immutable: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    strict: true,
  },
);

AuditLogSchema.index({ tenantId: 1, createdAt: -1 });
AuditLogSchema.index({
  tenantId: 1,
  resourceType: 1,
  resourceId: 1,
  createdAt: -1,
});
AuditLogSchema.index({ tenantId: 1, actorId: 1, createdAt: -1 });

export const AuditLogModel =
  (models.AuditLog as Model<AuditLog>) ??
  model<AuditLog>("AuditLog", AuditLogSchema);
