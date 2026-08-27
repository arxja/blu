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
