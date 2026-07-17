import mongoose, { Schema, models, model } from "mongoose";

export interface ITenant extends mongoose.Document {
  companyName: string;
  subdomain: string;
  ownerId: mongoose.Types.ObjectId;
  plan: "free" | "pro" | "enterprise";
  status: "active" | "trialing" | "past_due" | "suspended";
  billingEmail: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  trialEndsAt?: Date;
  quotas: {
    monthlyEvents: number;
    retentionDays: number;
    apiRateLimit: number;
    seats: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const TenantSchema = new Schema<ITenant>(
  {
    companyName: { type: String, required: true },
    subdomain: { type: String, required: true, unique: true, lowercase: true },
    ownerId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "DashboardUser",
    },
    plan: {
      type: String,
      enum: ["free", "pro", "enterprise"],
      default: "free",
    },
    status: {
      type: String,
      enum: ["active", "trialing", "past_due", "suspended"],
      default: "trialing",
    },
    billingEmail: { type: String, required: true },
    stripeCustomerId: { type: String },
    stripeSubscriptionId: { type: String },
    trialEndsAt: { type: Date },
    quotas: {
      monthlyEvents: { type: Number, default: 100000 },
      retentionDays: { type: Number, default: 30 },
      apiRateLimit: { type: Number, default: 1000 },
      seats: { type: Number, default: 1 },
    },
  },
  { timestamps: true },
);

// Indexes
TenantSchema.index({ subdomain: 1 }, { unique: true });
TenantSchema.index({ ownerId: 1 });
TenantSchema.index({ stripeCustomerId: 1 });

export default models.Tenant || model<ITenant>("Tenant", TenantSchema);
