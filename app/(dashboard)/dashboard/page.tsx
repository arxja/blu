import Header from "@/components/pages/dashboard/Header";
import Workspaces from "@/components/pages/dashboard/Workspaces";
import { getCurrentUser } from "@/lib/auth/server";
import { connectDB } from "@/lib/database/mongoose";
import Membership from "@/lib/database/models/membership.model";
import Tenant from "@/lib/database/models/tenant.model";
import { logger } from "@/lib/logger";
import { getCachedUserWorkspaces, setCachedUserWorkspaces } from "@/lib/redis";
import { redirect } from "next/navigation";

type TenantWorkspace = {
  id: string;
  name: string;
  slug: string;
  role: string;
  members: number;
  logo: string;
};

const page = async () => {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  let tenants: TenantWorkspace[] = [];

  try {
    const cached = (await getCachedUserWorkspaces(user.id)) as
      | TenantWorkspace[]
      | null;
    if (Array.isArray(cached) && cached.length > 0) {
      tenants = cached;
      logger.debug(
        { userId: user.id },
        "Dashboard: cache hit for user workspaces",
      );
    } else {
      logger.debug(
        { userId: user.id },
        "Dashboard: cache miss for user workspaces",
      );

      await connectDB();
      const memberships = (await Membership.find({
        userId: user.id,
        isActive: true,
      })
        .populate({
          path: "tenantId",
          model: Tenant,
          select: "companyName subdomain members logo",
        })
        .lean()) as any[];

      tenants = memberships
        .filter((membership) => membership.tenantId)
        .map((membership) => {
          const tenant = membership.tenantId;
          return {
            id: tenant._id?.toString() ?? "",
            name: tenant.companyName ?? tenant.name ?? "Workspace",
            slug: tenant.subdomain ?? "workspace",
            role: membership.role ?? "member",
            members: Number(tenant.members ?? 1),
            logo: typeof tenant.logo === "string" ? tenant.logo : "",
          };
        })
        .filter(
          (tenant) => tenant.id && tenant.name && tenant.slug,
        ) as TenantWorkspace[];

      await setCachedUserWorkspaces(user.id, tenants);
    }
  } catch (error) {
    logger.error(
      { userId: user.id },
      "Dashboard page: failed to load data",
      error as Error,
    );
  }

  const displayName = user.name?.trim().split(/\s+/)[0] || "there";

  return (
    <div className="pt-20 pb-24 md:pt-20 md:pb-32">
      <Header username={displayName} />
      <Workspaces activeWorkspaces={tenants.length} workspaces={tenants} />
    </div>
  );
};

export default page;
