import Header from "@/components/pages/dashboard/Header";
import Workspaces from "@/components/pages/dashboard/Workspaces";
import { getCurrentUser } from "@/lib/auth/server";
// Ensure this route is always rendered dynamically because it reads cookies/user session
export const dynamic = "force-dynamic";
import { connectDB } from "@/lib/database/mongoose";
import Membership from "@/lib/database/models/membership.model";
import Tenant from "@/lib/database/models/tenant.model";
import { Types } from "mongoose";
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

interface PopulatedMembership {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  tenantId: {
    _id: Types.ObjectId;
    companyName: string;
    subdomain: string;
    members?: number;
    logo?: string | undefined;
  };
  role: "owner" | "admin" | "analyst" | "viewer";
  isActive: boolean;
}

export const revalidate = 0;

const page = async () => {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  let tenants: TenantWorkspace[] = [];

  // Treat a rejected cache read as a cache miss so we fall back to MongoDB.
  let cached: TenantWorkspace[] | null = null;
  try {
    cached = (await getCachedUserWorkspaces(user.id)) as
      | TenantWorkspace[]
      | null;
  } catch (err) {
    logger.debug(
      { userId: user.id },
      "Dashboard: cache read failed, treating as miss",
    );
    cached = null;
  }

  if (Array.isArray(cached)) {
    // Treat any array (including empty array) as cache hit.
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
      .populate<{
        tenantId: {
          _id: Types.ObjectId;
          companyName: string;
          subdomain: string;
          members?: number;
          logo?: string | undefined;
        };
      }>({
        path: "tenantId",
        model: Tenant,
        select: "companyName subdomain members logo",
      })
      .lean()) as unknown as PopulatedMembership[];

    tenants = memberships
      .filter((membership) => membership.tenantId)
      .map((membership) => {
        const tenant = membership.tenantId;
        return {
          id: tenant._id?.toString() ?? "",
          name: tenant.companyName ?? "Workspace",
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

  const displayName = user.name?.trim().split(/\s+/)[0] || "there";

  return (
    <div className="pt-20 pb-24 md:pt-20 md:pb-32">
      <Header username={displayName} />
      <Workspaces activeWorkspaces={tenants.length} workspaces={tenants} />
    </div>
  );
};

export default page;
