import mongoose from "mongoose";
import { MongoServerError } from "mongodb";

import { connectDB } from "@/lib/database/mongoose";
import Tenant from "@/lib/database/models/tenant.model";
import Membership from "@/lib/database/models/membership.model";
import DashboardUserModel from "@/lib/database/models/dashboard-user.model";

import { AppError } from "@/lib/errors";
import {
  createWorkspaceSchema,
  type CreateWorkspaceInput,
} from "@/lib/validations/workspace";

import { AuditActions } from "@/lib/audit/actions";
import { invalidateUserWorkspacesCache } from "@/lib/redis";
import { recordAuditEvent } from "@/services/audit.service";
import { logger } from "@/lib/logger";

function isDuplicateKeyError(error: unknown): boolean {
  return error instanceof MongoServerError && error.code === 11000;
}

export async function createWorkspace(
  userId: string,
  rawInput: CreateWorkspaceInput,
) {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw AppError.unauthorized();
  }

  const parsed = createWorkspaceSchema.safeParse(rawInput);

  if (!parsed.success) {
    throw AppError.badRequest(
      "Invalid workspace information.",
      parsed.error.flatten().fieldErrors,
    );
  }

  const input = parsed.data;
  const userObjectId = new mongoose.Types.ObjectId(userId);

  /*
   * Enterprise is currently not a self-service provisioning path.
   * The plan can be displayed in the wizard, but actual Enterprise
   * provisioning will come through the future sales flow.
   */
  if (input.plan === "enterprise") {
    throw AppError.badRequest(
      "Enterprise workspaces require contacting sales.",
    );
  }

  const tenantStatus = input.plan === "free" ? "active" : "trialing";

  const db = await connectDB();

  let tenant;

  try {
    tenant = await db.transaction(
      async (session) => {
        /*
         * The subdomain is globally unique, so this check belongs
         * inside the transaction as close as possible to creation.
         */
        const existingTenant = await Tenant.findOne({
          subdomain: input.subdomain,
        })
          .session(session)
          .lean();

        if (existingTenant) {
          throw AppError.conflict("This workspace subdomain is already taken.");
        }

        /*
         * Free workspace allowance is an account-level rule.
         * Paid workspaces do not consume it.
         */
        if (input.plan === "free") {
          const dashboardUser = await DashboardUserModel.findById(userObjectId)
            .select({ freeWorkspaceLimit: 1 })
            .session(session)
            .lean();

          if (!dashboardUser) {
            throw AppError.unauthorized();
          }

          /*
           * Legacy users may not have the field persisted yet.
           * Fall back to the current platform default.
           */
          const freeWorkspaceLimit = dashboardUser.freeWorkspaceLimit ?? 1;

          const freeWorkspaceCount = await Tenant.countDocuments({
            ownerId: userObjectId,
            plan: "free",
          }).session(session);

          if (freeWorkspaceCount >= freeWorkspaceLimit) {
            throw AppError.conflict(
              "You have reached your free workspace limit.",
            );
          }
        }

        const [createdTenant] = await Tenant.create(
          [
            {
              companyName: input.companyName,
              subdomain: input.subdomain,
              ownerId: userObjectId,
              activeMemberCount: 1,
              logoUrl: input.logo || undefined,
              plan: input.plan,
              status: tenantStatus,
              billingEmail: input.billingEmail,
              quotas: {},
            },
          ],
          { session },
        );

        await Membership.create(
          [
            {
              userId: userObjectId,
              tenantId: createdTenant._id,
              role: "owner",
              isActive: true,
              joinedAt: new Date(),
            },
          ],
          { session },
        );

        return createdTenant;
      },
      {
        readPreference: "primary",
      },
    );
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw AppError.conflict("This workspace subdomain is already taken.");
    }

    throw error;
  }

  /*
   * These are post-commit side effects.
   * They must not roll back an already successful workspace creation.
   */
  try {
    await recordAuditEvent({
      tenantId: tenant._id,
      actorId: userId,
      action: AuditActions.WORKSPACE_CREATED,
      resourceType: "workspace",
      resourceId: tenant._id,
      metadata: {
        subdomain: tenant.subdomain,
        plan: tenant.plan,
        status: tenant.status,
      },
    });
  } catch (error) {
    logger.error(
      {
        tenantId: tenant._id.toString(),
        userId,
        error,
      },
      "Workspace created but audit logging failed",
    );
  }

  try {
    await invalidateUserWorkspacesCache(userId);
  } catch (error) {
    logger.error(
      {
        tenantId: tenant._id.toString(),
        userId,
        error,
      },
      "Workspace created but workspace cache invalidation failed",
    );
  }

  return tenant;
}
