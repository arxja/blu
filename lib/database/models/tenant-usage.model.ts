import {
  Schema,
  model,
  models,
  type HydratedDocument,
  type Model,
  type Types,
} from "mongoose";

// ---- Plain shape ----

export interface TenantUsage {
  tenantId: Types.ObjectId;
  year: number;
  /** 1-12. Not JS getMonth() (0-11) — normalize at the call site. */
  month: number;
  count: number;
  createdAt: Date;
  updatedAt: Date;
}

export type TenantUsageDocument = HydratedDocument<TenantUsage>;

// ---- Schema ----

const TenantUsageSchema = new Schema<TenantUsage>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Tenant",
    },
    year: {
      type: Number,
      required: true,
      min: 2000,
      max: 9999,
    },
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    count: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true },
);

// One row per tenant per month. Upsert target for `$inc`.
TenantUsageSchema.index({ tenantId: 1, year: 1, month: 1 }, { unique: true });

export const TenantUsageModel =
  (models.TenantUsage as Model<TenantUsage>) ??
  model<TenantUsage>("TenantUsage", TenantUsageSchema);
