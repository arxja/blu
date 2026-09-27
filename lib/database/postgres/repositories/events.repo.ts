import { and, desc, eq, gte, lte } from "drizzle-orm";
import { db as defaultDb, type Db } from "../client";
import { events } from "../schema";
import type { EventInput, EventRow, InsertResult } from "../types";


export function createEventsRepo(db: Db) {
  return {
    async insertBatch(
      tenantId: string,
      rows: EventInput[],
    ): Promise<InsertResult> {
      if (rows.length === 0) {
        return { inserted: 0, duplicates: 0 };
      }

      const payload = rows.map((row) => ({
        tenantId,
        eventId: row.eventId,
        eventName: row.event,
        userId: row.userId ?? null,
        anonymousId: row.anonymousId ?? null,
        groupId: row.groupId ?? null,
        timestamp: new Date(row.timestamp),
        properties: row.properties ?? {},
        context: row.context ?? {},
      }));

      const inserted = await db
        .insert(events)
        .values(payload)
        .onConflictDoNothing({
          target: [events.tenantId, events.eventId],
        })
        .returning({ eventId: events.eventId });

      return {
        inserted: inserted.length,
        duplicates: Math.max(0, payload.length - inserted.length),
      };
    },

    findByTenant(
      tenantId: string,
      range: { from: Date; to: Date },
    ): Promise<EventRow[]> {
      return db
        .select()
        .from(events)
        .where(
          and(
            eq(events.tenantId, tenantId),
            gte(events.timestamp, range.from),
            lte(events.timestamp, range.to),
          ),
        )
        .orderBy(desc(events.timestamp));
    },

    findByUser(tenantId: string, userId: string): Promise<EventRow[]> {
      return db
        .select()
        .from(events)
        .where(and(eq(events.tenantId, tenantId), eq(events.userId, userId)))
        .orderBy(desc(events.timestamp));
    },
  };
}

/**
 * Singleton bound to the app-runtime (pooled) connection.
 * Use `createEventsRepo(db)` directly in tests against TEST_ANALYTICS_DATABASE_URL.
 */
export const eventsRepo = createEventsRepo(defaultDb);

export type EventsRepo = ReturnType<typeof createEventsRepo>;
