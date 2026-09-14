// lib/database/models/tenant.model.ts
import {
  Schema,
  model,
  models,
  type HydratedDocument,
  type Model,
  type Types,
} from "mongoose";
import {
  TenantPlans,
  TenantStatuses,
  type TenantPlan,
  type TenantStatus,
} from "@/lib/tenancy/plan";

// ---- Nested shapes ----

/**
 * Per-tenant quota overrides. All fields optional so the effective
 * value can be computed as `{ ...PlanQuotas[plan], ...tenant.quotas }`
 * in `lib/tenancy/quotas.ts`. NEVER read `tenant.quotas.x` directly.
 */
export interface TenantQuotas {
  monthlyEvents?: number;
  retentionDays?: number;
  apiRateLimit?: number;
  seats?: number;
}

// ---- Plain shape ----

export interface Tenant {
  companyName: string;
  subdomain: string;
  ownerId: Types.ObjectId;

  /**
   * Denormalized count of active memberships.
   * Maintained by `services/tenancy.service.ts` — every membership
   * create/deactivate must update this in the same transaction.
   * A nightly reconciliation job verifies consistency.
   */
  activeMemberCount: number;

  logoUrl?: string;
  plan: TenantPlan;
  status: TenantStatus;
  billingEmail: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  trialEndsAt?: Date;
  quotas: TenantQuotas;
  createdAt: Date;
  updatedAt: Date;
}

export type TenantDocument = HydratedDocument<Tenant>;

// ---- Sub-schema ----

const TenantQuotasSchema = new Schema<TenantQuotas>(
  {
    monthlyEvents: { type: Number, min: 0 },
    retentionDays: { type: Number, min: 0 },
    apiRateLimit: { type: Number, min: 0 },
    seats: { type: Number, min: 0 },
  },
  { _id: false },
);

// ---- Schema ----

const TenantSchema = new Schema<Tenant>(
  {
    companyName: { type: String, required: true },
    subdomain: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/,
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "DashboardUser",
    },
    activeMemberCount: { type: Number, default: 1, min: 1 },
    logoUrl: { type: String },
    plan: {
      type: String,
      enum: TenantPlans,
      default: "free",
    },
    status: {
      type: String,
      enum: TenantStatuses,
      default: "active",
    },
    billingEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    stripeCustomerId: { type: String },
    stripeSubscriptionId: { type: String },
    trialEndsAt: { type: Date },
    quotas: { type: TenantQuotasSchema, default: {} },
  },
  { timestamps: true },
);

// ---- Indexes ----

TenantSchema.index({ ownerId: 1 });

// Stripe lookups happen on every webhook. Unique + sparse so free
// tenants (no customer yet) don't collide on `null`.
TenantSchema.index({ stripeCustomerId: 1 }, { unique: true, sparse: true });
TenantSchema.index({ stripeSubscriptionId: 1 }, { unique: true, sparse: true });

// Ops: "list all tenants in this status" / "past_due" alerting
TenantSchema.index({ status: 1 });

// Cron: "find trials ending soon"
TenantSchema.index({ status: 1, trialEndsAt: 1 });

export const TenantModel =
  (models.Tenant as Model<Tenant>) ?? model<Tenant>("Tenant", TenantSchema);
