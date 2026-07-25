"use client";

import { clientConfig } from "@/lib/config/config-client";
import { useMemo } from "react";

/**
 * A simple, static hook that returns all client‑side feature flags and
 * UI configuration values.  Because the flags are derived from
 * environment variables (baked at build time), they **never** change
 * during a session – no state, no context, no re‑renders.
 */

export function useFeatureFlags() {
  const flags = useMemo(
    () => ({
      demoMode: clientConfig.NEXT_PUBLIC_DEMO_MODE,
    }),
    [], // empty deps – flags are static for the whole session
  );

  const ui = useMemo(
    () => ({
      // appName: clientConfig.NEXT_PUBLIC_APP_NAME,
    }),
    [],
  );

  return { flags, ui };
}
