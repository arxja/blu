import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { verifyJWT } from "@/lib/auth/jwt";
import { resolveHost } from "@/lib/tenancy/hostname";
import { serverConfig } from "@/lib/config";

const PUBLIC_ROUTES = [
  "/sign-in",
  "/sign-up",
  "/api/auth/sign-in",
  "/api/auth/sign-up",
  "/api/auth/sign-out",
  "/pricing",
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

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const hostContext = resolveHost(request.headers.get("host"));

  /*
   * ----------------------------------------------------------
   * ROOT / CONTROL PLANE
   * ----------------------------------------------------------
   */

  if (hostContext.type === "root") {
    const token = request.cookies.get("auth_token")?.value;

    const payload = token ? verifyJWT(token) : null;

    /*
     * Prevent direct access to the internal tenant route
     * from the root host.
     */
    if (pathname === "/s" || pathname.startsWith("/s/")) {
      return NextResponse.rewrite(new URL("/404", request.url));
    }

    /*
     * Auth pages.
     */
    if (isPublicRoute(pathname)) {
      return NextResponse.next();
    }

    /*
     * Control-plane authentication.
     */
    if (!payload) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      return NextResponse.redirect(getControlPlaneUrl("/sign-in"));
    }

    return NextResponse.next();
  }

  /*
   * ----------------------------------------------------------
   * TENANT HOST
   * ----------------------------------------------------------
   *
   * Example:
   *
   * demo.blu.test
   */

  if (hostContext.type === "tenant") {
    /*
     * API routes stay completely normal.
     *
     * demo.blu.test/api/auth/me
     *          ↓
     * /api/auth/me
     */
    if (pathname.startsWith("/api/")) {
      return NextResponse.next();
    }

    /*
     * Authenticated tenant application.
     *
     * The tenant page performs authoritative authorization.
     */
    const token = request.cookies.get("auth_token")?.value;

    const payload = token ? verifyJWT(token) : null;

    if (!payload) {
      return NextResponse.redirect(getControlPlaneUrl("/sign-in"));
    }

    /*
     * Don't recursively rewrite an already rewritten request.
     */
    if (pathname === "/s" || pathname.startsWith("/s/")) {
      return NextResponse.next();
    }

    /*
     * demo.blu.test/
     *     ↓
     * /s/demo
     *
     * demo.blu.test/analytics
     *     ↓
     * /s/demo/analytics
     */
    const rewrittenPath = `/s/${hostContext.subdomain}${
      pathname === "/" ? "" : pathname
    }`;

    const rewriteUrl = new URL(rewrittenPath, request.url);

    return NextResponse.rewrite(rewriteUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next|[\\w-]+\\.\\w+).*)"],
};
