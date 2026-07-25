# Feature Flag System

Our feature‑flag system provides a lightweight, type‑safe way to control which features are active in your Next.js application. It is designed for static environment‑based toggling (e.g., switching between production and demo modes) and works uniformly in server and client components.

---

## Overview

- **Unified API** – `isEnabled(flag)` works in React Server Components, API routes, and Client Components without any additional ceremony.
- **Server‑only safety** – Flags that contain secrets (e.g., `ENABLE_WEBHOOKS`) are never sent to the browser; trying to read them on the client returns `false` and logs a development warning.
- **Type‑safe** – Flag names are restricted to a compile‑time union, preventing typos and ensuring autocompletion.
- **Zero runtime overhead** – The hook returns static booleans derived from build‑time environment variables. No state, no context, no extra re‑renders.

---

## Architecture

### Core module (`lib/feature-flags.ts`)

The core exports two functions:

- **`isEnabled(flag)`** – checks a boolean flag (server or client‑safe).
- **`getFlag(key)`** – reads any configuration value (string or boolean) from the validated schemas.

Both functions respect server‑client boundaries: they read from `serverConfig` on the server and from `clientConfig` on the client. Server‑only keys are inaccessible on the client by design.

### Client Hook (`hooks/useFeatureflags.ts`)

A minimal React hook that returns stable references to all client‑side feature flags and UI configuration values. Because the values come from environment variables baked at build time, they never change during a session – the hook uses `useMemo` with an empty dependency array to guarantee stability.

---

## Configuration

Feature flags are defined as environment variables in your Zod‑validated config files (`lib/config.ts`). Client‑safe flags must be prefixed with `NEXT_PUBLIC_`.

To add a new feature flag:

1. Add the corresponding environment variable to `serverSchema` (server‑only) or `clientSchema` (client‑safe).
2. Append the flag name to the `FEATURE_FLAGS` constant array in `lib/feature-flags.ts`.
3. If it’s a client‑safe flag, map it to a camelCase name inside the `useFeatureFlags` hook for a cleaner developer experience.

Example addition:

```ts
// lib/config/index.ts
const serverSchema = z.object({
  // ...
  ENABLE_NEW_REPORTING: z
    .string()
    .default("false")
    .transform((v) => v === "true"),
});

// lib/feature-flags.ts
const FEATURE_FLAGS = [
  // ...
  "ENABLE_NEW_REPORTING",
] as const;
```

---

## Server‑Side Usage

Import `isEnabled` from `lib/feature-flags` and use it directly inside React Server Components, API routes, or middleware.

```ts
import { isEnabled } from '@/lib/feature-flags';

export default async function DashboardPage() {
const showWebhooks = isEnabled('ENABLE_WEBHOOKS');

return (
<div>
<h1>Dashboard</h1>
{showWebhooks && <WebhookPanel />}
</div>
);
}
```

If a request needs overrides (e.g., a cookie for a specific demo user), pass an optional overrides map:

```ts
const overrides = { ENABLE_WEBHOOKS: false };
if (isEnabled('ENABLE_WEBHOOKS', overrides)) { ... }
```

---

## Client‑Side Usage

### 1. The `useFeatureFlags` Hook

The hook returns an object with two stable properties:

- **`flags`** – an object containing all client‑safe booleans (camelCase keys).
- **`ui`** – an object holding UI configuration values like `appName` and `primaryColor`.

```tsx
"use client";
import { useFeatureFlags } from "@/hooks/use-feature-flags";

export function MyClientComponent() {
  const { flags, ui } = useFeatureFlags();

  return (
    <div style={{ "--primary": ui.primaryColor } as React.CSSProperties}>
      <h1>{ui.appName}</h1>
      {flags.newDashboard ? <NewDashboard /> : <OldDashboard />}
    </div>
  );
}
```

### 2. Conditional Rendering Without Deletion

Because both branches are imported in the same file, your production and demo code coexist in the bundle. The runtime check simply chooses which component to render – no code is ever deleted.

---

## Example: Demo Mode

Your primary use case is to run the same codebase in **production** and **demo** environments, controlled by `NEXT_PUBLIC_DEMO_MODE`.

### Workspace page

In the server component we pass the demo flag as a prop for simplicity:

```tsx
// app/workspace/page.tsx
import { isEnabled } from "@/lib/feature-flags";
import { WorkspaceClient } from "./WorkspaceClient";

export default function WorkspacePage() {
  const isDemo = isEnabled("NEXT_PUBLIC_DEMO_MODE");
  return <WorkspaceClient isDemo={isDemo} />;
}
```

The client component can combine the passed prop with the hook:

```tsx
// app/workspace/WorkspaceClient.tsx
"use client";
import { useFeatureFlags } from "@/hooks/use-feature-flags";

export function WorkspaceClient({ isDemo }: { isDemo: boolean }) {
  const { ui } = useFeatureFlags();

  return (
    <div>
      <h1>{ui.appName} Workspace</h1>
      {isDemo ? <PreFilledDemoDashboard /> : <FullDashboardWithCreateJoin />}
    </div>
  );
}
```

---

## Migration Between Environments

Switching from demo to production (or vice versa) is a simple environment‑variable change on your hosting platform (Vercel, etc.):

1. Update `NEXT_PUBLIC_DEMO_MODE` to `true` or `false`.
2. Redeploy the application.

All code for both modes is already present; no files are added or removed. This makes the process fast and risk‑free.

---

## Testing

The core functions are pure and accept optional overrides, making unit testing straightforward.

```ts
import { isEnabled } from "@/lib/feature-flags";

test("webhooks are enabled in production", () => {
  expect(isEnabled("ENABLE_WEBHOOKS", { ENABLE_WEBHOOKS: true })).toBe(true);
});

test("webhooks flag returns false on client", () => {
  // Simulate client environment – in Vitest you can set window
  expect(isEnabled("ENABLE_WEBHOOKS")).toBe(false);
});
```

For the React hook, simply wrap your component with the hook and render it in a test. Because the hook reads from `clientConfig`, you can mock the `clientConfig` module if needed to simulate different environments.

---

## Future Extensions

- **Dynamic session overrides** – If you later need to toggle a flag temporarily (e.g., for a QA tester), you can extend the hook with a thin context layer and URL query parameter parsing. The core `isEnabled` already supports an overrides map, so the foundation is in place.
- **Per‑request server overrides** – Middleware could inject overrides from a cookie or header, enabling per‑user experiments without a full deploy.
- **Edge‑runtime compatibility** – Replace direct `dotenv` usage with Vercel’s build‑time injection if you plan to use Edge Functions.

---

This system is intentionally minimal. It solves the immediate need – a single deployable codebase that can run in demo or production mode 