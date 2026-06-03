import bcrypt from "bcryptjs";
import DashboardUser from "@/lib/database/models/dashboardUser.model";
import type { ITenant } from "@/lib/database/models/tenant.model";

export default async function seedUsers(tenants: ITenant[]) {
  console.log("👥 Creating dashboard users...");

  const acme = tenants.find((t) => t.subdomain === "acme")!;
  const startupx = tenants.find((t) => t.subdomain === "startupx")!;
  const beta = tenants.find((t) => t.subdomain === "beta")!;

  const passwordHash = await bcrypt.hash("Test123!", 10);

  const users = await DashboardUser.create([
    {
      tenantId: acme._id,
      email: "ceo@acme.com",
      name: "John CEO",
      role: "owner",
      passwordHash,
      isActive: true,
      lastLoginAt: new Date(),
    },
    {
      tenantId: acme._id,
      email: "analyst@acme.com",
      name: "Sarah Analyst",
      role: "analyst",
      passwordHash,
      isActive: true,
    },
    {
      tenantId: acme._id,
      email: "viewer@acme.com",
      name: "Mike Viewer",
      role: "viewer",
      passwordHash,
      isActive: true,
    },
    {
      tenantId: startupx._id,
      email: "founder@startupx.com",
      name: "Alex Founder",
      role: "owner",
      passwordHash,
      isActive: true,
      lastLoginAt: new Date(),
    },
    {
      tenantId: beta._id,
      email: "admin@beta.io",
      name: "Beta Admin",
      role: "admin",
      passwordHash,
      isActive: true,
    },
  ]);

  console.log(`✅ Created ${users.length} dashboard users`);
  return users;
}
