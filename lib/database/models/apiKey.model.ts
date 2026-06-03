import mongoose, { Schema, models, model } from "mongoose";

export interface IApiKey extends mongoose.Document {
  tenantId: mongoose.Types.ObjectId;
  name: string;
  keyPrefix: string;
  keyHash: string;
  permissions: ("track" | "identify" | "query")[];
  lastUsedAt?: Date;
  usageCount: number;
  isActive: boolean;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ApiKeySchema = new Schema<IApiKey>(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, ref: "Tenant" },
    name: { type: String, required: true },
    keyPrefix: { type: String, required: true },
    keyHash: { type: String, required: true, unique: true },
    permissions: [{ type: String, enum: ["track", "identify", "query"] }],
    lastUsedAt: { type: Date },
    usageCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    expiresAt: { type: Date },
  },
  { timestamps: true },
);

// Indexes
ApiKeySchema.index({ keyHash: 1 }, { unique: true });
ApiKeySchema.index({ tenantId: 1, isActive: 1 });
ApiKeySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default models.ApiKey || model<IApiKey>("ApiKey", ApiKeySchema);
