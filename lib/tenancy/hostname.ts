import { serverConfig } from "@/lib/config";

export type HostContext =
  | {
      type: "root";
      hostname: string;
    }
  | {
      type: "tenant";
      hostname: string;
      subdomain: string;
    };

function normalizeHostname(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/\.$/, "");
}

function getBaseHostname(): string {
  return normalizeHostname(serverConfig.APP_BASE_DOMAIN);
}

function getApplicationHostname(): string {
  return normalizeHostname(new URL(serverConfig.APP_URL).hostname);
}

/**
 * Resolves the request hostname into either the root application
 * or a tenant subdomain.
 *
 * Development:
 *   localhost:3000
 *   acme.localhost:3000
 *
 * Production:
 *   blu.so
 *   acme.blu.so
 */

export function resolveHost(host: string | null): HostContext {
  if (!host) {
    return {
      type: "root",
      hostname: "",
    };
  }

  const hostname = normalizeHostname(host.split(":")[0]);
  const baseHostname = getBaseHostname();
  const applicationHostname = getApplicationHostname();

  // Control-plane application host.
  if (
    hostname === applicationHostname ||
    hostname === baseHostname ||
    hostname === `www.${baseHostname}`
  ) {
    return {
      type: "root",
      hostname,
    };
  }

  const suffix = `.${baseHostname}`;

  if (!hostname.endsWith(suffix)) {
    return {
      type: "root",
      hostname,
    };
  }

  const subdomain = hostname.slice(0, -suffix.length);

  if (!subdomain || subdomain.includes(".")) {
    return {
      type: "root",
      hostname,
    };
  }

  if (subdomain === "www" || subdomain === "app") {
    return {
      type: "root",
      hostname,
    };
  }

  return {
    type: "tenant",
    hostname,
    subdomain,
  };
}

export function getTenantSubdomain(host: string | null): string | null {
  const context = resolveHost(host);

  return context.type === "tenant" ? context.subdomain : null;
}

export function getTenantHostname(subdomain: string): string {
  const normalizedSubdomain = subdomain.trim().toLowerCase();

  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(normalizedSubdomain)) {
    throw new Error("Invalid tenant subdomain");
  }

  return `${normalizedSubdomain}.${getBaseHostname()}`;
}

export function getTenantUrl(subdomain: string, path = "/"): string {
  const appUrl = new URL(serverConfig.APP_URL);

  appUrl.hostname = getTenantHostname(subdomain);

  // Keep the configured protocol.
  // Development → http
  // Production → https
  appUrl.pathname = path.startsWith("/") ? path : `/${path}`;

  return appUrl.toString();
}
