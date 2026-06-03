import crypto from "crypto";
import Invitation from "@/lib/database/models/invitation.model";
import type { ITenant } from "@/lib/database/models/tenant.model";
import type { IDashboardUser } from "@/lib/database/models/dashboardUser.model";

export default async function seedInvitations(
  tenants: ITenant[],
  users: IDashboardUser[],
) {
  console.log("✉️ Creating invitations...");

  const acme = tenants.find((t) => t.subdomain === "acme")!;
  const startupx = tenants.find((t) => t.subdomain === "startupx")!;

  const ceo = users.find((u) => u.email === "ceo@acme.com")!;
  const founder = users.find((u) => u.email === "founder@startupx.com")!;

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await Invitation.create([
    {
      tenantId: acme._id,
      invitedBy: ceo._id,
      email: "new-analyst@acme.com",
      role: "analyst",
      token: crypto.randomBytes(32).toString("hex"),
      expiresAt,
      status: "pending",
    },
    {
      tenantId: startupx._id,
      invitedBy: founder._id,
      email: "marketing@startupx.com",
      role: "viewer",
      token: crypto.randomBytes(32).toString("hex"),
      expiresAt,
      status: "pending",
    },
  ]);

  console.log("✅ Created 2 invitations");
}
