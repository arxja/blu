import mongoose, { Schema, models, model, Document } from "mongoose";

export interface IDashboardUser extends Document {
  email: string;
  name: string;
  passwordHash: string;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DashboardUserSchema = new Schema<IDashboardUser>(
  {
    email: { type: String, required: true, lowercase: true },
    name: { type: String, required: true },
    passwordHash: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
  },
  { timestamps: true },
);

// Indexes
DashboardUserSchema.index({ tenantId: 1, email: 1 }, { unique: true });
DashboardUserSchema.index({ email: 1 });
DashboardUserSchema.index({ tenantId: 1, role: 1 });

export default models.DashboardUser ||
  model<IDashboardUser>("DashboardUser", DashboardUserSchema);
