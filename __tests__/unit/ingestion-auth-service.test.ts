// @vitest-environment node

import { Types } from "mongoose";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/database/mongoose", () => ({
  connectDB: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/database/models/apiKey.model", () => ({
  ApiKeyModel: { findOne: vi.fn() },
}));

vi.mock("@/lib/redis", () => ({
  getCachedIngestionContext: vi.fn(),
  setCachedIngestionContext: vi.fn(),
}));

const mocks = vi.hoisted(() => ({
  tenantFindOne: vi.fn(),
  tenantFindById: vi.fn(),
}));

vi.mock("@/lib/database/models/tenant.model", () => ({
  TenantModel: {
    findOne: mocks.tenantFindOne,
    findById: mocks.tenantFindById,
  },
}));

import { ApiKeyModel } from "@/lib/database/models/apiKey.model";
import { TenantModel } from "@/lib/database/models/tenant.model";
import {
  getCachedIngestionContext,
  setCachedIngestionContext,
} from "@/lib/redis";
import { resolveIngestionContext } from "@/services/ingestion-auth.service";

const tenantObjectId = new Types.ObjectId();
const apiKeyId = new Types.ObjectId();
const PUBLIC_ID = "e0caab47-ea77-44b1-a590-f731675e2177";
const RAW_KEY =
  "blu_abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";

function makeApiKey(
  overrides: Partial<{
    isActive: boolean;
    expiresAt: Date | null;
    permissions: string[];
  }> = {},
) {
  return {
    _id: apiKeyId,
    tenantId: tenantObjectId,
    name: "Production Key",
    keyPrefix: "blu_abcdef12",
    keyHash: "some-hash-value",
    permissions: overrides.permissions ?? ["track", "identify"],
    isActive: overrides.isActive ?? true,
    expiresAt: overrides.expiresAt ?? null,
    usageCount: 0,
    lastUsedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function makeTenant(overrides: Partial<{ status: string; plan: string }> = {}) {
  return {
    _id: tenantObjectId,
    publicId: PUBLIC_ID,
    companyName: "Acme",
    subdomain: "acme",
    plan: overrides.plan ?? "free",
    status: overrides.status ?? "active",
    quotas: {},
    billingEmail: "acme@example.com",
    activeMemberCount: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function mockMongooseFindOne(value: unknown) {
  return { lean: vi.fn().mockResolvedValue(value) };
}

function mockMongooseFindById(value: unknown) {
  return { lean: vi.fn().mockResolvedValue(value) };
}

describe("resolveIngestionContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCachedIngestionContext).mockResolvedValue(null); // default: cache miss
    vi.mocked(setCachedIngestionContext).mockResolvedValue(undefined);
  });

  // ────────── Cache behavior ──────────

  describe("cache behavior", () => {
    it("returns the cached context on cache hit without querying Mongo", async () => {
      const cachedContext = {
        tenantId: PUBLIC_ID,
        tenantObjectId,
        plan: "free" as const,
        apiKeyId,
        permissions: ["track"] as const,
      };

      vi.mocked(getCachedIngestionContext).mockResolvedValueOnce(
        cachedContext as never,
      );

      const result = await resolveIngestionContext(RAW_KEY);

      expect(result).toEqual(cachedContext);
      expect(ApiKeyModel.findOne).not.toHaveBeenCalled();
      expect(TenantModel.findById).not.toHaveBeenCalled();
    });

    it("queries Mongo and populates the cache on cache miss", async () => {
      vi.mocked(ApiKeyModel.findOne).mockReturnValueOnce(
        mockMongooseFindOne(makeApiKey()) as never,
      );
      vi.mocked(TenantModel.findById).mockReturnValueOnce(
        mockMongooseFindById(makeTenant()) as never,
      );

      await resolveIngestionContext(RAW_KEY);

      expect(ApiKeyModel.findOne).toHaveBeenCalledOnce();
      expect(TenantModel.findById).toHaveBeenCalledOnce();
      expect(setCachedIngestionContext).toHaveBeenCalledOnce();

      const [cacheKey, cacheValue] = vi.mocked(setCachedIngestionContext).mock
        .calls[0];
      expect(typeof cacheKey).toBe("string");
      expect(cacheKey.length).toBeGreaterThan(0);
      expect(cacheValue).toMatchObject({ tenantId: PUBLIC_ID });
    });
  });

  // ────────── API key resolution ──────────

  describe("API key resolution", () => {
    it("rejects empty key with 401 and uniform message", async () => {
      await expect(resolveIngestionContext("")).rejects.toThrow(
        "Invalid API key",
      );
      // No Mongo query should even be attempted for an empty key.
      expect(ApiKeyModel.findOne).not.toHaveBeenCalled();
    });

    it("rejects unknown key with 401 and uniform message", async () => {
      vi.mocked(ApiKeyModel.findOne).mockReturnValueOnce(
        mockMongooseFindOne(null) as never,
      );

      await expect(resolveIngestionContext(RAW_KEY)).rejects.toThrow(
        "Invalid API key",
      );
      expect(setCachedIngestionContext).not.toHaveBeenCalled();
    });

    it("rejects expired key with the SAME 401 message (no info leak)", async () => {
      vi.mocked(ApiKeyModel.findOne).mockReturnValueOnce(
        mockMongooseFindOne(
          makeApiKey({ expiresAt: new Date(Date.now() - 1000) }),
        ) as never,
      );

      // Deliberately the same assertion as "unknown key".
      // Uniform failure: attackers shouldn't be able to tell
      // "key doesn't exist" from "key exists but expired".
      await expect(resolveIngestionContext(RAW_KEY)).rejects.toThrow(
        "Invalid API key",
      );
    });

    it("rejects key without 'track' permission with 403", async () => {
      vi.mocked(ApiKeyModel.findOne).mockReturnValueOnce(
        mockMongooseFindOne(makeApiKey({ permissions: ["identify"] })) as never,
      );

      await expect(resolveIngestionContext(RAW_KEY)).rejects.toThrow(
        "API key lacks track permission",
      );
    });
  });

  // ────────── Tenant resolution ──────────

  describe("tenant resolution", () => {
    it("rejects missing tenant with uniform 401 message", async () => {
      vi.mocked(ApiKeyModel.findOne).mockReturnValueOnce(
        mockMongooseFindOne(makeApiKey()) as never,
      );
      vi.mocked(TenantModel.findById).mockReturnValueOnce(
        mockMongooseFindById(null) as never,
      );

      await expect(resolveIngestionContext(RAW_KEY)).rejects.toThrow(
        "Invalid API key",
      );
    });

    it.each([["pending_payment"], ["past_due"], ["suspended"], ["trialing"]])(
      "rejects tenant with status '%s' with 403",
      async (status) => {
        vi.mocked(ApiKeyModel.findOne).mockReturnValueOnce(
          mockMongooseFindOne(makeApiKey()) as never,
        );
        vi.mocked(TenantModel.findById).mockReturnValueOnce(
          mockMongooseFindById(makeTenant({ status })) as never,
        );

        await expect(resolveIngestionContext(RAW_KEY)).rejects.toThrow(
          "Tenant is not active",
        );
      },
    );
  });

  // ────────── Context shape ──────────

  describe("context shape", () => {
    it("uses tenant.publicId as tenantId, NOT the Mongo _id", async () => {
      vi.mocked(ApiKeyModel.findOne).mockReturnValueOnce(
        mockMongooseFindOne(makeApiKey()) as never,
      );
      vi.mocked(TenantModel.findById).mockReturnValueOnce(
        mockMongooseFindById(makeTenant()) as never,
      );

      const ctx = await resolveIngestionContext(RAW_KEY);

      // The critical assertion: the value that flows into Postgres
      // must be the portable UUID, not the Mongo ObjectId.
      expect(ctx.tenantId).toBe(PUBLIC_ID);
      expect(ctx.tenantId).not.toBe(tenantObjectId.toString());

      // But the Mongo ID is still available for logging.
      expect(ctx.tenantObjectId).toBe(tenantObjectId);
    });
  });
});
