import { slidingWindow, tokenBucket } from "@arcjet/next";
import { getPlanById, PlanId } from "../constants";
import { serverConfig } from "../config";

export function dashboardUserRule(planId: PlanId) {
  const { dashboardRequestsPerMinPerUser } = getPlanById(planId).limits;
  return slidingWindow({
    mode: "LIVE",
    interval: "1m",
    max: dashboardRequestsPerMinPerUser,
  });
}

export function dashboardTenantRule(planId: PlanId) {
  const { dashboardRequestsPerMinPerTenant } = getPlanById(planId).limits;
  return slidingWindow({
    mode: "LIVE",
    interval: "1m",
    max: dashboardRequestsPerMinPerTenant,
  });
}

export function ingestionRule(planId: PlanId) {
  const { ingestionEventsPerSec, ingestionBurstEvents } =
    getPlanById(planId).limits;
  return tokenBucket({
    mode: "LIVE",
    refillRate: ingestionEventsPerSec,
    interval: "1s",
    capacity: ingestionBurstEvents,
  });
}

export function reportRule() {
  return tokenBucket({
    mode: "LIVE",
    refillRate: serverConfig.REPORT_REFILL_RATE,
    interval: serverConfig.REPORT_REFILL_INTERVAL,
    capacity: serverConfig.REPORT_BURST_CAPACITY,
  });
}

export function authRule() {
  return slidingWindow({
    mode: "LIVE",
    interval: serverConfig.AUTH_WINDOW,
    max: serverConfig.AUTH_ATTEMPTS_PER_5_MIN,
  });
}
