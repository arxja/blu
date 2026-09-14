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

export type InvitationStatus = "pending" | "accepted" | "expired";

export interface Invitation {
  tenantId: Types.ObjectId;
  invitedBy: Types.ObjectId;
  email: string;
  role: TenantRole;
  token: string;
  expiresAt: Date;
  status: InvitationStatus;
  acceptedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type InvitationDocument = HydratedDocument<Invitation>;

// ---- Schema ----

const InvitationSchema = new Schema<Invitation>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Tenant",
    },
    invitedBy: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "DashboardUser",
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
    },
    role: {
      type: String,
      enum: TenantRoles,
      required: true,
    },
    token: {
      type: String,
      required: true,
      unique: true, // index created automatically; no separate .index() call
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "expired"] satisfies InvitationStatus[],
      default: "pending",
    },
    acceptedAt: { type: Date },
  },
  { timestamps: true },
);

// Query: "pending invites for this tenant to this email"
InvitationSchema.index({ tenantId: 1, email: 1 });
// Query: "all invites in this tenant by status"
InvitationSchema.index({ tenantId: 1, status: 1 });

// NOTE: TTL intentionally omitted. If you want to auto-purge
// expired invitations, add it back — but read the note above first,
// because it also removes them from the UI.

export const InvitationModel =
  (models.Invitation as Model<Invitation>) ??
  model<Invitation>("Invitation", InvitationSchema);
