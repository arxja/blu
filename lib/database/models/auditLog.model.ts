import mongoose, { Schema, models, model } from "mongoose";
import type { AuditAction } from "@/lib/audit/actions";
import { AuditResourceType } from "@/types/audit";

export interface IAuditLog extends mongoose.Document {
  tenantId: mongoose.Types.ObjectId | string;
  actorId?: mongoose.Types.ObjectId | string;

  action: AuditAction;

  resourceType: AuditResourceType;

  resourceId?: mongoose.Types.ObjectId | string;

  metadata?: Record<string, unknown>;

  requestId?: string;

  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
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
      immutable: true,
    },

    resourceType: {
      type: String,
      required: true,
      enum: ["workspace", "membership", "api_key", "billing", "settings"],
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
    timestamps: {
      createdAt: true,
      updatedAt: false,
    },

    /*
     * Audit records represent historical facts.
     * They should not be casually mutated through normal
     * Mongoose updates.
     */
    strict: true,
  },
);

/*
 * Primary audit-log query:
 *
 * "Show me what happened in this workspace recently."
 */
AuditLogSchema.index({
  tenantId: 1,
  createdAt: -1,
});

/*
 * Useful for resource history:
 *
 * "Show me everything that happened to this membership."
 */
AuditLogSchema.index({
  tenantId: 1,
  resourceType: 1,
  resourceId: 1,
  createdAt: -1,
});

/*
 * Useful for actor history:
 *
 * "What actions did this user perform in this workspace?"
 */
AuditLogSchema.index({
  tenantId: 1,
  actorId: 1,
  createdAt: -1,
});

export default models.AuditLog || model<IAuditLog>("AuditLog", AuditLogSchema);
