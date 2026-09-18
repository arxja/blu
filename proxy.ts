import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { verifyJWT } from "@/lib/auth/jwt";
import { resolveHost } from "@/lib/tenancy/hostname";
import { serverConfig } from "@/lib/config";
import { authAj } from "@/lib/arcjet/auth";

const PUBLIC_ROUTES = [
  "/sign-in",
  "/sign-up",
  "/api/auth/sign-in",
  "/api/auth/sign-up",
  "/api/auth/sign-out",
  "/pricing",
  "/",
];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

function getControlPlaneUrl(pathname = "/"): URL {
  const url = new URL(serverConfig.APP_URL);

  url.pathname = pathname.startsWith("/") ? pathname : `/${pathname}`;

  url.search = "";
  url.hash = "";

  return url;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const hostContext = resolveHost(request.headers.get("host"));

  /*
   * ----------------------------------------------------------
   * API REQUESTS
   * ----------------------------------------------------------
   *
   * Keep APIs out of hostname page rewriting.
   */
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  /*
   * ----------------------------------------------------------
   * AUTH ROUTE PROTECTION (bot detection + rate limiting)
   * ----------------------------------------------------------
   */
  if (pathname === "/sign-in" || pathname === "/sign-up") {
    // Second argument is REQUIRED by the SDK types.
    // Pass {} for IP-based auto-detection, or { ipSrc } if
    // you have already resolved a trusted client IP.
    const decision = await authAj.protect(request, {});

    if (decision.isDenied()) {
      // Bot detection blocked this request
      if (decision.reason.isBot()) {
        return NextResponse.json(
          { code: 403, message: "Forbidden" },
          { status: 403 },
        );
      }

      // Rate limit blocked this request
      if (decision.reason.isRateLimit()) {
        return NextResponse.json(
          { code: 429, message: "Too Many Requests" },
          {
            status: 429,
            headers: {
              // Use `reset` — NOT `retryAfter`
              "Retry-After": String(decision.reason.reset ?? 300),
            },
          },
        );
      }

      // Shield or other rule blocked this request
      return NextResponse.json(
        { code: 403, message: "Forbidden" },
        { status: 403 },
      );
    }
  }

  /*
   * ----------------------------------------------------------
   * ROOT / CONTROL PLANE
   * ----------------------------------------------------------
   */
  if (hostContext.type === "root") {
    const token = request.cookies.get("auth_token")?.value;

    const payload = token ? verifyJWT(token) : null;

    if (isPublicRoute(pathname)) {
      if (payload && (pathname === "/sign-in" || pathname === "/sign-up")) {
        return NextResponse.redirect(getControlPlaneUrl("/dashboard"));
      }

      return NextResponse.next();
    }

    if (!payload) {
      return NextResponse.redirect(getControlPlaneUrl("/sign-in"));
    }

    return NextResponse.next();
  }

  /*
   * ----------------------------------------------------------
   * TENANT HOST
   * ----------------------------------------------------------
   *
   * The hostname identifies the tenant.
   * The dynamic route carries that identity into App Router.
   */
  if (hostContext.type === "tenant") {
    const token = request.cookies.get("auth_token")?.value;

    const payload = token ? verifyJWT(token) : null;

    if (!payload) {
      return NextResponse.redirect(getControlPlaneUrl("/sign-in"));
    }

    /*
     * Prevent recursive rewriting.
     */
    if (pathname === "/s" || pathname.startsWith("/s/")) {
      return NextResponse.next();
    }

    const rewrittenPath = `/s/${hostContext.subdomain}${
      pathname === "/" ? "" : pathname
    }`;

    return NextResponse.rewrite(new URL(rewrittenPath, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
};
