import { z } from "zod";
import dotenv from "dotenv";
import {
  clientConfig,
  getClientConfig,
  type ClientConfig,
} from "./config-client";

if (!process.env.CI) {
  dotenv.config({ path: ".env" });
}

const serverSchema = z.object({
  DATABASE_URL: z.string(),
  JWT_SECRET: z.string().min(32),
  STRIPE_SECRET_KEY: z.string().startsWith("sk_"),
  SMTP_HOST: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  NODE_ENV: z.enum(["development", "staging", "production", "test", "ci"]),
  APP_URL: z.string().url(),
  APP_BASE_DOMAIN: z.string().min(1),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]),
  SENTRY_DSN: z.string().url().optional(),
  STRIPE_PRO_MONTHLY_PRICE_ID: z.string().optional(),
  STRIPE_ENTERPRISE_MONTHLY_PRICE_ID: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  ARCJET_KEY: z.string().min(1),
  ARCJET_ENV: z.enum(["development", "staging", "production"]),
  UPSTASH_REDIS_REST_URL: z.string(),
  UPSTASH_REDIS_REST_TOKEN: z.string(),
  AUTH_COOKIE_DOMAIN: z.string().optional(),
  AUTH_COOKIE_SECURE: z
    .string()
    .default("false")
    .transform((v) => v === "true"),
});

export type ServerConfig = z.infer<typeof serverSchema>;
export type { ClientConfig };
export { clientConfig, getClientConfig };

export function getServerConfig(): ServerConfig {
  if (typeof window !== "undefined") {
    throw new Error(
      "❌ getServerConfig() called on client! Server config must not be imported in client components.",
    );
  }

  try {
    const serverConfig = serverSchema.parse(process.env);
    return serverConfig;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("❌ Environment validation failed:", error.issues);

      if (process.env.NODE_ENV === "production" && !process.env.CI) {
        process.exit(1);
      }
    }
    throw error;
  }
}

export const serverConfig = getServerConfig();
