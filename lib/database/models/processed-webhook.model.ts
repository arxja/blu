import {
  Schema,
  model,
  models,
  type HydratedDocument,
  type Model,
} from "mongoose";

// ---- Plain shape ----

export interface ProcessedWebhook {
  eventId: string;
  processedAt: Date;
}

export type ProcessedWebhookDocument = HydratedDocument<ProcessedWebhook>;

// ---- Schema ----

const ProcessedWebhookSchema = new Schema<ProcessedWebhook>({
  eventId: {
    type: String,
    required: true,
    unique: true,
  },
  processedAt: {
    type: Date,
    default: Date.now,
  },
});

// TTL: keep processed-event records for 7 days so provider retries
// (Stripe: up to 72h) can never be double-processed.
ProcessedWebhookSchema.index(
  { processedAt: 1 },
  { expireAfterSeconds: 7 * 24 * 60 * 60 },
);

export const ProcessedWebhookModel =
  (models.ProcessedWebhook as Model<ProcessedWebhook>) ??
  model<ProcessedWebhook>("ProcessedWebhook", ProcessedWebhookSchema);
