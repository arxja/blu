import mongoose from "mongoose";
import { MongoServerError } from "mongodb";
import { connectDB } from "@/lib/database/mongoose";
import { TenantModel } from "@/lib/database/models/tenant.model";
import { MembershipModel } from "@/lib/database/models/membership.model";
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

  const db = await connectDB();

  let tenant;

  try {
    tenant = await db.transaction(
      async (session) => {
        /*
         * Friendly availability check.
         *
         * The unique index on Tenant.subdomain remains
         * the authoritative concurrency guarantee.
         */
        const existingTenant = await TenantModel.findOne({
          subdomain: input.subdomain,
        })
          .session(session)
          .lean();

        if (existingTenant) {
          throw AppError.conflict("This workspace subdomain is already taken.");
        }

        const [createdTenant] = await TenantModel.create(
          [
            {
              companyName: input.companyName,
              subdomain: input.subdomain,
              ownerId: new mongoose.Types.ObjectId(userId),
              activeMemberCount: 1,
              logoUrl: input.logo || "",
              plan: "free",
              status: "trialing",
              billingEmail: input.billingEmail,
            },
          ],
          { session },
        );

        await MembershipModel.create(
          [
            {
              userId: new mongoose.Types.ObjectId(userId),

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
    /*
     * Two concurrent workspace creations may both pass
     * the availability query. MongoDB's unique index is
     * the final source of truth.
     */
    if (isDuplicateKeyError(error)) {
      throw AppError.conflict("This workspace subdomain is already taken.");
    }

    throw error;
  }

  /*
   * Everything below happens AFTER a successful commit.
   *
   * Audit/cache failures must not roll back an already
   * created workspace.
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
