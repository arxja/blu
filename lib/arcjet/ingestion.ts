import arcjet, { shield } from "@arcjet/next";
import { ingestionRule } from "@/lib/rate-limit/rules";
import { PlanId } from "../constants";
import { serverConfig } from "../config";

export const ingestionAj = arcjet({
  key: serverConfig.ARCJET_KEY,
  characteristics: ["tenantId"],
  rules: [shield({ mode: "LIVE" })],
});

export async function protectIngestion(
  req: Request,
  ctx: { tenantId: string; planId: PlanId; eventCount: number },
) {
  return ingestionAj.withRule(ingestionRule(ctx.planId)).protect(req, {
    tenantId: ctx.tenantId,
    requested: ctx.eventCount,
  });
}
