import { Schema, models, model } from "mongoose";

export interface ITenantUsage {
  tenantId: string;
  year: number;
  month: number; // 0-11
  count: number;
}

const TenantUsageSchema = new Schema<ITenantUsage>(
  {
    tenantId: { type: String, required: true },
    year: { type: Number, required: true },
    month: { type: Number, required: true },
    count: { type: Number, default: 0 },
  },
  { timestamps: true },
);

// Compound index for fast lookups
TenantUsageSchema.index({ tenantId: 1, year: 1, month: 1 }, { unique: true });

export default models.TenantUsage ||
  model<ITenantUsage>("TenantUsage", TenantUsageSchema);
