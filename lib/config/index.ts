import { z } from "zod";
import dotenv from "dotenv";

if (!process.env.CI) {
  dotenv.config({ path: ".env" });
}

const serverSchema = z.object({
  DATABASE_URL: z.string(),
  JWT_SECRET: z.string().min(32),
  STRIPE_SECRET_KEY: z.string().startsWith("sk_"),
  REDIS_URL: z.string().url().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  NODE_ENV: z.enum(["development", "staging", "production", "test", "ci"]),
  APP_URL: z.string().url(),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]),
  SENTRY_DSN: z.string().url().optional(),
  STRIPE_PRO_MONTHLY_PRICE_ID: z.string().optional(),
  STRIPE_ENTERPRISE_MONTHLY_PRICE_ID: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  ARCJET_KEY: z.string().min(1),
  ARCJET_ENV: z.enum(["development", "staging", "production"]),
});

const clientSchema = z.object({
  NEXT_PUBLIC_APP_NAME: z.string().default("My App"),
  NEXT_PUBLIC_API_URL: z.string().default("/api"),
  NEXT_PUBLIC_ENABLE_ANALYTICS: z
    .string()
    .default("false")
    .transform((v) => v === "true"),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_STRIPE_CHECKOUT_URL: z.string(),
});

export type ServerConfig = z.infer<typeof serverSchema>;
export type ClientConfig = z.infer<typeof clientSchema>;

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

export function getClientConfig(): ClientConfig {
  try {
    return clientSchema.parse(
      typeof window === "undefined"
        ? process.env
        : window.__NEXT_DATA__?.props?.pageProps,
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("❌ Client environment validation failed:", error.issues);
    }
    throw error;
  }
}

export const serverConfig = getServerConfig();
export const clientConfig = getClientConfig();
