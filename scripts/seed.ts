import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";

// Models
import Tenant from "@/lib/database/models/tenant.model";
import DashboardUser from "@/lib/database/models/dashboardUser.model";
import Membership from "@/lib/database/models/membership.model";
import ApiKey from "@/lib/database/models/apiKey.model";
import Event from "@/lib/database/models/event.model";
import Dashboard from "@/lib/database/models/dashboard.model";
import Report from "@/lib/database/models/report.model";
import Invitation from "@/lib/database/models/invitation.model";
import { serverConfig } from "@/lib/config";

// ========== Helper: generate API keys ==========
function generateApiKey() {
  const prefix = crypto.randomBytes(8).toString("hex").slice(0, 8);
  const hash = crypto.createHash("sha256").update(prefix).digest("hex");
  return { prefix, hash };
}

// ========== Helper: random events ==========
function generateRandomEvents(
  tenantId: mongoose.Types.ObjectId,
  count: number = 20,
) {
  const events = [];
  const now = new Date();
  const userIds = ["user_001", "user_002", "user_003"];
  const eventNames = ["page_view", "signup", "purchase", "click_button"];

  for (let i = 0; i < count; i++) {
    const daysAgo = Math.floor(Math.random() * 7);
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);
    date.setHours(
      Math.floor(Math.random() * 24),
      Math.floor(Math.random() * 60),
      0,
      0,
    );

    const eventName = eventNames[Math.floor(Math.random() * eventNames.length)];
    const userId = userIds[Math.floor(Math.random() * userIds.length)];

    events.push({
      tenantId,
      userId,
      anonymousId: `anon_${Math.random().toString(36).substring(7)}`,
      sessionId: `session_${Math.random().toString(36).substring(7)}`,
      eventName,
      properties: {
        url: eventName === "purchase" ? "/checkout/success" : "/",
        price:
          eventName === "purchase"
            ? Math.floor(Math.random() * 200) + 10
            : undefined,
        browser: ["Chrome", "Firefox"][Math.floor(Math.random() * 2)],
      },
      timestamp: date,
      ingestedAt: new Date(),
    });
  }
  return events;
}
// ========== Main seed ==========
async function seed() {
  if (process.env.NODE_ENV !== "development") {
    console.error("❌ Seeding only allowed in development");
    process.exit(1);
  }

  await mongoose.connect(serverConfig.DATABASE_URL);
  console.log("📦 Connected to MongoDB");

  // 1. Clear all collections
  console.log("🧹 Clearing existing data...");
  await Promise.all([
    Tenant.deleteMany({}),
    DashboardUser.deleteMany({}),
    Membership.deleteMany({}),
    ApiKey.deleteMany({}),
    Event.deleteMany({}),
    Dashboard.deleteMany({}),
    Report.deleteMany({}),
    Invitation.deleteMany({}),
  ]);
  console.log("✅ Cleared\n");

  // 2. Create global users (no tenantId, no role)
  const passwordHash = await bcrypt.hash("Test123!", 10);

  const [ownerUser, adminUser, analystUser, viewerUser] =
    await DashboardUser.create([
      {
        email: "owner@example.com",
        name: "Workspace Owner",
        passwordHash,
        isActive: true,
      },
      {
        email: "admin@example.com",
        name: "Workspace Admin",
        passwordHash,
        isActive: true,
      },
      {
        email: "analyst@example.com",
        name: "Analyst User",
        passwordHash,
        isActive: true,
      },
      {
        email: "viewer@example.com",
        name: "Viewer User",
        passwordHash,
        isActive: true,
      },
    ]);
  console.log("👥 Created 4 global users");

  // 3. Create a tenant (workspace)
  const tenant = await Tenant.create({
    companyName: "Demo Workspace",
    subdomain: "demo",
    ownerId: ownerUser._id,
    plan: "free",
    status: "active",
    billingEmail: ownerUser.email,
    quotas: {
      monthlyEvents: 100000,
      retentionDays: 30,
      apiRateLimit: 1000,
      seats: 10,
    },
  });
  console.log(
    `🏢 Created tenant: ${tenant.name} (${tenant.subdomain}.localhost:3000)`,
  );

  // 4. Create memberships (user -> tenant + role)
  await Membership.create([
    {
      userId: ownerUser._id,
      tenantId: tenant._id,
      role: "owner",
      isActive: true,
    },
    {
      userId: adminUser._id,
      tenantId: tenant._id,
      role: "admin",
      isActive: true,
    },
    {
      userId: analystUser._id,
      tenantId: tenant._id,
      role: "analyst",
      isActive: true,
    },
    {
      userId: viewerUser._id,
      tenantId: tenant._id,
      role: "viewer",
      isActive: true,
    },
  ]);
  console.log("🔗 Created 4 memberships (owner, admin, analyst, viewer)");

  // 5. API keys for the tenant
  const prodKey = generateApiKey();
  const stagingKey = generateApiKey();
  await ApiKey.create([
    {
      tenantId: tenant._id,
      name: "Production Key",
      keyPrefix: prodKey.prefix,
      keyHash: prodKey.hash,
      permissions: ["track", "identify", "query"],
      isActive: true,
    },
    {
      tenantId: tenant._id,
      name: "Staging Key",
      keyPrefix: stagingKey.prefix,
      keyHash: stagingKey.hash,
      permissions: ["track", "identify"],
      isActive: true,
    },
  ]);
  console.log("🔑 Created 2 API keys");

  // 6. Events
  const events = generateRandomEvents(tenant._id, 25);
  await Event.insertMany(events);
  console.log(`📊 Created ${events.length} random events`);

  // 7. Dashboards (using owner as creator)
  await Dashboard.create([
    {
      tenantId: tenant._id,
      createdBy: ownerUser._id,
      name: "Sales Overview",
      widgets: [
        {
          id: "w1",
          type: "line_chart",
          title: "Daily Purchases",
          query: {
            eventName: "purchase",
            metric: "count",
            groupBy: "day",
            dateRange: "last_7_days",
          },
          position: { x: 0, y: 0, w: 6, h: 4 },
        },
      ],
      isPublic: false,
      sharedWith: [analystUser._id],
    },
    {
      tenantId: tenant._id,
      createdBy: analystUser._id,
      name: "Traffic Sources",
      widgets: [
        {
          id: "w2",
          type: "pie_chart",
          title: "Page Views by Browser",
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
  ]);
  console.log("📈 Created 2 dashboards");

  // 8. Reports (minimal)
  await Report.create([
    {
      tenantId: tenant._id,
      createdBy: analystUser._id,
      name: "High Value Purchases",
      filters: {
        eventName: "purchase",
        conditions: [{ field: "properties.price", operator: "gt", value: 50 }],
        dateRange: "last_30_days",
      },
      schedule: "weekly",
    },
  ]);
  console.log("📑 Created 1 report");

  // 9. Invitation (pending)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  await Invitation.create({
    tenantId: tenant._id,
    invitedBy: ownerUser._id,
    email: "newuser@example.com",
    role: "viewer",
    token: crypto.randomBytes(32).toString("hex"),
    expiresAt,
    status: "pending",
  });
  console.log("✉️ Created 1 invitation");

  console.log("\n🎉 SEED COMPLETED SUCCESSFULLY!");
  console.log("\n🔐 Test Logins (password: Test123!):");
  console.log("   Owner:   owner@example.com   (role: owner)");
  console.log("   Admin:   admin@example.com   (role: admin)");
  console.log("   Analyst: analyst@example.com (role: analyst)");
  console.log("   Viewer:  viewer@example.com  (role: viewer)");
  console.log("\n🌐 Workspace URL:");
  console.log("   http://demo.localhost:3000 (add to /etc/hosts)");
  console.log("\n💡 Tip: Use the subdomain to test multi‑workspace isolation.");

  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
