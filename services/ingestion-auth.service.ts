import { hashApiKey } from "@/lib/api-keys/generate";
import { PlanId } from "@/lib/constants";
import {
  ApiKeyModel,
  type ApiKeyPermission,
} from "@/lib/database/models/apiKey.model";
import { TenantModel } from "@/lib/database/models/tenant.model";
import { connectDB } from "@/lib/database/mongoose";
import { AppError } from "@/lib/errors";
import {
  getCachedIngestionContext,
  setCachedIngestionContext,
} from "@/lib/redis";
import { Types } from "mongoose";

export interface IngestionContext {
  tenantId: string; // publicId, goes into Postgres
  tenantObjectId: Types.ObjectId; // for logs only
  plan: PlanId;
  apiKeyId: Types.ObjectId;
  permissions: ApiKeyPermission[];
}

export async function resolveIngestionContext(
  rawKey: string,
): Promise<IngestionContext> {
  if (!rawKey || rawKey.length === 0) {
    throw AppError.unauthorized("Invalid API key");
  }

  const keyHash = hashApiKey(rawKey);

  // 1. Cache lookup — no Mongo if hit
  const cached = await getCachedIngestionContext(keyHash);
  if (cached) return cached;

  // 2. API key lookup
  await connectDB();

  const apiKey = await ApiKeyModel.findOne({
    keyHash,
    isActive: true,
  }).lean();

  if (!apiKey) {
    throw AppError.unauthorized("Invalid API key");
  }

  if (apiKey.expiresAt && apiKey.expiresAt.getTime() <= Date.now()) {
    throw AppError.unauthorized("Invalid API key");
  }

  if (!apiKey.permissions.includes("track")) {
    throw AppError.forbidden("API key lacks track permission");
  }

  // 3. Tenant lookup
  const tenant = await TenantModel.findById(apiKey.tenantId).lean();

  if (!tenant) {
    throw AppError.unauthorized("Invalid API key");
  }

  if (tenant.status !== "active") {
    throw AppError.forbidden("Tenant is not active");
  }

  // 4. Build the resolved context
  const context: IngestionContext = {
    tenantId: tenant.publicId,
    tenantObjectId: tenant._id,
    plan: tenant.plan,
    apiKeyId: apiKey._id,
    permissions: apiKey.permissions,
  };

  // 5. Cache for next time
  await setCachedIngestionContext(keyHash, context);

  return context;
}
