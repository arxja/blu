import {
  ClientConfig,
  clientConfig,
  ServerConfig,
  serverConfig,
} from "./config";
import { log } from "./logger";

/**
 * All boolean feature flags - both server-only and client-safe
 * This array will be extended when a new flag comes
 */
const FEATURE_FLAGS = ["NEXT_PUBLIC_DEMO_MODE"] as const;

export type FeatureFlag = (typeof FEATURE_FLAGS)[number];

/** Type-safe check - for reading flags form dynamic sources */
export function isFeatureFlag(key: string): key is FeatureFlag {
  return (FEATURE_FLAGS as readonly string[]).includes(key);
}

/**
 * Check whether a feature is enabled.
 *  - Simply works on Server and client
 *  - Server-only ones always return false in the browser (with a dev waring in console)
 *  - Accepts an optional overrides map (e.g. from URL search params on the server)
 */

export function isEnable(
  flag: FeatureFlag,
  overrides?: Partial<Record<FeatureFlag, boolean>>,
): boolean {
  const isClient = typeof window !== "undefined";

  // 1. Client‑side: server‑only flags always return false (overrides ignored)
  if (isClient && !flag.startsWith("NEXT_PUBLIC_")) {
    if (serverConfig.NODE_ENV === "development") {
      log.warn(
        `Server‑only flag "${flag}" was read on the client. Returning false.`,
      );
    }
    return false;
  }

  // 2. Overrides take highest priority (server‑side for any flag, client‑side only for NEXT_PUBLIC_ flags)
  if (overrides && flag in overrides) {
    return overrides[flag]!;
  }

  // 3. Fallback to configuration
  if (flag.startsWith("NEXT_PUBLIC_")) {
    // Client‑safe flag – value is now a boolean (schema transform)
    return !!(clientConfig as Record<string, unknown>)[flag];
  }

  // 4. Server‑only flag on the server (isClient === false here)
  return (serverConfig as Record<string, unknown>)[flag] === "true";
}

/**
 * Read **any** config value (string or boolean).
 * - On the client, server‑only keys return `undefined`.
 */
export function getFlag(
  key: keyof ServerConfig | keyof ClientConfig,
): string | boolean | undefined {
  const isClient = typeof window !== "undefined";

  if (!key.startsWith("NEXT_PUBLIC_") && isClient) {
    if (serverConfig.NODE_ENV === "development") {
      log.warn(`Server‑only key “${key}” accessed on the client.`);
    }
    return undefined;
  }

  return key.startsWith("NEXT_PUBLIC_")
    ? ((clientConfig as Record<string, unknown>)[key] as string | boolean)
    : ((serverConfig as Record<string, unknown>)[key] as string | boolean);
}
