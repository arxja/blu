import { log } from "@/lib/logger";
import ProcessedWebhook from "@/lib/database/models/processedWebhook.model";

export class MongoIdempotencyStore {
  async isProcessed(eventId: string): Promise<boolean> {
    const existing = await ProcessedWebhook.exists({ eventId });
    return !!existing;
  }

  async markProcessed(eventId: string): Promise<void> {
    try {
      await ProcessedWebhook.create({ eventId });
    } catch (error: any) {
      // duplicate key error → already processed, fine
      if (error.code === 11000) {
        log.debug("Event already marked processed", { eventId });
      } else {
        throw error;
      }
    }
  }
}

export const idempotencyStore = new MongoIdempotencyStore();