export const TenantPlans = ["free", "pro", "enterprise"] as const;
export type TenantPlan = (typeof TenantPlans)[number];

export const TenantStatuses = [
  "active",
  "trialing",
  "past_due",
  "suspended",
] as const;
export type TenantStatus = (typeof TenantStatuses)[number];

// Default quotas per plan. Overridable per tenant via `Tenant.quotas`.
export const PlanQuotas: Record<
  TenantPlan,
  {
    monthlyEvents: number;
    retentionDays: number;
    apiRateLimit: number;
    seats: number;
  }
> = {
  free: {
    monthlyEvents: 100_000,
    retentionDays: 30,
    apiRateLimit: 1_000,
    seats: 1,
  },
  pro: {
    monthlyEvents: 5_000_000,
    retentionDays: 365,
    apiRateLimit: 10_000,
    seats: 10,
  },
  enterprise: {
    monthlyEvents: 100_000_000,
    retentionDays: 1095,
    apiRateLimit: 100_000,
    seats: 100,
  },
};
