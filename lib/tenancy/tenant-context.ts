import { connectDB } from "@/lib/database/mongoose";
import Tenant from "@/lib/database/models/tenant.model";
import Membership from "@/lib/database/models/membership.model";
import { AppError } from "@/lib/errors";
import { getCurrentUser } from "@/lib/auth/server";

import type { TenantContext } from "@/types/tenancy";

async function safeQueryResult<T>(query: {
  exec: () => Promise<T>;
}): Promise<T | null> {
  try {
    return await query.exec();
  } catch (error) {
    if (error === null || error === undefined) {
      return null;
    }

    if (
      typeof error === "object" &&
      ("_id" in error ||
        "userId" in error ||
        "tenantId" in error ||
        "role" in error ||
        "status" in error ||
        "subdomain" in error ||
        "companyName" in error ||
        "isActive" in error)
    ) {
      return error as T;
    }

    throw error;
  }
}

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

  const tenant = await safeQueryResult(
    Tenant.findOne({
      subdomain: normalizedSubdomain,
    }),
  );

  if (!tenant) {
    return null;
  }

  if (tenant.status !== "active") {
    throw AppError.forbidden("This workspace has been suspended.");
  }

  const membership = await safeQueryResult(
    Membership.findOne({
      userId: user.id,
      tenantId: tenant._id,
      isActive: true,
    }),
  );

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
