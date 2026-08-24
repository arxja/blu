import { Redis } from "@upstash/redis";
import { serverConfig } from "@/lib/config";

// Edge-compatible Redis client using Upstash REST API
export const redis = new Redis({
  url: serverConfig.UPSTASH_REDIS_REST_URL,
  token: serverConfig.UPSTASH_REDIS_REST_TOKEN,
});

// Cache TTls (seconds)
export const CACHE_TTL = {
  TENANT: 60 * 60 * 24, // 24 hours
  USER_WORKSPACES: 60 * 5, // 5 minutes (frequent changes)
  MEMBERSHIP_CHECK: 60 * 10, // 10 minutes
};

// ---------- Tenant cache ----------
export type CachedTenantPayload = {
  id: string;
  name: string;
  subdomain: string;
  plan: string;
};

export async function getCachedTenant(subdomain: string) {
  const key = `tenant:subdomain:${subdomain}`;
  return await redis.get<CachedTenantPayload>(key);
}

export async function setCachedTenant(
  subdomain: string,
  data: CachedTenantPayload,
) {
  const key = `tenant:subdomain:${subdomain}`;
  await redis.set(key, data, { ex: CACHE_TTL.TENANT });
}

export async function invalidateTenantCache(subdomain: string) {
  await redis.del(`tenant:subdomain:${subdomain}`);
}

// ---------- User workspaces cache ----------
export type CachedUserWorkspace = {
  id: string;
  name: string;
  slug: string;
  role: string;
  members: number;
  logo: string;
};

export type CachedUserWorkspaces = CachedUserWorkspace[];

export async function getCachedUserWorkspaces(userId: string) {
  const key = `user:workspaces:${userId}`;
  return await redis.get<CachedUserWorkspaces>(key);
}

export async function setCachedUserWorkspaces(
  userId: string,
  data: CachedUserWorkspaces,
) {
  const key = `user:workspaces:${userId}`;
  await redis.set(key, data, { ex: CACHE_TTL.USER_WORKSPACES });
}

export async function invalidateUserWorkspacesCache(userId: string) {
  await redis.del(`user:workspaces:${userId}`);
}

// ---------- Membership check cache ----------
export async function getCachedMembership(userId: string, tenantId: string) {
  const key = `membership:${userId}:${tenantId}`;
  return await redis.get<{ role: string }>(key);
}

export async function setCachedMembership(
  userId: string,
  tenantId: string,
  role: string,
) {
  const key = `membership:${userId}:${tenantId}`;
  await redis.set(key, { role }, { ex: CACHE_TTL.MEMBERSHIP_CHECK });
}

export async function invalidateMembershipCache(
  userId: string,
  tenantId: string,
) {
  await redis.del(`membership:${userId}:${tenantId}`);
}
