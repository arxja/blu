import {
  index,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const events = pgTable(
  "events",
  {
    tenantId: uuid("tenant_id").notNull(),
    eventId: uuid("event_id").notNull(),
    eventName: text("event_name").notNull(),
    userId: text("user_id"),
    anonymousId: text("anonymous_id"),
    groupId: text("group_id"),
    timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    properties: jsonb("properties")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    context: jsonb("context")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
  },
  (t) => [
    primaryKey({ columns: [t.tenantId, t.eventId] }),
    index("idx_events_tenant_timestamp").on(t.tenantId, t.timestamp.desc()),
    index("idx_events_tenant_event_name").on(t.tenantId, t.eventName),
    index("idx_events_tenant_user").on(t.tenantId, t.userId),
  ],
);
