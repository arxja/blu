import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/server";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { authorizeTenantAccess } from "@/lib/tenancy/tenant-access";

interface RouteContext {
  params: Promise<{
    tenantId: string;
  }>;
}

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw AppError.unauthorized();
    }

    const { tenantId } = await params;

    const { tenant } = await authorizeTenantAccess(user.id, tenantId);

    return NextResponse.json({
      status: tenant.status,
      plan: tenant.plan,
      subdomain: tenant.subdomain,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.errorCode,
        },
        {
          status: error.statusCode,
        },
      );
    }

    // If the thrown error carries a statusCode and errorCode, forward it.
    if (
      error &&
      typeof error === "object" &&
      "statusCode" in error &&
      "errorCode" in error
    ) {
      const err: any = error;

      return NextResponse.json(
        {
          error: err.message || "",
          code: err.errorCode || "",
        },
        { status: err.statusCode || 500 },
      );
    }

    logger.error(
      error instanceof Error ? error : undefined,
      "Failed to retrieve tenant billing status",
    );

    return NextResponse.json(
      {
        error: "Unable to retrieve billing status.",
        code: "INTERNAL_ERROR",
      },
      { status: 500 },
    );
  }
}
