import Event from "@/lib/database/models/event.model";
import type { ITenant } from "@/lib/database/models/tenant.model";
import { generateRandomEvents } from "./utils";

export default async function seedEvents(tenants: ITenant[]) {
  console.log("📊 Creating events...");

  const acme = tenants.find((t) => t.subdomain === "acme")!;
  const startupx = tenants.find((t) => t.subdomain === "startupx")!;
  const beta = tenants.find((t) => t.subdomain === "beta")!;

  const acmeEvents = generateRandomEvents(acme._id, 30);
  const startupEvents = generateRandomEvents(startupx._id, 15);
  const betaEvents = generateRandomEvents(beta._id, 45);

  await Event.create([...acmeEvents, ...startupEvents, ...betaEvents]);

  const totalEvents =
    acmeEvents.length + startupEvents.length + betaEvents.length;
  console.log(
    `✅ Created ${totalEvents} events (Acme:${acmeEvents.length}, StartupX:${startupEvents.length}, Beta:${betaEvents.length})`,
  );
}
