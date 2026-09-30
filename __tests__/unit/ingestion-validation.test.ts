import { describe, expect, it } from "vitest";
import {
  bluEventSchema,
  ingestRequestSchema,
} from "@/lib/validations/ingestion";

// ─────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────

const VALID_UUID_V4 = "550e8400-e29b-41d4-a716-446655440000";
const VALID_UUID_V7 = "018f3b4a-1234-7abc-89ab-0123456789ab";

function validEvent(overrides: Record<string, unknown> = {}) {
  return {
    eventId: VALID_UUID_V4,
    event: "purchase_completed",
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

function isoOffset(ms: number): string {
  return new Date(Date.now() + ms).toISOString();
}

// ─────────────────────────────────────────────────────────────────
// BluEvent — eventId
// ─────────────────────────────────────────────────────────────────

describe("bluEventSchema", () => {
  describe("eventId", () => {
    it.each([
      ["missing", undefined],
      ["empty string", ""],
      ["not a string", 123],
      ["random text", "not-a-uuid"],
      ["uuid-shaped but malformed", "550e8400-e29b-41d4-a716"],
    ])("rejects eventId when %s", (_label, value) => {
      expect(() =>
        bluEventSchema.parse(validEvent({ eventId: value })),
      ).toThrow();
    });

    it.each([
      ["UUID v4", VALID_UUID_V4],
      ["UUID v7", VALID_UUID_V7],
      ["uppercase UUID", VALID_UUID_V4.toUpperCase()],
    ])("accepts eventId when %s", (_label, value) => {
      expect(() =>
        bluEventSchema.parse(validEvent({ eventId: value })),
      ).not.toThrow();
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // BluEvent — event name
  // ─────────────────────────────────────────────────────────────────

  describe("event", () => {
    it.each([
      ["missing", undefined],
      ["empty string", ""],
      ["not a string", 42],
      ["129 characters", "a".repeat(129)],
    ])("rejects event when %s", (_label, value) => {
      expect(() =>
        bluEventSchema.parse(validEvent({ event: value })),
      ).toThrow();
    });

    it.each([
      ["single character", "x"],
      ["exactly 128 characters", "a".repeat(128)],
      ["snake_case", "purchase_completed"],
      ["with dots", "checkout.step.completed"],
    ])("accepts event when %s", (_label, value) => {
      expect(() =>
        bluEventSchema.parse(validEvent({ event: value })),
      ).not.toThrow();
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // BluEvent — timestamp
  // ─────────────────────────────────────────────────────────────────

  describe("timestamp", () => {
    it.each([
      ["missing", undefined],
      ["empty string", ""],
      ["not a date", "yesterday"],
      ["non-ISO format", "01/15/2026"],
    ])("rejects timestamp when %s", (_label, value) => {
      expect(() =>
        bluEventSchema.parse(validEvent({ timestamp: value })),
      ).toThrow();
    });

    it.each([
      ["10 minutes in the future", isoOffset(10 * 60 * 1000)],
      ["31 days in the past", isoOffset(-31 * 24 * 60 * 60 * 1000)],
    ])("rejects timestamp when %s", (_label, value) => {
      expect(() =>
        bluEventSchema.parse(validEvent({ timestamp: value })),
      ).toThrow();
    });

    it.each([
      ["now", new Date().toISOString()],
      ["4 minutes in the future", isoOffset(4 * 60 * 1000)],
      ["29 days in the past", isoOffset(-29 * 24 * 60 * 60 * 1000)],
      ["with explicit offset", "2026-09-28T12:00:00+09:00"],
    ])("accepts timestamp when %s", (_label, value) => {
      expect(() =>
        bluEventSchema.parse(validEvent({ timestamp: value })),
      ).not.toThrow();
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // BluEvent — identity fields
  // ─────────────────────────────────────────────────────────────────

  describe("identity fields", () => {
    it.each(["userId", "anonymousId", "groupId"])(
      "accepts %s when omitted",
      (field) => {
        const e = validEvent();
        expect(() => bluEventSchema.parse(e)).not.toThrow();
      },
    );

    it.each(["userId", "anonymousId", "groupId"])(
      "accepts %s at exactly 256 characters",
      (field) => {
        expect(() =>
          bluEventSchema.parse(validEvent({ [field]: "a".repeat(256) })),
        ).not.toThrow();
      },
    );

    it.each(["userId", "anonymousId", "groupId"])(
      "rejects %s when 257 characters",
      (field) => {
        expect(() =>
          bluEventSchema.parse(validEvent({ [field]: "a".repeat(257) })),
        ).toThrow();
      },
    );

    it.each(["userId", "anonymousId", "groupId"])(
      "rejects %s when empty string",
      (field) => {
        expect(() =>
          bluEventSchema.parse(validEvent({ [field]: "" })),
        ).toThrow();
      },
    );

    it.each(["userId", "anonymousId", "groupId"])(
      "rejects %s when not a string",
      (field) => {
        expect(() =>
          bluEventSchema.parse(validEvent({ [field]: 123 })),
        ).toThrow();
      },
    );
  });

  // ─────────────────────────────────────────────────────────────────
  // BluEvent — properties / context
  // ─────────────────────────────────────────────────────────────────

  describe("properties and context", () => {
    it("accepts when both omitted", () => {
      expect(() => bluEventSchema.parse(validEvent())).not.toThrow();
    });

    it("accepts nested objects", () => {
      expect(() =>
        bluEventSchema.parse(
          validEvent({
            properties: { a: { b: { c: [1, 2, 3] } } },
          }),
        ),
      ).not.toThrow();
    });

    it.each([
      ["array", []],
      ["string", "hello"],
      ["number", 42],
    ])("rejects properties when it is %s", (_label, value) => {
      expect(() =>
        bluEventSchema.parse(validEvent({ properties: value })),
      ).toThrow();
    });

    it("accepts properties at exactly 32 KB", () => {
      const big = { data: "a".repeat(32 * 1024 - 20) };
      expect(() =>
        bluEventSchema.parse(validEvent({ properties: big })),
      ).not.toThrow();
    });

    it("rejects when properties + context exceed 32 KB", () => {
      const big = { data: "a".repeat(33 * 1024) };
      expect(() =>
        bluEventSchema.parse(validEvent({ properties: big })),
      ).toThrow(/32 KB/);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // BluEvent — strictness
  // ─────────────────────────────────────────────────────────────────

  describe("strictness", () => {
    it("rejects unknown top-level fields", () => {
      expect(() =>
        bluEventSchema.parse(validEvent({ unknownField: "x" })),
      ).toThrow();
    });

    it("accepts arbitrary keys inside properties", () => {
      expect(() =>
        bluEventSchema.parse(
          validEvent({ properties: { anything: "goes", here: 42 } }),
        ),
      ).not.toThrow();
    });
  });
});

// ─────────────────────────────────────────────────────────────────
// IngestRequest
// ─────────────────────────────────────────────────────────────────

describe("ingestRequestSchema", () => {
  describe("batch size", () => {
    it.each([
      ["missing events", {}],
      ["null events", { events: null }],
      ["empty array", { events: [] }],
      ["not an array", { events: "x" }],
      ["101 events", { events: Array.from({ length: 101 }, validEvent) }],
    ])("rejects when %s", (_label, value) => {
      expect(() => ingestRequestSchema.parse(value)).toThrow();
    });

    it.each([
      ["1 event", 1],
      ["50 events", 50],
      ["exactly 100 events", 100],
    ])("accepts %s", (_label, count) => {
      const events = Array.from({ length: count }, validEvent);
      expect(() => ingestRequestSchema.parse({ events })).not.toThrow();
    });
  });

  describe("strictness", () => {
    it("rejects unknown top-level fields", () => {
      expect(() =>
        ingestRequestSchema.parse({
          events: [validEvent()],
          tenantId: "should-not-be-here",
        }),
      ).toThrow();
    });
  });
});
