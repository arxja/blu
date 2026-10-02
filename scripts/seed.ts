import bcrypt from "bcryptjs";
import crypto from "crypto";
import { randomUUID } from "node:crypto";

// Mongo Models
import { TenantModel } from "@/lib/database/models/tenant.model";
import { MembershipModel } from "@/lib/database/models/membership.model";
import { ReportModel } from "@/lib/database/models/report.model";
import { InvitationModel } from "@/lib/database/models/invitation.model";
import { connectDB } from "@/lib/database/mongoose";
import { getTenantUrl } from "@/lib/tenancy/hostname";
import { ApiKeyModel } from "@/lib/database/models/apiKey.model";
import { DashboardModel } from "@/lib/database/models/dashboard.model";
import { DashboardUserModel } from "@/lib/database/models/dashboard-user.model";
import { generateApiKey } from "@/lib/api-keys/generate";

// Postgres (Drizzle) — direct client for wipe; repo for insertion
import { db } from "@/lib/database/postgres/client";
import { events } from "@/lib/database/postgres/schema";
import { eventsRepo } from "@/lib/database/postgres/repositories/events.repo";
import type { EventInput } from "@/lib/database/postgres/types";

// ========== Helper: random Postgres events (wire shape) ==========
//
// Returns EventInput[] — the SDK wire shape. The repository's
// insertBatch() maps it to the DB shape (event -> eventName,
// ISO string -> Date, etc.).
//
// Timestamps are within the last 7 days to respect the free tier
// retention window and stay inside the timestamp validation rules.

function generateRandomPostgresEvents(count: number = 25): EventInput[] {
  const rows: EventInput[] = [];
  const now = new Date();

  const userIds = ["user_001", "user_002", "user_003"];
  const groupIds = ["group_alpha", "group_beta"];
  const eventNames = ["page_view", "signup", "purchase", "click_button"];
  const browsers = ["Chrome", "Firefox"];

  for (let i = 0; i < count; i++) {
    const daysAgo = Math.floor(Math.random() * 7);
    const timestamp = new Date(now);
    timestamp.setDate(timestamp.getDate() - daysAgo);
    timestamp.setHours(
      Math.floor(Math.random() * 24),
      Math.floor(Math.random() * 60),
      0,
      0,
    );

    const event = eventNames[Math.floor(Math.random() * eventNames.length)];
    const browser = browsers[Math.floor(Math.random() * browsers.length)];

    // ~25% anonymous-only (pre-login), rest identified.
    const isAnonymous = Math.random() < 0.25;
    const userId = isAnonymous
      ? undefined
      : userIds[Math.floor(Math.random() * userIds.length)];
    const anonymousId = isAnonymous
      ? `anon_${Math.random().toString(36).substring(2, 9)}`
      : undefined;

    const groupId =
      Math.random() < 0.3
        ? groupIds[Math.floor(Math.random() * groupIds.length)]
        : undefined;

    rows.push({
      eventId: randomUUID(),
      event,
      userId,
      anonymousId,
      groupId,
      timestamp: timestamp.toISOString(),
      properties: {
        url: event === "purchase" ? "/checkout/success" : "/",
        ...(event === "purchase" && {
          price: Math.floor(Math.random() * 200) + 10,
        }),
      },
      context: {
        browser,
        sessionId: `session_${Math.random().toString(36).substring(2, 9)}`,
      },
    });
  }

  return rows;
}

// ========== Main seed ==========
async function seed() {
  if (process.env.NODE_ENV !== "development") {
    console.error("❌ Seeding only allowed in development");
    process.exit(1);
  }

  // MongoDB connection
  try {
    await connectDB();
    console.log("📦 Connected to MongoDB");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const databaseUrl = process.env.DATABASE_URL || "<not set>";
    const sanitizedUrl = databaseUrl.includes("@")
      ? (() => {
          const [prefix, suffix] = databaseUrl.split("://");
          const [, rest] = (suffix ?? "").split("@");
          return `${prefix}://***:***@${rest ?? ""}`;
        })()
      : databaseUrl;

    console.error("❌ MongoDB connection failed.");
    console.error(
      "This usually means the configured Atlas/remote cluster is unreachable from this machine or not allowed by network access.",
    );
    console.error(
      "For local development, start MongoDB and set DATABASE_URL=mongodb://127.0.0.1:27017/Blu",
    );
    console.error(`Configured DATABASE_URL: ${sanitizedUrl}`);
    console.error(message);
    process.exit(1);
  }

  // 1. Clear all collections + Postgres events table
  console.log("🧹 Clearing existing data...");
  await Promise.all([
    TenantModel.deleteMany({}),
    DashboardUserModel.deleteMany({}),
    MembershipModel.deleteMany({}),
    ApiKeyModel.deleteMany({}),
    DashboardModel.deleteMany({}),
    ReportModel.deleteMany({}),
    InvitationModel.deleteMany({}),
    db.delete(events),
  ]);
  console.log("✅ Cleared\n");

  // 2. Create global users (no tenantId, no role)
  const passwordHash = await bcrypt.hash("Test12341234", 10);

  const [ownerUser, adminUser, analystUser, viewerUser, soloUser] =
    await DashboardUserModel.create([
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
      {
        email: "solo@example.com",
        name: "Solo Workspace Owner",
        passwordHash,
        isActive: true,
      },
    ]);
  console.log("👥 Created 5 global users");

  // 3. Create demo tenant (workspace)
  const tenant = await TenantModel.create({
    companyName: "Demo Workspace",
    subdomain: "demo",
    ownerId: ownerUser._id,
    activeMemberCount: 4,
    logoUrl: "",
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
    `🏢 Created tenant: ${tenant.companyName} (${tenant.subdomain}.localhost:3000)`,
  );

  // 3b. Second workspace with a single user for membership testing
  const soloTenant = await TenantModel.create({
    companyName: "Membership Test Workspace",
    subdomain: "membership-test",
    ownerId: soloUser._id,
    activeMemberCount: 1,
    logoUrl: "",
    plan: "free",
    status: "active",
    billingEmail: soloUser.email,
    quotas: {
      monthlyEvents: 5000,
      retentionDays: 30,
      apiRateLimit: 200,
      seats: 1,
    },
  });
  console.log(
    `🏢 Created tenant: ${soloTenant.companyName} (${soloTenant.subdomain}.localhost:3000)`,
  );

  // 4. Memberships (user -> tenant + role)
  await MembershipModel.create([
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
    {
      userId: soloUser._id,
      tenantId: soloTenant._id,
      role: "owner",
      isActive: true,
    },
  ]);
  console.log(
    "🔗 Created 5 memberships (demo workspace + single-user membership test workspace)",
  );

  // 5. API keys for the tenant
  const prodKey = generateApiKey();
  const stagingKey = generateApiKey();
  await ApiKeyModel.create([
    {
      tenantId: tenant._id,
      name: "Production Key",
      keyPrefix: prodKey.keyPrefix,
      keyHash: prodKey.keyHash,
      permissions: ["track", "identify", "query"],
      isActive: true,
    },
    {
      tenantId: tenant._id,
      name: "Staging Key",
      keyPrefix: stagingKey.keyPrefix,
      keyHash: stagingKey.keyHash,
      permissions: ["track", "identify"],
      isActive: true,
    },
  ]);
  console.log("🔑 Created 2 API keys");

  // 6. Events (Postgres)
  //
  // Use tenant.publicId (the UUID added in Phase 3.5) — NOT
  // tenant._id (a Mongo ObjectId string, which Postgres will
  // reject since the column is uuid).
  const eventRows = generateRandomPostgresEvents(25);
  const insertResult = await eventsRepo.insertBatch(tenant.publicId, eventRows);
  console.log(`📊 Created ${insertResult.inserted} random events (Postgres)`);

  // 7. Dashboards (using owner as creator)
  await DashboardModel.create([
    {
      tenantId: tenant._id,
      createdBy: ownerUser._id.toString(),
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
      sharedWith: [analystUser._id.toString()],
    },
    {
      tenantId: tenant._id,
      createdBy: analystUser._id.toString(),
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
  await ReportModel.create([
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
  await InvitationModel.create({
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
  console.log("\n🔐 Test Logins (password: Test12341234):");
  console.log("   Owner:   owner@example.com   (role: owner)");
  console.log("   Admin:   admin@example.com   (role: admin)");
  console.log("   Analyst: analyst@example.com (role: analyst)");
  console.log("   Viewer:  viewer@example.com  (role: viewer)");
  console.log(
    "   Solo:    solo@example.com    (role: owner, single-user workspace)",
  );
  console.log("\n🌐 Workspace URLs:");
  console.log(`   ${getTenantUrl(tenant.subdomain)}`);
  console.log(`   ${getTenantUrl(soloTenant.subdomain)}`);
  console.log("\n🔑 API Keys (save these, shown once):");
  console.log(`   Production: ${prodKey.fullKey}`);
  console.log(`   Staging:    ${stagingKey.fullKey}`);
  console.log(
    "\n💡 Tip: Use the subdomain to test multi‑workspace isolation and membership logic.",
  );

  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
