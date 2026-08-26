import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import DashboardUser from "@/lib/database/models/dashboardUser.model";
import Tenant from "@/lib/database/models/tenant.model";
import membershipModel from "@/lib/database/models/membership.model";
import { signJWT } from "@/lib/auth/jwt";
import { connectDB } from "@/lib/database/mongoose";
import { Types } from "mongoose";
import { serverConfig } from "@/lib/config";

interface PopulatedMembership {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  tenantId: {
    _id: Types.ObjectId;
    companyName: string;
    subdomain: string;
  };
  role: "owner" | "admin" | "analyst" | "viewer";
  isActive: boolean;
}

const signInSchema = z.object({
  email: z.email(),
  password: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = signInSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 400 },
      );
    }

    const { email, password } = parsed.data;
    const normalizedEmail = email.toLowerCase();

    await connectDB();

    const user = await DashboardUser.findOne({ email: normalizedEmail });
    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    const memberships = (await membershipModel
      .find({ userId: user._id, isActive: true })
      .populate<{
        tenantId: {
          _id: Types.ObjectId;
          companyName: string;
          subdomain: string;
        };
      }>({
        path: "tenantId",
        model: Tenant,
        select: "companyName subdomain",
      })
      .lean()) as unknown as PopulatedMembership[];

    const workspaces = memberships.map((m) => ({
      id: m.tenantId._id.toString(),
      name: m.tenantId.companyName,
      subdomain: m.tenantId.subdomain,
      role: m.role,
    }));

    await DashboardUser.updateOne(
      { _id: user._id },
      { lastLoginAt: new Date() },
    );

    const token = signJWT({ userId: user._id.toString(), email: user.email });

    const response = NextResponse.json({
      success: true,
      token, // ! still include for client localStorage
      user: { id: user._id, email: user.email, name: user.name },
      workspaces,
    });

    response.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: serverConfig.AUTH_COOKIE_SECURE,
      sameSite: "lax",
      domain: serverConfig.AUTH_COOKIE_DOMAIN || undefined,
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Signin error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
