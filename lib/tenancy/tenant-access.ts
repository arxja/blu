import { Types } from "mongoose";

import { connectDB } from "@/lib/database/mongoose";
import Tenant from "@/lib/database/models/tenant.model";
import Membership from "@/lib/database/models/membership.model";
import { AppError } from "@/lib/errors";

export async function authorizeTenantAccess(userId: string, tenantId: string) {
  if (!Types.ObjectId.isValid(userId)) {
    throw AppError.unauthorized();
  }

  if (!Types.ObjectId.isValid(tenantId)) {
    throw AppError.badRequest("Invalid workspace ID.");
  }

  await connectDB();

  const tenant = await Tenant.findById(tenantId).exec();

  if (!tenant) {
    throw AppError.notFound("Workspace not found.");
  }

  if (tenant.status === "suspended") {
    throw AppError.forbidden("This workspace has been suspended.");
  }

  const membership = await Membership.findOne({
    userId,
    tenantId: tenant._id,
    isActive: true,
  }).exec();

  if (!membership) {
    throw AppError.forbidden("You do not have access to this workspace.");
  }

  return {
    tenant,
    membership,
  };
}
