import {
  Schema,
  model,
  models,
  type HydratedDocument,
  type Model,
  type Types,
} from "mongoose";
import { TenantRoles, type TenantRole } from "@/lib/tenancy/types";

// ---- Plain shape ----

export interface Membership {
  userId: Types.ObjectId;
  tenantId: Types.ObjectId;
  role: TenantRole;
  isActive: boolean;
  lastAccessedAt?: Date;
  invitedBy?: Types.ObjectId;
  joinedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type MembershipDocument = HydratedDocument<Membership>;

// ---- Schema ----

const MembershipSchema = new Schema<Membership>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "DashboardUser",
    },
    tenantId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Tenant",
    },
    role: {
      type: String,
      enum: TenantRoles,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastAccessedAt: { type: Date },
    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: "DashboardUser",
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

// One membership row per (user, tenant). Re-invite = reactivate.
MembershipSchema.index({ userId: 1, tenantId: 1 }, { unique: true });

// Query: "list all members of this tenant with role X"
MembershipSchema.index({ tenantId: 1, role: 1 });

// Query: "which tenants does this user belong to (active)?"
MembershipSchema.index({ userId: 1, isActive: 1 });

export const MembershipModel =
  (models.Membership as Model<Membership>) ??
  model<Membership>("Membership", MembershipSchema);

export default MembershipModel;
