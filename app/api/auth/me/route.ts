import { NextResponse } from "next/server";
import { getAuthToken, verifyJWT } from "@/lib/auth/jwt";
import dashboardUserModel from "@/lib/database/models/dashboardUser.model";
import { AppError } from "@/lib/errors";
import { log } from "@/lib/logger";

export async function GET() {
  const token = await getAuthToken();
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = verifyJWT(token);
  if (!payload) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

import { log } from "`@/lib/logger`";
import { connectDB } from "`@/lib/database/mongoose`";

...

  try {
    await connectDB();
    const user = await dashboardUserModel
      .findById(payload.userId)
      .select("-passwordHash");

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      log.error("Database error in /api/auth/me", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
