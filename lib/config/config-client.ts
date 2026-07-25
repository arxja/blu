import { z } from "zod";

const clientSchema = z.object({
  NEXT_PUBLIC_APP_NAME: z.string().default("My App"),
  NEXT_PUBLIC_API_URL: z.string().default("/api"),
  NEXT_PUBLIC_ENABLE_ANALYTICS: z
    .string()
    .default("false")
    .transform((v) => v === "true"),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_STRIPE_CHECKOUT_URL: z.string().default(""),
  NEXT_PUBLIC_DEMO_MODE: z
    .string()
    .default("false")
    .transform((v) => v === "true"),
});

export type ClientConfig = z.infer<typeof clientSchema>;

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

export const clientConfig = getClientConfig();
