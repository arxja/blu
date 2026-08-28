import mongoose from "mongoose";
import type { AuditAction } from "@/lib/audit/actions";

export type AuditResourceType =
  | "workspace"
  | "membership"
  | "api_key"
  | "billing"
  | "settings";

export interface AuditEventInput {
  tenantId: mongoose.Types.ObjectId | string;

  /**
   * The authenticated Blu user who caused the action.
   *
   * Optional because future system/background actions may not
   * have a human actor.
   */
  actorId?: mongoose.Types.ObjectId | string;

  action: AuditAction;

  resourceType: AuditResourceType;

  resourceId?: mongoose.Types.ObjectId | string;

  /**
   * Small, non-sensitive contextual information.
   *
   * Do not store passwords, tokens, API keys, payment details,
   * or arbitrary request bodies here.
   */
  metadata?: Record<string, unknown>;

  requestId?: string;
}
