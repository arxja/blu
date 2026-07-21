import arcjet, { tokenBucket } from "@arcjet/next";
import { NextRequest } from "next/server";
import { QuotaService } from "@/services/quota-tenant.service";
import { serverConfig } from "./config";

export const aj = arcjet({
  key: serverConfig.ARCJET_KEY!,
  characteristics: ["tenantId"],
  rules: [
    tokenBucket({
      mode: "LIVE",
      refillRate: 10,
      interval: 60, // seconds
      // Dynamic limit based on tenant
      async max(req: NextRequest) {
        const tenantId = req.headers.get("x-tenant-id");
        if (!tenantId) return 100; // fallback

        try {
          const service = new QuotaService(tenantId);
          return await service.getApiRateLimit();
        } catch {
          return 100; // error fallback
        }
      },
    } as any),
  ],
});
