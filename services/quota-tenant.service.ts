import Tenant from "@/lib/database/models/tenant.model";
import TenantUsage from "@/lib/database/models/tenant-usage.model";
import { AppError } from "@/lib/errors";
import { log } from "@/lib/logger";

export type QuotaCheckResult = {
  allowed: boolean;
  reason?: string;
  currentUsage?: number;
  limit?: number;
};

export class QuotaService {
  constructor(private tenantId: string) {}

  /**
   * Fetch the tenant document with quotas.
   * In a real app you might cache this for the request's duration.
   */
  public async getTenant() {
    const tenant = await Tenant.findById(this.tenantId)
      .select("plan quotas status")
      .lean();
    if (!tenant) throw AppError.notFound("Tenant not found");
    return tenant;
  }

  /**
   * Check if the tenant can record an additional event this month.
   */
  async canTrackEvent(eventCount: number = 1): Promise<QuotaCheckResult> {
    const tenant = await this.getTenant();
    const limit = tenant.quotas.monthlyEvents;

    // -1 means unlimited
    if (limit === -1) return { allowed: true };

    // Read current monthly usage from a separate usage collection (see below)
    const currentUsage = await this.getCurrentMonthlyEvents();
    if (currentUsage + eventCount > limit) {
      return {
        allowed: false,
        reason: `Monthly event limit of ${limit} reached. Current: ${currentUsage}`,
        currentUsage,
        limit,
      };
    }

    return { allowed: true };
  }

  /**
   * Check if a new team member can be invited.
   */
  async canInviteMember(currentSeats: number): Promise<QuotaCheckResult> {
    const tenant = await this.getTenant();
    const limit = tenant.quotas.seats;

    if (limit === -1) return { allowed: true };

    if (currentSeats >= limit) {
      return {
        allowed: false,
        reason: `Seat limit of ${limit} reached. Current seats: ${currentSeats}`,
        currentUsage: currentSeats,
        limit,
      };
    }

    return { allowed: true };
  }

  /**
   * Check if a new dashboard can be created.
   */
  async canCreateDashboard(currentCount: number): Promise<QuotaCheckResult> {
    return this.checkCountLimit("dashboards", currentCount);
  }

  /**
   * Check if a new report can be created.
   */
  async canCreateReport(currentCount: number): Promise<QuotaCheckResult> {
    return this.checkCountLimit("reports", currentCount);
  }

  /**
   * Check API rate limit (handled by middleware, but available as a method too).
   */
  async checkApiRateLimit(): Promise<QuotaCheckResult> {
    const tenant = await this.getTenant();
    const limit = tenant.quotas.apiRateLimit;
    if (limit === -1) return { allowed: true };

    // This is handled by middleware typically, but we could also check here.
    return { allowed: true };
  }

  private async checkCountLimit(
    resource: "dashboards" | "reports",
    currentCount: number,
  ): Promise<QuotaCheckResult> {
    const tenant = await this.getTenant();
    const limit = tenant.quotas[resource];
    if (limit === -1) return { allowed: true };

    if (currentCount >= limit) {
      return {
        allowed: false,
        reason: `${resource} limit of ${limit} reached. Current: ${currentCount}`,
        currentUsage: currentCount,
        limit,
      };
    }
    return { allowed: true };
  }

  /**
   * Fetch current monthly event count from the usage tracker.
   */
  private async getCurrentMonthlyEvents(): Promise<number> {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed

    const doc = await TenantUsage.findOne({
      tenantId: this.tenantId,
      year,
      month,
    }).lean();
    return doc?.count ?? 0;
  }

  async incrementEventCount(
    tenantId: string,
    amount: number = 1,
  ): Promise<void> {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    try {
      await TenantUsage.findOneAndUpdate(
        { tenantId, year, month },
        { $inc: { count: amount } },
        { upsert: true, new: true },
      );
    } catch (error) {
      log.error("Failed to increment event count", error as Error, {
        tenantId,
      });
    }
  }
}
