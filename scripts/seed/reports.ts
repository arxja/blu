import Report from "@/lib/database/models/report.model";
import type { ITenant } from "@/lib/database/models/tenant.model";
import type { IDashboardUser } from "@/lib/database/models/dashboardUser.model";

export default async function seedReports(
  tenants: ITenant[],
  users: IDashboardUser[],
) {
  console.log("📑 Creating reports...");

  const acme = tenants.find((t) => t.subdomain === "acme")!;
  const startupx = tenants.find((t) => t.subdomain === "startupx")!;

  const ceo = users.find((u) => u.email === "ceo@acme.com")!;
  const analyst = users.find((u) => u.email === "analyst@acme.com")!;
  const founder = users.find((u) => u.email === "founder@startupx.com")!;

  await Report.create([
    {
      tenantId: acme._id,
      createdBy: analyst._id,
      name: "High Value Customers",
      description: "Users who spent more than $100",
      filters: {
        eventName: "purchase",
        conditions: [{ field: "properties.price", operator: "gt", value: 100 }],
        dateRange: "last_30_days",
      },
      schedule: "weekly",
      lastRunAt: new Date(),
    },
    {
      tenantId: acme._id,
      createdBy: ceo._id,
      name: "Weekly Conversion Report",
      description: "Signup to purchase conversion",
      filters: {
        eventName: "purchase",
        conditions: [],
        dateRange: "last_7_days",
      },
      schedule: "daily",
    },
    {
      tenantId: startupx._id,
      createdBy: founder._id,
      name: "User Activity Report",
      filters: {
        eventName: "page_view",
        conditions: [],
        dateRange: "last_7_days",
      },
      schedule: "manual",
    },
  ]);

  console.log("✅ Created 3 reports");
}
