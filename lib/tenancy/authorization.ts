import { AppError } from "@/lib/errors";
import { TenantRole } from "@/types/tenancy";

const ROLE_RANK: Record<TenantRole, number> = {
  viewer: 10,
  analyst: 20,
  admin: 30,
  owner: 40,
};

export function requireMinimumRole(
  currentRole: TenantRole,
  minimumRole: TenantRole,
): void {
  if (ROLE_RANK[currentRole] < ROLE_RANK[minimumRole]) {
    throw AppError.forbidden(
      "You do not have permission to perform this action.",
    );
  }
}
