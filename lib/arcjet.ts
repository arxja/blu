import arcjet, { tokenBucket } from "@arcjet/next";
import { serverConfig } from "./config";

export const aj = arcjet({
  key: serverConfig.ARCJET_KEY!,
  characteristics: ["tenantId"],
  rules: [
    tokenBucket({
      mode: "LIVE",
      refillRate: 10,
      interval: 60,
      // for dynamic capacity (for tenants) -> change the token bucket method
      capacity: 100
    }),
  ],
});
