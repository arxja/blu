import {
  eventsPerDay,
  recentEvents,
  topEvent,
  totalEvents,
  uniqueUsers,
} from "@/lib/database/postgres/repositories/analytics.repo";
import type { EventRow } from "@/lib/database/postgres/types";

export interface AnalyticsOverview {
  eventsPerDay: { date: string; count: number }[];
  totalEvents: number;
  uniqueUsers: number;
  topEvent: { eventName: string; count: number } | null;
  recentEvents: EventRow[];
}

function fillDateGaps(
  rows: { date: string; count: number }[],
  days: number,
): { date: string; count: number }[] {
  const byDate = new Map(rows.map((r) => [r.date, r.count]));

  // Midnight today, in UTC
  const end = new Date();
  end.setUTCHours(0, 0, 0, 0);

  const out: { date: string; count: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setUTCDate(d.getUTCDate() - i);
    // toISOString() → "2026-10-01T00:00:00.000Z"; slice gives YYYY-MM-DD
    const key = d.toISOString().slice(0, 10);
    out.push({ date: key, count: byDate.get(key) ?? 0 });
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────

/**
 * Fetch everything the Overview page needs in parallel.
 *
 * All queries are tenant-scoped via the publicId — the same value
 * stored in events.tenant_id.
 */
export async function getAnalyticsOverview(
  tenantPublicId: string,
  days: number = 30,
): Promise<AnalyticsOverview> {
  const [raw, total, users, top, recent] = await Promise.all([
    eventsPerDay(tenantPublicId, days),
    totalEvents(tenantPublicId, days),
    uniqueUsers(tenantPublicId, days),
    topEvent(tenantPublicId, days),
    recentEvents(tenantPublicId, 20),
  ]);

  return {
    eventsPerDay: fillDateGaps(raw, days),
    totalEvents: total,
    uniqueUsers: users,
    topEvent: top,
    recentEvents: recent,
  };
}
