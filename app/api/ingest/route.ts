import { NextRequest, NextResponse } from "next/server";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { resolveIngestionContext } from "@/services/ingestion-auth.service";
import { ingestRequestSchema } from "@/lib/validations/ingestion";
import { protectIngestion } from "@/lib/arcjet/ingestion";
import { QuotaService } from "@/services/quota-tenant.service";
import { eventsRepo } from "@/lib/database/postgres/repositories/events.repo";

// ─────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────

// HTTP body cap. Above the schema max (100 events × 32 KB ≈ 3.2 MB)
// to leave room for JSON structure overhead. Guards against DoS via
// huge bodies before we call request.json().
const MAX_BODY_BYTES = 4 * 1024 * 1024; // 4 MB

// ─────────────────────────────────────────────────────────────────
// Response helpers
// ─────────────────────────────────────────────────────────────────

/**
 * Public API error response, matching components.schemas.ErrorResponse
 * in fern/openapi.yml. Differs from the internal route convention
 * ({ error: string, code: string }) deliberately — SDK clients are
 * generated against this shape.
 */
function errorResponse(
  code: string,
  message: string,
  status: number,
  details?: unknown,
) {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        ...(details !== undefined ? { details } : {}),
      },
    },
    { status },
  );
}

/**
 * Defensive check for AppError shape. `instanceof AppError` can fail
 * when the error crosses a Next.js bundle boundary; checking the
 * shape is more reliable. Same pattern as workspace.route.ts.
 */
function isAppErrorLike(error: unknown): error is AppError & {
  statusCode: number;
  errorCode: string;
  details?: unknown;
} {
  return (
    !!error &&
    typeof error === "object" &&
    "name" in error &&
    (error as { name?: string }).name === "AppError" &&
    "statusCode" in error &&
    "errorCode" in error
  );
}

// ─────────────────────────────────────────────────────────────────
// POST /api/ingest
// ─────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // ── Step 1: API key present ─────────────────────────────────
    const apiKey = req.headers.get("x-api-key");
    if (!apiKey) {
      return errorResponse("UNAUTHORIZED", "Missing X-API-Key header.", 401);
    }

    // ── Step 2: resolve ingestion context ───────────────────────
    // Throws AppError on invalid key / inactive tenant / missing
    // track permission. Caught by the outer handler.
    const ingestionCtx = await resolveIngestionContext(apiKey);

    // ── Step 3: content-length fast-fail ────────────────────────
    const contentLength = req.headers.get("content-length");
    if (contentLength && Number(contentLength) > MAX_BODY_BYTES) {
      return errorResponse(
        "PAYLOAD_TOO_LARGE",
        "Request body exceeds the 4 MB limit.",
        413,
      );
    }

    // ── Step 4: parse JSON ──────────────────────────────────────
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return errorResponse("BAD_REQUEST", "Malformed JSON body.", 400);
    }

    // ── Step 5: validate against the contract ───────────────────
    const parsedBody = ingestRequestSchema.safeParse(body);
    if (!parsedBody.success) {
      return errorResponse(
        "BAD_REQUEST",
        "Request payload failed validation.",
        400,
        parsedBody.error.issues,
      );
    }

    const { events } = parsedBody.data;

    // ── Step 6: Arcjet rate limit ───────────────────────────────
    const decision = await protectIngestion(req, {
      tenantId: ingestionCtx.tenantId,
      planId: ingestionCtx.plan,
      eventCount: events.length,
    });

    if (decision.isDenied()) {
      return errorResponse(
        "RATE_LIMITED",
        "Ingestion rate limit exceeded.",
        429,
      );
    }

    // ── Step 7: monthly quota check ─────────────────────────────
    // Mongo-side quota uses the ObjectId. The events table uses
    // the publicId. Do not mix them up.
    const quota = new QuotaService(ingestionCtx.tenantObjectId);
    const quotaCheck = await quota.canTrackEvent(events.length);

    if (!quotaCheck.allowed) {
      // Throw so the outer catch maps it via AppError.rateLimited
      // consistently. Returning the AppError directly would send a
      // non-response object to Next.js.
      throw AppError.rateLimited(
        quotaCheck.reason ?? "Monthly event quota exceeded.",
      );
    }

    // ── Step 8: persist to Postgres ─────────────────────────────
    // ingestionCtx.tenantId is the tenant's publicId (UUID).
    // That is the value stored in the events.tenant_id column.
    const result = await eventsRepo.insertBatch(ingestionCtx.tenantId, events);

    // ── Step 9: increment usage counter (best-effort) ───────────
    // The events are already persisted. A failed counter update
    // must not fail the request — that would cause the client to
    // retry, and although the repo deduplicates, it's still wrong.
    try {
      await quota.incrementEventCount(result.inserted);
    } catch (counterError) {
      logger.error(
        counterError instanceof Error ? counterError : undefined,
        "Failed to increment tenant event count (non-fatal)",
      );
    }

    // ── Step 10: success ────────────────────────────────────────
    return NextResponse.json({
      accepted: result.inserted,
      duplicates: result.duplicates,
    });
  } catch (error) {
    if (isAppErrorLike(error)) {
      return errorResponse(
        error.errorCode,
        error.message,
        error.statusCode,
        error.details,
      );
    }

    logger.error(
      error instanceof Error ? error : undefined,
      "Unhandled error in /api/ingest",
    );

    return errorResponse(
      "INTERNAL_ERROR",
      "An unexpected error occurred.",
      500,
    );
  }
}
