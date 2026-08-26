import type mongoose from "mongoose";
import type { IDashboardUser } from "@/lib/database/models/dashboardUser.model";
import type { ITenant } from "@/lib/database/models/tenant.model";
import type { IMembership } from "@/lib/database/models/membership.model";

export interface TenantContext {
  user: IDashboardUser;
  tenant: ITenant;
  membership: IMembership;
}

export type TenantRole = IMembership["role"];

export type TenantPermission =
  | "tenant:read"
  | "tenant:update"
  | "members:read"
  | "members:write"
  | "billing:read"
  | "billing:write"
  | "analytics:read"
  | "analytics:write";
