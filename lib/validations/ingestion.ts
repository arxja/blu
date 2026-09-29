import { z } from "zod";

// ─────────────────────────────────────────────────────────────────
// Contract limits. These are the enforced rules.
//
// If any value here changes, update `fern/openapi.yml` (or related contracts) 
// in the same commit.
// The contract and the implementation must never drift.
// ─────────────────────────────────────────────────────────────────

const MAX_EVENT_NAME_LENGTH = 128;
const MAX_IDENTITY_FIELD_LENGTH = 256;
const MAX_PAYLOAD_BYTES = 32 * 1024; // 32 KB, properties + context combined
const MAX_EVENT_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const MAX_FUTURE_SKEW_MS = 5 * 60 * 1000; // 5 minutes
const MIN_BATCH_SIZE = 1;
const MAX_BATCH_SIZE = 100;

// Any UUID version (v1–v8). The value is an opaque deduplication key,
// so its internal version bits are irrelevant to Blu. Locking to v4
// would prevent a future SDK upgrade to v7 (time-sortable, better
// index locality) without a contract change.
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────

/**
 * Byte size of a JSON value as it will be stored. Uses TextEncoder
 * rather than Buffer so this stays portable across runtimes.
 */
function serializedBytes(value: unknown): number {
  if (value === undefined || value === null) return 0;
  return new TextEncoder().encode(JSON.stringify(value)).length;
}

// ─────────────────────────────────────────────────────────────────
// BluEvent
//
// Mirrors components.schemas.BluEvent in the OpenAPI contract.
// ─────────────────────────────────────────────────────────────────

export const bluEventSchema = z
  .object({
    eventId: z.string().regex(UUID_REGEX, "eventId must be a valid UUID."),

    event: z
      .string()
      .min(1, "event name is required.")
      .max(
        MAX_EVENT_NAME_LENGTH,
        `event name must be at most ${MAX_EVENT_NAME_LENGTH} characters.`,
      ),

    // Identity fields are optional but bounded. The OpenAPI schema
    // only specifies minLength: 1; the upper bound here protects the
    // B-tree indexes on the events table (~2700 byte limit per entry).
    userId: z
      .string()
      .min(1, "userId must not be empty.")
      .max(MAX_IDENTITY_FIELD_LENGTH)
      .optional(),

    anonymousId: z
      .string()
      .min(1, "anonymousId must not be empty.")
      .max(MAX_IDENTITY_FIELD_LENGTH)
      .optional(),

    groupId: z
      .string()
      .min(1, "groupId must not be empty.")
      .max(MAX_IDENTITY_FIELD_LENGTH)
      .optional(),

    timestamp: z
      .string()
      .datetime({ offset: true })
      .refine(
        (ts) => Date.parse(ts) <= Date.now() + MAX_FUTURE_SKEW_MS,
        "timestamp cannot be more than 5 minutes in the future.",
      )
      .refine(
        (ts) => Date.parse(ts) >= Date.now() - MAX_EVENT_AGE_MS,
        "timestamp cannot be more than 30 days in the past.",
      ),

    // properties and context are deliberately free-form. The OpenAPI
    // schema declares additionalProperties: true for both. We only
    // enforce that they are objects (not arrays, not scalars).
    properties: z.record(z.string(), z.unknown()).optional(),
    context: z.record(z.string(), z.unknown()).optional(),
  })
  .strict() // reject unknown top-level fields
  .refine(
    (event) =>
      serializedBytes(event.properties) + serializedBytes(event.context) <=
      MAX_PAYLOAD_BYTES,
    {
      message: `properties and context combined must be at most ${
        MAX_PAYLOAD_BYTES / 1024
      } KB.`,
    },
  );

// ─────────────────────────────────────────────────────────────────
// IngestRequest
// ─────────────────────────────────────────────────────────────────

export const ingestRequestSchema = z
  .object({
    events: z
      .array(bluEventSchema)
      .min(MIN_BATCH_SIZE, "batch must contain at least one event.")
      .max(
        MAX_BATCH_SIZE,
        `batch may contain at most ${MAX_BATCH_SIZE} events.`,
      ),
  })
  .strict();

// ─────────────────────────────────────────────────────────────────
// Inferred types
// ─────────────────────────────────────────────────────────────────

export type BluEventInput = z.infer<typeof bluEventSchema>;
export type IngestRequestInput = z.infer<typeof ingestRequestSchema>;
