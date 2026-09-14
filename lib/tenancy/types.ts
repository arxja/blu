import type { Tenant } from "@/lib/database/models/tenant.model";
import { DashboardUser } from "../database/models/dashboard-user.model";
import { Membership } from "../database/models/membership.model";

export interface TenantContext {
  user: DashboardUser;
  tenant: Tenant;
  membership: Membership;
}

export const TenantRoles = ["owner", "admin", "analyst", "viewer"] as const;
export type TenantRole = (typeof TenantRoles)[number];

export const InvitableRoles = ["admin", "analyst", "viewer"] as const;
export type InvitableRole = (typeof InvitableRoles)[number];

export type TenantPermission =
  | "tenant:read"
  | "tenant:update"
  | "members:read"
  | "members:write"
  | "billing:read"
  | "billing:write"
  | "analytics:read"
  | "analytics:write";

