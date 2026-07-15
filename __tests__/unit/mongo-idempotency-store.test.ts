// @vitest-environment node

import { describe, it, expect, vi } from "vitest";
import { Types } from "mongoose";

// Mock the logger first to avoid config validation
vi.mock("@/lib/logger", () => ({
  log: { debug: vi.fn(), info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

// Mock the model
vi.mock("@/lib/database/models/processedWebhook.model");

import { MongoIdempotencyStore } from "@/lib/idempotency/mongo-idempotency-store";
import ProcessedWebhook from "@/lib/database/models/processedWebhook.model";

describe("MongoIdempotencyStore", () => {
  const store = new MongoIdempotencyStore();

  it("returns false if event not processed", async () => {
    vi.mocked(ProcessedWebhook.exists).mockResolvedValue(null);
    await expect(store.isProcessed("evt_123")).resolves.toBe(false);
  });

  it("returns true if event exists", async () => {
    vi.mocked(ProcessedWebhook.exists).mockResolvedValue({
      _id: new Types.ObjectId(),
    });
    await expect(store.isProcessed("evt_123")).resolves.toBe(true);
  });

  it("markProcessed inserts a new document", async () => {
    const createMock = vi
      .mocked(ProcessedWebhook.create)
      .mockResolvedValue({} as any);
    await store.markProcessed("evt_456");
    expect(createMock).toHaveBeenCalledWith({ eventId: "evt_456" });
  });

  it("markProcessed ignores duplicate key error", async () => {
    const error = new Error("E11000 duplicate key error") as any;
    error.code = 11000;
    vi.mocked(ProcessedWebhook.create).mockRejectedValue(error);
    await expect(store.markProcessed("evt_789")).resolves.toBeUndefined();
  });
});
