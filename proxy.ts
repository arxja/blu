import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyJWT } from "@/lib/auth/jwt";

const publicRoutes = [
  "/sign-in",
  "/sign-up",
  "/api/auth/sign-in",
  "/api/auth/sign-up",
  "/api/auth/sign-out",
  "/pricing",
];

const protectedRoutes = ["/dashboard", "/workspaces", "/api/protected"];

function getSubdomain(request: NextRequest): string | null {
  const host = request.headers.get("host") || "";
  const parts = host.split(".");
  if (parts.length >= 2 && parts[0] !== "www" && parts[0] !== "localhost") {
    return parts[0];
  }
  return null;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const subdomain = getSubdomain(request);

  const token = request.cookies.get("auth_token")?.value;
  let payload = null;
  if (token) {
    payload = verifyJWT(token);
  }

  if (payload && ["/sign-in", "/sign-up"].includes(pathname)) {
    const dashboardUrl = new URL("/dashboard", request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  // Only bypass the proxy for the absolute root when there is no subdomain.
  if (pathname === "/" && !subdomain) {
    return NextResponse.next();
  }

  if (
    publicRoutes.some(
      (route) => pathname === route || pathname.startsWith(`${route}/`),
    )
  ) {
    return NextResponse.next();
  }

  if (!payload) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/sign-in", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (subdomain) {
    // Preserve x-subdomain header for downstream consumption.
    // Rewrite subdomain root and paths to an established route (dashboard)
    // so the rewrite target resolves to an existing route in the app.
    const newPath = `/dashboard${pathname === "/" ? "" : pathname}`;
    const rewriteUrl = new URL(newPath, request.url);
    const rewriteResponse = NextResponse.rewrite(rewriteUrl);
    rewriteResponse.headers.set("x-subdomain", subdomain);
    return rewriteResponse;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
};
