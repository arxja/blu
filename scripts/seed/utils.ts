import mongoose from "mongoose";
import Tenant from "@/lib/database/models/tenant.model";
import DashboardUser from "@/lib/database/models/dashboardUser.model";
import ApiKey from "@/lib/database/models/apiKey.model";
import Event from "@/lib/database/models/event.model";
import Dashboard from "@/lib/database/models/dashboard.model";
import Report from "@/lib/database/models/report.model";
import Invitation from "@/lib/database/models/invitation.model";

export async function clearDatabase() {
  console.log("🧹 Clearing existing data...");
  await Promise.all([
    Tenant.deleteMany({}),
    DashboardUser.deleteMany({}),
    ApiKey.deleteMany({}),
    Event.deleteMany({}),
    Dashboard.deleteMany({}),
    Report.deleteMany({}),
    Invitation.deleteMany({}),
  ]);
  console.log("✅ Cleared existing data\n");
}

export function generateRandomEvents(
  tenantId: mongoose.Types.ObjectId,
  daysBack: number,
) {
  const events = [];
  const now = new Date();
  const userIds = ["user_001", "user_002", "user_003", "user_004", "user_005"];
  const eventNames = [
    "page_view",
    "signup",
    "purchase",
    "click_button",
    "view_pricing",
  ];

  for (let i = 0; i < daysBack; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    const eventsPerDay = Math.floor(Math.random() * 30) + 20;

    for (let j = 0; j < eventsPerDay; j++) {
      const hour = Math.floor(Math.random() * 24);
      const minute = Math.floor(Math.random() * 60);
      const eventDate = new Date(date);
      eventDate.setHours(hour, minute, 0, 0);

      const eventName =
        eventNames[Math.floor(Math.random() * eventNames.length)];
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
          referrer: Math.random() > 0.5 ? "https://google.com" : "direct",
          browser: ["Chrome", "Firefox", "Safari"][
            Math.floor(Math.random() * 3)
          ],
        },
        timestamp: eventDate,
        ingestedAt: new Date(),
        ip: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        userAgent: "Mozilla/5.0 (Macintosh)",
      });
    }
  }

  return events;
}
