import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import dashboardUserModel from "@/lib/database/models/dashboardUser.model";
import { signJWT } from "@/lib/auth/jwt";

const signUpSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  password: z.string().min(6),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = signUpSchema.safeParse(body);
    if (!parsed.success) {
      const errors = parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));
      return NextResponse.json(
        { error: "Validation failed", details: errors },
        { status: 400 },
      );
    }

    const { email, name, password } = parsed.data;
    const normalizedEmail = email.toLowerCase();

    const existing = await dashboardUserModel.findOne({
      email: normalizedEmail,
    });
    if (existing) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await dashboardUserModel.create({
      email: normalizedEmail,
      name,
      passwordHash,
      isActive: true,
    });

    const token = signJWT({ userId: user._id.toString(), email: user.email });

    const response = NextResponse.json({
      success: true,
      token, // ! still include for client localStorage
      user: { id: user._id, email: user.email, name: user.name },
    });

    response.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
