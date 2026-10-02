import { and, desc, eq, gte, sql } from "drizzle-orm";

import { db } from "../client";
import { events } from "../schema";
import type { EventRow } from "../types";

// ─────────────────────────────────────────────────────────────────
// All analytics queries bucket by `received_at` (server time), not
// `timestamp` (client time). received_at is monotonic, cannot be
// backdated by a misbehaving client, and is what ingestion writes.
// ─────────────────────────────────────────────────────────────────

function sinceDate(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

// ─────────────────────────────────────────────────────────────────
// Aggregation queries
// ─────────────────────────────────────────────────────────────────

/**
 * Events per day for one tenant over the last N days.
 *
 * Uses `to_char` to return the day as `YYYY-MM-DD` (string) rather
 * than a full timestamp. The service layer gap-fills missing days.
 *
 * Only days with data are returned — Postgres GROUP BY skips
 * days with zero events.
 */
export async function eventsPerDay(
  tenantId: string,
  days: number,
): Promise<{ date: string; count: number }[]> {
  return db
    .select({
      date: sql<string>`to_char(date_trunc('day', ${events.receivedAt}), 'YYYY-MM-DD')`,
      count: sql<number>`count(*)::int`,
    })
    .from(events)
    .where(
      and(
        eq(events.tenantId, tenantId),
        gte(events.receivedAt, sinceDate(days)),
      ),
    )
    .groupBy(sql`date_trunc('day', ${events.receivedAt})`)
    .orderBy(sql`date_trunc('day', ${events.receivedAt})`);
}

/**
 * Total events for one tenant over the last N days.
 */
export async function totalEvents(
  tenantId: string,
  days: number,
): Promise<number> {
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(events)
    .where(
      and(
        eq(events.tenantId, tenantId),
        gte(events.receivedAt, sinceDate(days)),
      ),
    );
  return rows[0]?.count ?? 0;
}

/**
 * Distinct user_id count over the last N days.
 *
 * `count(distinct ...)` in Postgres ignores NULLs — so anonymous
 * events (no user_id) don't inflate this number.
 */
export async function uniqueUsers(
  tenantId: string,
  days: number,
): Promise<number> {
  const rows = await db
    .select({
      count: sql<number>`count(distinct ${events.userId})::int`,
    })
    .from(events)
    .where(
      and(
        eq(events.tenantId, tenantId),
        gte(events.receivedAt, sinceDate(days)),
      ),
    );
  return rows[0]?.count ?? 0;
}

/**
 * The most frequent event name over the last N days.
 * Returns null for empty tenants.
 */
export async function topEvent(
  tenantId: string,
  days: number,
): Promise<{ eventName: string; count: number } | null> {
  const rows = await db
    .select({
      eventName: events.eventName,
      count: sql<number>`count(*)::int`,
    })
    .from(events)
    .where(
      and(
        eq(events.tenantId, tenantId),
        gte(events.receivedAt, sinceDate(days)),
      ),
    )
    .groupBy(events.eventName)
    .orderBy(desc(sql`count(*)`))
    .limit(1);

  return rows[0] ?? null;
}

/**
 * Most recent N events for one tenant, ordered by received_at DESC.
 *
 * Uses the `(tenant_id, timestamp DESC)` index — but since we order
 * by received_at, Postgres may still need a sort. At low volume
 * that's fine. If it becomes slow, add `(tenant_id, received_at)`
 * to the events table.
 */
export async function recentEvents(
  tenantId: string,
  limit: number,
): Promise<EventRow[]> {
  return db
    .select()
    .from(events)
    .where(eq(events.tenantId, tenantId))
    .orderBy(desc(events.receivedAt))
    .limit(limit);
}
