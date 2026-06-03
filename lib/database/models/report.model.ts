import mongoose, { Schema, models, model } from "mongoose";

export interface IReport extends mongoose.Document {
  tenantId: mongoose.Types.ObjectId;
  createdBy: string;
  name: string;
  description?: string;
  filters: {
    eventName: string;
    conditions: Array<{
      field: string;
      operator: "eq" | "neq" | "gt" | "lt" | "gte" | "lte" | "contains";
      value: any;
    }>;
    dateRange:
      | "today"
      | "yesterday"
      | "last_7_days"
      | "last_30_days"
      | "last_90_days"
      | "custom";
    customDateRange?: { start: Date; end: Date };
  };
  schedule: "manual" | "daily" | "weekly" | "monthly";
  lastRunAt?: Date;
  lastExportUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReportSchema = new Schema<IReport>(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, ref: "Tenant" },
    createdBy: { type: String, required: true, ref: "DashboardUser" },
    name: { type: String, required: true },
    description: { type: String },
    filters: {
      eventName: { type: String, required: true },
      conditions: [
        {
          field: { type: String, required: true },
          operator: { type: String, required: true },
          value: { type: Schema.Types.Mixed, required: true },
        },
      ],
      dateRange: { type: String, required: true },
      customDateRange: {
        start: { type: Date },
        end: { type: Date },
      },
    },
    schedule: {
      type: String,
      enum: ["manual", "daily", "weekly", "monthly"],
      default: "manual",
    },
    lastRunAt: { type: Date },
    lastExportUrl: { type: String },
  },
  { timestamps: true },
);

// Indexes
ReportSchema.index({ tenantId: 1, createdBy: 1 });
ReportSchema.index({ tenantId: 1, schedule: 1 });

export default models.Report || model<IReport>("Report", ReportSchema);
