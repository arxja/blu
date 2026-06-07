import { NextResponse } from "next/server";
import { getAuthToken, verifyJWT } from "@/lib/auth/jwt";
import dashboardUserModel from "@/lib/database/models/dashboardUser.model";

export async function GET() {
  const token = await getAuthToken();
  if (!token) return NextResponse.json({ user: null });

  const payload = verifyJWT(token);
  if (!payload) return NextResponse.json({ user: null });

  const user = await dashboardUserModel
    .findById(payload.userId)
    .select("-passwordHash");
  return NextResponse.json({ user });
}
