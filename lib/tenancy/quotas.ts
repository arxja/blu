import { PlanQuotas } from "./plan";
import type { Tenant } from "@/lib/database/models/tenant.model";

export type EffectiveQuotas = {
  monthlyEvents: number;
  dataRetentionDays: number;
  ingestionEventsPerSec: number;
  seats: number;
  retentionDays: number;
  apiRateLimit: number;
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

  const monthlyEvents = overrides.monthlyEvents ?? planDefaults.monthlyEvents;
  const dataRetentionDays =
    overrides.dataRetentionDays ??
    overrides.retentionDays ??
    planDefaults.dataRetentionDays;
  const ingestionEventsPerSec =
    overrides.ingestionEventsPerSec ??
    overrides.apiRateLimit ??
    planDefaults.ingestionEventsPerSec;
  const seats = overrides.seats ?? planDefaults.seats;

  return {
    monthlyEvents,
    dataRetentionDays,
    ingestionEventsPerSec,
    seats,
    retentionDays: dataRetentionDays,
    apiRateLimit: ingestionEventsPerSec,
  };
}
