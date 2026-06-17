import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/jwt";
import dashboardUserModel from "@/lib/database/models/dashboardUser.model";
import membershipModel from "@/lib/database/models/membership.model";
import { connectDB } from "@/lib/database/mongoose";
import tenantModel from "@/lib/database/models/tenant.model";

export async function GET() {
  const authUser = await getCurrentUser();
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const user = await dashboardUserModel
    .findById(authUser.userId)
    .select("-passwordHash");

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const membership = await membershipModel.findOne({
    userId: user._id,
    tenantId: authUser.tenantId,
    isActive: true,
  });
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const tenant = await tenantModel.findById(authUser.tenantId);
  return NextResponse.json({
    user: {
      id: user._id,
      email: user.email,
      name: user.name,
    },
    membership: {
      role: membership?.role,
      tenantId: tenant?._id,
      tenantName: tenant?.companyName,
      tenantSubdomain: tenant?.subdomain,
      tenantPlan: tenant?.plan,
      tenantStatus: tenant?.status,
      tenantQuotas: tenant?.quotas,
    },
  });
}
