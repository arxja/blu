import { PlanQuotas } from "./plan";
import type { Tenant } from "@/lib/database/models/tenant.model";

export type EffectiveQuotas = {
  monthlyEvents: number;
  retentionDays: number;
  apiRateLimit: number;
  seats: number;
};

/**
 * Merge plan defaults with per-tenant overrides.
 * Always call this — never read `tenant.quotas.x` directly.
 */
export function getEffectiveQuotas(
  tenant: Pick<Tenant, "plan" | "quotas">,
): EffectiveQuotas {
  const planDefaults = PlanQuotas[tenant.plan ?? "free"];
  const overrides = tenant.quotas ?? {};

  return {
    monthlyEvents: overrides.monthlyEvents ?? planDefaults.monthlyEvents,
    retentionDays: overrides.retentionDays ?? planDefaults.retentionDays,
    apiRateLimit: overrides.apiRateLimit ?? planDefaults.apiRateLimit,
    seats: overrides.seats ?? planDefaults.seats,
  };
}
