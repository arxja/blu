import arcjet, { detectBot, shield, slidingWindow } from "@arcjet/next";
import { authRule } from "@/lib/rate-limit/rules";
import { serverConfig } from "../config";

export const authAj = arcjet({
  key: serverConfig.ARCJET_KEY,
  rules: [
    shield({ mode: "LIVE" }),
    detectBot({
      mode: "LIVE",
      allow: [], // block every detected bot
    }),
    authRule(),
  ],
});
