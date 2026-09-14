import {
  Schema,
  model,
  models,
  type HydratedDocument,
  type Model,
  type Types,
} from "mongoose";

// ---- Plain shape: no mongoose methods, safe to use anywhere ----

export type ApiKeyPermission = "track" | "identify" | "query";

export interface ApiKey {
  tenantId: Types.ObjectId;
  name: string;
  keyPrefix: string;
  keyHash: string;
  permissions: ApiKeyPermission[];
  lastUsedAt?: Date;
  usageCount: number;
  isActive: boolean;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ---- Mongoose document: only for code that actually calls .save() ----

export type ApiKeyDocument = HydratedDocument<ApiKey>;

// ---- Schema + model ----

const ApiKeySchema = new Schema<ApiKey>(
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

ApiKeySchema.index({ keyHash: 1 }, { unique: true });
ApiKeySchema.index({ tenantId: 1, isActive: 1 });
ApiKeySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const ApiKeyModel =
  (models.ApiKey as Model<ApiKey>) ?? model<ApiKey>("ApiKey", ApiKeySchema);
