import crypto from "crypto";
import ApiKey from "@/lib/database/models/apiKey.model";
import type { ITenant } from "@/lib/database/models/tenant.model";

function generateApiKey() {
  const prefix = crypto.randomBytes(8).toString("hex");
  const hash = crypto.createHash("sha256").update(prefix).digest("hex");
  return { prefix: prefix.slice(0, 8), hash };
}

export default async function seedApiKeys(tenants: ITenant[]) {
  console.log("🔑 Creating API keys...");

  const acme = tenants.find((t) => t.subdomain === "acme")!;
  const startupx = tenants.find((t) => t.subdomain === "startupx")!;
  const beta = tenants.find((t) => t.subdomain === "beta")!;

  const acmeKey = generateApiKey();
  const acmeStagingKey = generateApiKey();
  const startupKey = generateApiKey();
  const betaKey = generateApiKey();

  await ApiKey.create([
    {
      tenantId: acme._id,
      name: "Acme Production",
      keyPrefix: acmeKey.prefix,
      keyHash: acmeKey.hash,
      permissions: ["track", "identify", "query"],
      isActive: true,
    },
    {
      tenantId: acme._id,
      name: "Acme Staging",
      keyPrefix: acmeStagingKey.prefix,
      keyHash: acmeStagingKey.hash,
      permissions: ["track", "identify"],
      isActive: true,
    },
    {
      tenantId: startupx._id,
      name: "StartupX Prod",
      keyPrefix: startupKey.prefix,
      keyHash: startupKey.hash,
      permissions: ["track", "identify"],
      isActive: true,
    },
    {
      tenantId: beta._id,
      name: "Beta API Key",
      keyPrefix: betaKey.prefix,
      keyHash: betaKey.hash,
      permissions: ["track", "identify", "query"],
      isActive: true,
    },
  ]);

  console.log(`✅ Created API keys`);
}
