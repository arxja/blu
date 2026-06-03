import mongoose, { Schema, models, model } from "mongoose";

export interface IInvitation extends mongoose.Document {
  tenantId: mongoose.Types.ObjectId;
  invitedBy: string;
  email: string;
  role: "admin" | "analyst" | "viewer";
  token: string;
  expiresAt: Date;
  status: "pending" | "accepted" | "expired";
  acceptedAt?: Date;
  createdAt: Date;
}

const InvitationSchema = new Schema<IInvitation>(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, ref: "Tenant" },
    invitedBy: { type: String, required: true, ref: "DashboardUser" },
    email: { type: String, required: true, lowercase: true },
    role: {
      type: String,
      enum: ["admin", "analyst", "viewer"],
      required: true,
    },
    token: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    status: {
      type: String,
      enum: ["pending", "accepted", "expired"],
      default: "pending",
    },
    acceptedAt: { type: Date },
  },
  { timestamps: true },
);

// Indexes
InvitationSchema.index({ token: 1 }, { unique: true });
InvitationSchema.index({ tenantId: 1, email: 1 });
InvitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // Auto-delete expired

export default models.Invitation ||
  model<IInvitation>("Invitation", InvitationSchema);
