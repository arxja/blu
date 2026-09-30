// @vitest-environment node

import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { Types } from "mongoose";

import { generateApiKey } from "@/lib/api-keys/generate";
import {
  ApiKeyModel,
  type ApiKeyPermission,
} from "@/lib/database/models/apiKey.model";
import {
  TenantModel,
  type TenantQuotas,
} from "@/lib/database/models/tenant.model";
import { TenantUsageModel } from "@/lib/database/models/tenant-usage.model";
import type { TenantPlan, TenantStatus } from "@/lib/tenancy/plan";
import { POST as ingestHandler } from "@/app/api/ingest/route";
import { eventsRepo } from "@/lib/database/postgres/repositories/events.repo";
import type { BluEventInput } from "@/lib/validations/ingestion";

// ─────────────────────────────────────────────────────────────────
// Fixture: create a real tenant + real API key.
//
// Each call returns a fresh tenant with a unique subdomain and a
// fresh API key whose hash is what the ingestion service will find.
// The full key is only available from this call — same contract as
// the seed.
// ─────────────────────────────────────────────────────────────────

interface TestTenantOverrides {
  status?: TenantStatus;
  plan?: TenantPlan;
  quotas?: TenantQuotas;
  keyActive?: boolean;
  keyExpiresAt?: Date;
  keyPermissions?: ApiKeyPermission[];
}

export interface TestTenant {
  tenantId: Types.ObjectId;
  publicId: string;
  subdomain: string;
  apiKey: string; // the raw, unhashed key — only for tests
}

export async function createTestTenant(
  overrides: TestTenantOverrides = {},
): Promise<TestTenant> {
  const subdomain = `test-${randomUUID().slice(0, 8)}`;

  const tenant = await TenantModel.create({
    companyName: "Test Workspace",
    subdomain,
    ownerId: new Types.ObjectId(),
    plan: overrides.plan ?? "free",
    status: overrides.status ?? "active",
    billingEmail: `${subdomain}@example.com`,
    quotas: overrides.quotas ?? {},
  });

  const { fullKey, keyPrefix, keyHash } = generateApiKey();

  await ApiKeyModel.create({
    tenantId: tenant._id,
    name: "Test Key",
    keyPrefix,
    keyHash,
    permissions: overrides.keyPermissions ?? ["track", "identify"],
    isActive: overrides.keyActive ?? true,
    expiresAt: overrides.keyExpiresAt,
  });

  return {
    tenantId: tenant._id,
    publicId: tenant.publicId,
    subdomain,
    apiKey: fullKey,
  };
}

// ─────────────────────────────────────────────────────────────────
// Cleanup — removes every artifact a test created.
// ─────────────────────────────────────────────────────────────────

export async function cleanupTestTenant(tenantId: Types.ObjectId) {
  await Promise.all([
    ApiKeyModel.deleteMany({ tenantId }),
    TenantUsageModel.deleteMany({ tenantId }),
    TenantModel.deleteOne({ _id: tenantId }),
  ]);
}

// ─────────────────────────────────────────────────────────────────
// Event factory — a valid BluEvent with sensible defaults.
// ─────────────────────────────────────────────────────────────────

export function makeEvent(
  overrides: Partial<BluEventInput> = {},
): BluEventInput {
  return {
    eventId: randomUUID(),
    event: "test_event",
    timestamp: new Date().toISOString(),
    properties: { source: "integration-test" },
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────
// In-process HTTP caller.
//
// Constructs a NextRequest, calls the route handler directly, and
// returns both the status and the parsed body. Mirrors what a real
// HTTP client sees without needing a running server.
// ─────────────────────────────────────────────────────────────────

export interface IngestCallResult {
  status: number;
  body: unknown;
}

export async function callIngest(options: {
  apiKey?: string;
  body: unknown;
  contentLength?: number; // override header for oversized-payload tests
}): Promise<IngestCallResult> {
  const headers = new Headers({
    "Content-Type": "application/json",
  });

  if (options.apiKey !== undefined) {
    headers.set("X-API-Key", options.apiKey);
  }

  if (options.contentLength !== undefined) {
    headers.set("Content-Length", String(options.contentLength));
  }

  const req = new NextRequest("http://localhost/api/ingest", {
    method: "POST",
    headers,
    body: JSON.stringify(options.body),
  });

  const res = await ingestHandler(req);
  const body = await res.json();

  return { status: res.status, body };
}

// ─────────────────────────────────────────────────────────────────
// Postgres side-effect helper — read a tenant's events via the repo.
// ─────────────────────────────────────────────────────────────────

export function readTenantEvents(publicId: string) {
  return eventsRepo.findByTenant(publicId, {
    from: new Date(Date.now() - 60_000),
    to: new Date(Date.now() + 60_000),
  });
}
