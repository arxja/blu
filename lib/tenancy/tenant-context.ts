import { connectDB } from "@/lib/database/mongoose";
import Tenant from "@/lib/database/models/tenant.model";
import Membership from "@/lib/database/models/membership.model";
import { AppError } from "@/lib/errors";
import { getCurrentUser } from "@/lib/auth/server";

import type { TenantContext } from "@/types/tenancy";

export async function getTenantContext(
  subdomain: string,
): Promise<TenantContext | null> {
  const normalizedSubdomain = subdomain.trim().toLowerCase();

  if (!normalizedSubdomain) {
    return null;
  }

  const user = await getCurrentUser();

  if (!user) {
    throw AppError.unauthorized();
  }

  await connectDB();

  const tenant = await Tenant.findOne({
    subdomain: normalizedSubdomain,
  }).exec();

  if (!tenant) {
    return null;
  }

  if (tenant.status === "suspended") {
    throw AppError.forbidden("This workspace has been suspended.");
  }

  const membership = await Membership.findOne({
    userId: user.id,
    tenantId: tenant._id,
    isActive: true,
  }).exec();

  if (!membership) {
    throw AppError.forbidden("You do not have access to this workspace.");
  }

  const contextUser = user as unknown as TenantContext["user"];

  return {
    user: contextUser,
    tenant,
    membership,
  };
}

export async function requireTenantContext(
  subdomain: string,
): Promise<TenantContext> {
  const context = await getTenantContext(subdomain);

  if (!context) {
    throw AppError.notFound("Workspace not found.");
  }

  return context;
}
