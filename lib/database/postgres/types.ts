import { InferSelectModel } from "drizzle-orm";
import { events } from "./schema";

export type InsertResult = { inserted: number; duplicates: number };

export type EventRow = InferSelectModel<typeof events>;

export type EventInput = {
  eventId: string;
  event: string;
  userId?: string;
  anonymousId?: string;
  groupId?: string;
  timestamp: string;
  properties?: Record<string, unknown>;
  context?: Record<string, unknown>;
};

// Analytics
export interface EventsPerDay {
  date: string,
  count: number
}