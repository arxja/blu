import mongoose, { Schema, models, model } from "mongoose";

export interface IMembership extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  role: "owner" | "admin" | "analyst" | "viewer";
  isActive: boolean;
  lastAccessedAt?: Date;
  invitedBy?: mongoose.Types.ObjectId;
  joinedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MembershipSchema = new Schema<IMembership>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "DashboardUser",
    },
    tenantId: { type: Schema.Types.ObjectId, required: true, ref: "Tenant" },
    role: {
      type: String,
      enum: ["owner", "admin", "analyst", "viewer"],
      required: true,
    },
    isActive: { type: Boolean, default: true },
    lastAccessedAt: { type: Date },
    invitedBy: { type: Schema.Types.ObjectId, ref: "DashboardUser" },
    joinedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

MembershipSchema.index({ userId: 1, tenantId: 1 }, { unique: true });
MembershipSchema.index({ tenantId: 1, role: 1 });
MembershipSchema.index({ userId: 1, isActive: 1 });

export default models.Membership ||
  model<IMembership>("Membership", MembershipSchema);
