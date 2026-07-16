import mongoose, { Schema, models, model } from "mongoose";

export interface IProcessedWebhook extends mongoose.Document {
  eventId: string;
  processedAt: Date;
}

const ProcessedWebhookSchema = new Schema<IProcessedWebhook>({
  eventId: { type: String, required: true, unique: true },
  processedAt: { type: Date, default: Date.now, expires: 86400 }, // 24h TTL
});

export default models.ProcessedWebhook ||
  model<IProcessedWebhook>("ProcessedWebhook", ProcessedWebhookSchema);
