import arcjet, { shield } from "@arcjet/next";
import { dashboardUserRule, dashboardTenantRule } from "@/lib/rate-limit/rules";
import { PlanId } from "../constants";
import { serverConfig } from "../config";

export const dashboardAj = arcjet({
  key: serverConfig.ARCJET_KEY,
  characteristics: ["userId", "tenantId"],
  rules: [shield({ mode: "LIVE" })],
});

export async function protectDashboard(
  req: Request,
  ctx: { userId: string; tenantId: string; planId: PlanId },
) {
  return dashboardAj
    .withRule(dashboardUserRule(ctx.planId))
    .withRule(dashboardTenantRule(ctx.planId))
    .protect(req, {
      userId: ctx.userId,
      tenantId: ctx.tenantId,
    });
}
