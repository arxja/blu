import { Types } from "mongoose";

import { connectDB } from "@/lib/database/mongoose";
import { TenantModel } from "@/lib/database/models/tenant.model";
import { MembershipModel } from "@/lib/database/models/membership.model";
import { AppError } from "@/lib/errors";

export async function authorizeTenantAccess(userId: string, tenantId: string) {
  if (!Types.ObjectId.isValid(userId)) {
    throw AppError.unauthorized();
  }

  if (!Types.ObjectId.isValid(tenantId)) {
    throw AppError.badRequest("Invalid workspace ID.");
  }

  await connectDB();

  const tenant = await TenantModel.findById(tenantId).exec();

  if (!tenant) {
    throw AppError.notFound("Workspace not found.");
  }

  if (tenant.status !== "active") {
    throw AppError.forbidden("This workspace has been suspended.");
  }

  const membership = await MembershipModel.findOne({
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

export async function authorizeTenantBillingAccess(
  userId: string,
  tenantId: string,
) {
  const { tenant, membership } = await getTenantMembership(userId, tenantId);

  if (!["active", "pending_payment", "past_due"].includes(tenant.status)) {
    throw AppError.forbidden("Billing is unavailable for this workspace.");
  }

  if (!["owner", "admin"].includes(membership.role)) {
    throw AppError.forbidden(
      "You do not have permission to manage billing for this workspace.",
    );
  }

  return {
    tenant,
    membership,
  };
}

async function getTenantMembership(userId: string, tenantId: string) {
  if (!Types.ObjectId.isValid(userId)) {
    throw AppError.unauthorized();
  }

  if (!Types.ObjectId.isValid(tenantId)) {
    throw AppError.badRequest("Invalid workspace ID.");
  }

  await connectDB();

  const tenant = await TenantModel.findById(tenantId).exec();

  if (!tenant) {
    throw AppError.notFound("Workspace not found.");
  }

  const membership = await MembershipModel.findOne({
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
