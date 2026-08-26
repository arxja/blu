import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/server";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { getTenantUrl } from "@/lib/tenancy/hostname";
import { authorizeTenantAccess } from "@/lib/tenancy/tenant-access";

interface RouteContext {
  params: Promise<{
    tenantId: string;
  }>;
}

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const user = await getCurrentUser();

    const { tenantId } = await params;

    const { tenant } = await authorizeTenantAccess(user.id, tenantId);

    const tenantUrl = getTenantUrl(tenant.subdomain);

    return NextResponse.redirect(tenantUrl);
  } catch (error) {
    if (error instanceof AppError) {
      if (error.errorCode === "UNAUTHORIZED") {
        return NextResponse.redirect(new URL("/sign-in", request.url));
      }

      return NextResponse.json(
        {
          error: error.message,
          code: error.errorCode,
        },
        { status: error.statusCode },
      );
    }

    logger.error(
      error instanceof Error ? error : undefined,
      "Failed to launch workspace",
    );

    return NextResponse.json(
      {
        error: "Unable to launch workspace.",
        code: "INTERNAL_ERROR",
      },
      { status: 500 },
    );
  }
}
