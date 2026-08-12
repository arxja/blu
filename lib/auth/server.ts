import { getAuthToken, verifyJWT } from "@/lib/auth/jwt";
import { connectDB } from "@/lib/database/mongoose";
import DashboardUser from "@/lib/database/models/dashboardUser.model";
import { log, logger } from "../logger";
import { AppError } from "../errors";

export async function getCurrentUser() {
  try {
    const token = await getAuthToken();
    if (!token) {
      throw AppError.unauthorized("N auth token found");
    }

    const payload = verifyJWT(token);
    if (!payload) {
      throw AppError.unauthorized("Invalid or expired token");
    }

    await connectDB();
    const user = await DashboardUser.findById(payload.userId)
      .select("name email isActive")
      .lean();

    if (!user) {
      throw AppError.notFound("User not found");
    }

    if (!user.isActive) {
      throw AppError.forbidden("User account is disabled");
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    log.error("Failed to get current user", error as Error);
    throw AppError.internal("Authentication error")
  }
}
