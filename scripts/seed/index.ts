import { connectDB } from "@/lib/database/mongoose";
import { clearDatabase } from "./utils";
import seedUsers from "./users";
import seedApiKeys from "./apiKeys";
import seedDashboards from "./dashboards";
import seedReports from "./reports";
import seedInvitations from "./invitations";
import seedTenants from "./tenants";
import seedEvents from "./events";
import { serverConfig } from "`@/lib/config`";

async function seed() {
  try {
    if (serverConfig.NODE_ENV !== "development") {
      throw new Error("Seeding is only allowed in development environment.");
    }
    await connectDB();
    console.log("📦 Starting database seed...\n");

    // Clear existing data
    await clearDatabase();

    // Seed in order (maintains referential integrity)
    const tenants = await seedTenants();
    const users = await seedUsers(tenants);
    const apiKeys = await seedApiKeys(tenants);
    await seedEvents(tenants);
    await seedDashboards(tenants, users);
    await seedReports(tenants, users);
    await seedInvitations(tenants, users);

    console.log("\n🎉 SEED COMPLETED SUCCESSFULLY!");
    console.log("\n🔐 Test Logins:");
    console.log("   (Use the seeded default password from local setup docs)");
    console.log("   Acme CEO:     ceo@acme.com");
    console.log("   Acme Analyst: analyst@acme.com");
    console.log("   Acme Viewer:  viewer@acme.com");
    console.log("   StartupX:     founder@startupx.com");
    console.log("   Beta Inc:     admin@beta.io");

    console.log("\n🌐 Subdomains:");
    console.log("   http://acme.localhost:3000");
    console.log("   http://startupx.localhost:3000");
    console.log("   http://beta.localhost:3000");

    process.exit(0);
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  }
}

seed();
