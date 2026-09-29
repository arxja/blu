import { PLANS, type PlanId } from "@/lib/constants";

export type TenantPlan = PlanId;
export const TenantPlans: readonly TenantPlan[] = PLANS.map((p) => p.id);

export const TenantStatuses = [
  "active",
  "pending_payment",
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
