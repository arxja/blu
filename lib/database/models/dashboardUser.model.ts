import { Schema, models, model, Document } from "mongoose";

export interface IDashboardUser extends Document {
  email: string;
  name: string;
  passwordHash: string;
  freeWorkspaceLimit: number;
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
    freeWorkspaceLimit: { type: Number, default: 1 },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
  },
  { timestamps: true },
);

// Indexes
DashboardUserSchema.index({ email: 1 });

export default models.DashboardUser ||
  model<IDashboardUser>("DashboardUser", DashboardUserSchema);
