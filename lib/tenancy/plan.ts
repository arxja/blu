import { PLANS } from "@/lib/constants";

export const TenantPlans = ["free", "pro", "enterprise"] as const;
export type TenantPlan = (typeof TenantPlans)[number];

export const TenantStatuses = [
  "active",
  "trialing",
  "past_due",
  "suspended",
] as const;
export type TenantStatus = (typeof TenantStatuses)[number];

export type PlanLimitValues = {
  monthlyEvents: number;
  dataRetentionDays: number;
  ingestionEventsPerSec: number;
  seats: number;
  monthlyTrackedUsers?: number;
  reports?: number;
  dashboardRequestsPerMinPerUser?: number;
  dashboardRequestsPerMinPerTenant?: number;
  ingestionBurstEvents?: number;
};

// Default quotas per plan. Overridable per tenant via `Tenant.quotas`.
export const PlanQuotas: Record<TenantPlan, PlanLimitValues> =
  Object.fromEntries(
    PLANS.map((plan) => [
      plan.id,
      {
        monthlyEvents: plan.limits.monthlyEvents,
        dataRetentionDays: plan.limits.dataRetentionDays,
        ingestionEventsPerSec: plan.limits.ingestionEventsPerSec,
        seats: plan.limits.seats,
        monthlyTrackedUsers: plan.limits.monthlyTrackedUsers,
        reports: plan.limits.reports,
        dashboardRequestsPerMinPerUser:
          plan.limits.dashboardRequestsPerMinPerUser,
        dashboardRequestsPerMinPerTenant:
          plan.limits.dashboardRequestsPerMinPerTenant,
        ingestionBurstEvents: plan.limits.ingestionBurstEvents,
      },
    ]),
  ) as Record<TenantPlan, PlanLimitValues>;
