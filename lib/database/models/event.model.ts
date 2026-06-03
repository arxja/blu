import mongoose, { Schema, models, model } from "mongoose";

export interface IEvent extends mongoose.Document {
  tenantId: mongoose.Types.ObjectId;
  projectId?: string;
  userId?: string;
  anonymousId?: string;
  sessionId?: string;
  eventName: string;
  properties: Record<string, unknown>;
  timestamp: Date;
  ingestedAt: Date;
  ip?: string;
  userAgent?: string;
  apiKeyId?: string;
}

const EventSchema = new Schema<IEvent>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Tenant",
      index: true,
    },
    projectId: { type: String },
    userId: { type: String },
    anonymousId: { type: String },
    sessionId: { type: String },
    eventName: { type: String, required: true },
    properties: { type: Schema.Types.Mixed, default: {} },
    timestamp: { type: Date, required: true },
    ingestedAt: { type: Date, default: Date.now },
    ip: { type: String },
    userAgent: { type: String },
    apiKeyId: { type: String },
  },
  {
    timestamps: false, // Using custom timestamp field
    autoIndex: true,
  },
);

// Composite Indexes for common queries
EventSchema.index({ tenantId: 1, timestamp: -1 });
EventSchema.index({ tenantId: 1, eventName: 1, timestamp: -1 });
EventSchema.index({ tenantId: 1, userId: 1, timestamp: -1 });
EventSchema.index({ tenantId: 1, anonymousId: 1, timestamp: -1 });
EventSchema.index({ tenantId: 1, sessionId: 1, timestamp: -1 });
EventSchema.index({ tenantId: 1, eventName: 1, userId: 1, timestamp: 1 }); // For funnels
EventSchema.index({ timestamp: 1 }, { expireAfterSeconds: 0 }); // For TTL (set per tenant)

// For text search on properties
EventSchema.index({ "properties.$**": "text" });

export default models.Event || model<IEvent>("Event", EventSchema);
