import Tenant from "@/lib/database/models/tenant.model";

export default async function seedTenants() {
  console.log("📦 Creating tenants...");

  const tenants = await Tenant.create([
    {
      companyName: "Acme Corporation",
      subdomain: "acme",
      plan: "pro",
      status: "active",
      billingEmail: "billing@acme.com",
      stripeCustomerId: "cus_acme_123",
      quotas: {
        monthlyEvents: 1000000,
        retentionDays: 90,
        apiRateLimit: 5000,
        seats: 10,
      },
    },
    {
      companyName: "StartupX",
      subdomain: "startupx",
      plan: "free",
      status: "active",
      billingEmail: "founder@startupx.com",
      quotas: {
        monthlyEvents: 100000,
        retentionDays: 30,
        apiRateLimit: 1000,
        seats: 2,
      },
    },
    {
      companyName: "Beta Inc",
      subdomain: "beta",
      plan: "enterprise",
      status: "trialing",
      billingEmail: "admin@beta.io",
      stripeCustomerId: "cus_beta_789",
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      quotas: {
        monthlyEvents: 10000000,
        retentionDays: 365,
        apiRateLimit: 50000,
        seats: 50,
      },
    },
  ]);

  console.log(`✅ Created ${tenants.length} tenants`);
  return tenants;
}
