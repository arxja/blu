import type { Types } from "mongoose";
import type { AuditAction } from "./actions";

export const AuditResourceTypes = [
  "workspace",
  "membership",
  "api_key",
  "billing",
  "settings",
] as const;

export type AuditResourceType = (typeof AuditResourceTypes)[number];

export interface AuditEventInput {
  tenantId: Types.ObjectId | string;
  actorId?: Types.ObjectId | string;
  action: AuditAction;
  resourceType: AuditResourceType;
  resourceId?: Types.ObjectId | string;
  metadata?: Record<string, unknown>;
  requestId?: string;
}
