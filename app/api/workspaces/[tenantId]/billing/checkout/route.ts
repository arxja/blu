import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/server";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { serverConfig } from "@/lib/config";

import { createTenantCheckoutSession } from "@/services/tenant-billing.service";

function isAppErrorLike(error: unknown): error is AppError & {
  statusCode: number;
  errorCode: string;
  details?: unknown;
} {
  return (
    !!error &&
    typeof error === "object" &&
    "statusCode" in error &&
    "errorCode" in error &&
    typeof (error as { statusCode?: unknown }).statusCode === "number" &&
    typeof (error as { errorCode?: unknown }).errorCode === "string"
  );
}

interface RouteContext {
  params: Promise<{
    tenantId: string;
  }>;
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const user = await getCurrentUser();
    const { tenantId } = await params;

    /*
     * Return URLs are generated server-side.
     *
     * The client must never be able to choose where Stripe redirects
     * after checkout.
     *
     * APP_URL is the Blu control-plane URL, so Stripe returns to a
     * stable first-party location regardless of the tenant hostname.
     *
     * Stripe replaces {CHECKOUT_SESSION_ID} with the actual session ID.
     */
    const successUrl = new URL(
      "/billing/checkout/success",
      serverConfig.APP_URL,
    );

    successUrl.searchParams.set("tenantId", tenantId);
    successUrl.searchParams.set("session_id", "{CHECKOUT_SESSION_ID}");

    const cancelUrl = new URL("/billing/checkout/cancel", serverConfig.APP_URL);

    cancelUrl.searchParams.set("tenantId", tenantId);

    const session = await createTenantCheckoutSession({
      userId: user.id,
      tenantId,
      successUrl: successUrl.toString(),
      cancelUrl: cancelUrl.toString(),
    });

    return NextResponse.json({
      url: session.url,
    });
  } catch (error) {
    if (error instanceof AppError || isAppErrorLike(error)) {
      const appError = error as AppError & {
        statusCode: number;
        errorCode: string;
        details?: unknown;
      };

      return NextResponse.json(
        {
          error: appError.message,
          code: appError.errorCode,
          ...(appError.details ? { details: appError.details } : {}),
        },
        {
          status: appError.statusCode,
        },
      );
    }

    logger.error(
      error instanceof Error ? error : undefined,
      "Failed to create Stripe Checkout session",
    );

    return NextResponse.json(
      {
        error: "Unable to start checkout.",
        code: "INTERNAL_ERROR",
      },
      { status: 500 },
    );
  }
}
