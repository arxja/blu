import {
  Schema,
  model,
  models,
  type HydratedDocument,
  type Model,
} from "mongoose";

// ---- Plain shape ----

export interface DashboardUser {
  email: string;
  name: string;
  passwordHash: string;
  freeWorkspaceLimit: number;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type DashboardUserDocument = HydratedDocument<DashboardUser>;

// ---- Schema ----

const DashboardUserSchema = new Schema<DashboardUser>(
  {
    email: { type: String, required: true, lowercase: true, unique: true },
    name: { type: String, required: true },
    passwordHash: { type: String, required: true },
    freeWorkspaceLimit: { type: Number, default: 1 },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
  },
  { timestamps: true },
);

export const DashboardUserModel =
  (models.DashboardUser as Model<DashboardUser>) ??
  model<DashboardUser>("DashboardUser", DashboardUserSchema);
