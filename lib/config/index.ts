import { z } from "zod";
import dotenv from "dotenv";

const envFile =
  process.env.NODE_ENV === "production"
    ? ".env.production"
    : process.env.NODE_ENV === "development"
      ? ".env.development"
      : ".env";

dotenv.config({ path: envFile });

const serverSchema = z.object({
  // Server-only
  DATABASE_URL: z.string(),
  JWT_SECRET: z.string().min(32),
  STRIPE_SECRET_KEY: z.string().startsWith("sk_"),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_"),
  REDIS_URL: z.string().url().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  NODE_ENV: z.enum(["development", "staging", "production"]),
  APP_URL: z.string().url(),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]),
  SENTRY_DSN: z.string().url().optional(),
});

const clientSchema = z.object({
  // Client-safe
  NEXT_PUBLIC_APP_NAME: z.string().default("My App"),
  NEXT_PUBLIC_API_URL: z.string().url().default("/api"),
  NEXT_PUBLIC_ENABLE_ANALYTICS: z
    .string()
    .default("false")
    .transform((v) => v === "true"),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_STRIPE_CHECKOUT_URL: z.string(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().startsWith("pk_"),
  NEXT_PUBLIC_PRO_PRICE_ID: z.string().startsWith("price"),
  NEXT_PUBLIC_ENTERPRISE_PRICE_ID: z.string().startsWith("price"),
});

// Export types
export type ServerConfig = z.infer<typeof serverSchema>;
export type ClientConfig = z.infer<typeof clientSchema>;

// Server-only config getter
export function getServerConfig(): ServerConfig {
  if (typeof window !== "undefined") {
    throw new Error(
      "❌ getServerConfig() called on client! Server config must not be imported in client components.",
    );
  }

  try {
    const serverConfig = serverSchema.parse(process.env);

    // Production security check
    if (process.env.NODE_ENV === "production") {
      const requiredKeys = [
        "DATABASE_URL",
        "JWT_SECRET",
        "STRIPE_SECRET_KEY",
      ] as const;

      const missingRequired = requiredKeys.filter((key) => !process.env[key]);

      if (missingRequired.length > 0) {
        console.error(
          "❌ Missing required environment variables:",
          missingRequired,
        );
        process.exit(1);
      }
    }

    return serverConfig;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("❌ Environment validation failed:", error.issues);
      if (process.env.NODE_ENV === "production") process.exit(1);
    }
    throw error;
  }
}

// Client-safe config getter
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
