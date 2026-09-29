import { createHash, randomBytes } from "node:crypto";

export interface GeneratedApiKey {
  fullKey: string;
  keyPrefix: string;
  keyHash: string;
}

const PREFIX = "blu_";

/**
 * Generates a new API key.
 *
 * - fullKey:    returned to the caller ONCE. Never store it, never log it.
 * - keyPrefix:  display-only. Safe to log and show in the UI.
 * - keyHash:    stored in ApiKeyModel.keyHash. Used for lookups.
 *
 * TODO: consider HMAC pepper for defense-in-depth.
 */
export function generateApiKey(): GeneratedApiKey {
  const random = randomBytes(32).toString("hex"); // 64 chars, [0-9a-f] only
  const fullKey = PREFIX + random;
  const keyPrefix = fullKey.slice(0, 12);
  const keyHash = hashApiKey(fullKey);
  return { fullKey, keyPrefix, keyHash }; // fullKey shown to user ONCE
}
export function hashApiKey(rawKey: string): string {
  return createHash("sha256").update(rawKey).digest("hex");
}
