import Dashboard from "@/lib/database/models/dashboard.model";
import type { ITenant } from "@/lib/database/models/tenant.model";
import type { IDashboardUser } from "@/lib/database/models/dashboardUser.model";

export default async function seedDashboards(
  tenants: ITenant[],
  users: IDashboardUser[],
) {
  console.log("📈 Creating dashboards...");

  const acme = tenants.find((t) => t.subdomain === "acme")!;
  const startupx = tenants.find((t) => t.subdomain === "startupx")!;

  const ceo = users.find((u) => u.email === "ceo@acme.com")!;
  const analyst = users.find((u) => u.email === "analyst@acme.com")!;
  const founder = users.find((u) => u.email === "founder@startupx.com")!;

  await Dashboard.create([
    {
      tenantId: acme._id,
      createdBy: ceo._id,
      name: "Sales Dashboard",
      widgets: [
        {
          id: "widget_1",
          type: "line_chart",
          title: "Daily Sales",
          query: {
            eventName: "purchase",
            metric: "sum",
            field: "properties.price",
            groupBy: "day",
            dateRange: "last_30_days",
          },
          position: { x: 0, y: 0, w: 6, h: 4 },
        },
        {
          id: "widget_2",
          type: "bar_chart",
          title: "Purchases by Day",
          query: {
            eventName: "purchase",
            metric: "count",
            groupBy: "day",
            dateRange: "last_7_days",
          },
          position: { x: 6, y: 0, w: 6, h: 4 },
        },
      ],
      isPublic: false,
      sharedWith: [analyst._id],
    },
    {
      tenantId: acme._id,
      createdBy: analyst._id,
      name: "Traffic Overview",
      widgets: [
        {
          id: "widget_1",
          type: "pie_chart",
          title: "Traffic Sources",
          query: {
            eventName: "page_view",
            metric: "count",
            groupBy: "day",
            dateRange: "last_7_days",
          },
          position: { x: 0, y: 0, w: 12, h: 4 },
        },
      ],
      isPublic: true,
      sharedWith: [],
    },
    {
      tenantId: startupx._id,
      createdBy: founder._id,
      name: "Startup Metrics",
      widgets: [
        {
          id: "widget_1",
          type: "line_chart",
          title: "User Signups",
          query: {
            eventName: "signup",
            metric: "count",
            groupBy: "day",
            dateRange: "last_14_days",
          },
          position: { x: 0, y: 0, w: 12, h: 4 },
        },
      ],
      isPublic: false,
      sharedWith: [],
    },
  ]);

  console.log("✅ Created 3 dashboards");
}
