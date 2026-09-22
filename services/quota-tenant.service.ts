import { Types } from "mongoose";
import { TenantModel } from "@/lib/database/models/tenant.model";
import { AppError } from "@/lib/errors";
import { log } from "@/lib/logger";
import { TenantUsageModel } from "@/lib/database/models/tenant-usage.model";
import { getEffectiveQuotas } from "@/lib/tenancy/quotas";

export type QuotaCheckResult = {
  allowed: boolean;
  reason?: string;
  currentUsage?: number;
  limit?: number;
};

const UNLIMITED = -1;

export class QuotaService {
  constructor(private tenantId: string | Types.ObjectId) {}

  private async getTenant() {
    const tenant = await TenantModel.findById(this.tenantId)
      .select("plan quotas status")
      .lean();
    if (!tenant) throw AppError.notFound("Tenant not found");
    return tenant;
  }

  private async getQuotas() {
    const tenant = await this.getTenant();
    return getEffectiveQuotas(tenant);
  }

  async canTrackEvent(eventCount: number = 1): Promise<QuotaCheckResult> {
    const quotas = await this.getQuotas();
    const limit = quotas.monthlyEvents;
    if (limit === UNLIMITED) return { allowed: true };

    const currentUsage = await this.getCurrentMonthlyEvents();
    if (currentUsage + eventCount > limit) {
      return {
        allowed: false,
        reason: `Monthly event limit of ${limit} reached. Current: ${currentUsage}`,
        currentUsage,
        limit,
      };
    }
    return { allowed: true, currentUsage, limit };
  }

  async canInviteMember(currentSeats: number): Promise<QuotaCheckResult> {
    const quotas = await this.getQuotas();
    const limit = quotas.seats;
    if (limit === UNLIMITED) return { allowed: true };

    if (currentSeats >= limit) {
      return {
        allowed: false,
        reason: `Seat limit of ${limit} reached. Current seats: ${currentSeats}`,
        currentUsage: currentSeats,
        limit,
      };
    }
    return { allowed: true, currentUsage: currentSeats, limit };
  }

  async getApiRateLimit(): Promise<number> {
    const quotas = await this.getQuotas();
    const limit = quotas.ingestionEventsPerSec ?? quotas.apiRateLimit;
    return limit === UNLIMITED ? 10_000_000 : limit;
  }

  async incrementEventCount(amount: number = 1): Promise<void> {
    const { year, month } = this.currentPeriod();
    try {
      await TenantUsageModel.updateOne(
        { tenantId: this.tenantId, year, month },
        { $inc: { count: amount } },
        { upsert: true },
      );
    } catch (error) {
      // Unique-index race under concurrent upserts: retry once as plain update.
      if (isDuplicateKeyError(error)) {
        await TenantUsageModel.updateOne(
          { tenantId: this.tenantId, year, month },
          { $inc: { count: amount } },
        );
        return;
      }
      log.error("Failed to increment event count", error as Error, {
        tenantId: String(this.tenantId),
      });
    }
  }

  private async getCurrentMonthlyEvents(): Promise<number> {
    const { year, month } = this.currentPeriod();
    const doc = await TenantUsageModel.findOne({
      tenantId: this.tenantId,
      year,
      month,
    }).lean();
    return doc?.count ?? 0;
  }

  /**
   * Returns the billing period in the model's convention:
   * year as-is, month as 1-12 (NOT JS getMonth()'s 0-11).
   * Period is UTC by convention — change here if you want
   * tenant-local periods, but change it in ONE place.
   */
  private currentPeriod() {
    const now = new Date();
    return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
  }
}

function isDuplicateKeyError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: number }).code === 11000
  );
}
