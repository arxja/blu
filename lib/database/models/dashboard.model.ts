import mongoose, { Schema, models, model } from "mongoose";

interface IWidget {
  id: string;
  type:
    | "line_chart"
    | "bar_chart"
    | "pie_chart"
    | "table"
    | "funnel"
    | "retention";
  title: string;
  query: {
    eventName: string;
    metric: "count" | "unique_users" | "sum" | "avg";
    field?: string;
    groupBy: "hour" | "day" | "week" | "month";
    filters?: Record<string, any>;
    dateRange: string;
  };
  position: { x: number; y: number; w: number; h: number };
}

export interface IDashboard extends mongoose.Document {
  tenantId: mongoose.Types.ObjectId;
  createdBy: string;
  name: string;
  widgets: IWidget[];
  isPublic: boolean;
  sharedWith: string[];
  createdAt: Date;
  updatedAt: Date;
}

const DashboardSchema = new Schema<IDashboard>(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, ref: "Tenant" },
    createdBy: { type: String, required: true, ref: "DashboardUser" },
    name: { type: String, required: true },
    widgets: [
      {
        id: { type: String, required: true },
        type: { type: String, required: true },
        title: { type: String, required: true },
        query: {
          eventName: { type: String, required: true },
          metric: { type: String, required: true },
          field: { type: String },
          groupBy: { type: String, required: true },
          filters: { type: Schema.Types.Mixed },
          dateRange: { type: String, required: true },
        },
        position: {
          x: { type: Number, required: true },
          y: { type: Number, required: true },
          w: { type: Number, required: true },
          h: { type: Number, required: true },
        },
      },
    ],
    isPublic: { type: Boolean, default: false },
    sharedWith: [{ type: String, ref: "DashboardUser" }],
  },
  { timestamps: true },
);

// Indexes
DashboardSchema.index({ tenantId: 1, createdBy: 1 });
DashboardSchema.index({ tenantId: 1, isPublic: 1 });
DashboardSchema.index({ sharedWith: 1 });

export default models.Dashboard ||
  model<IDashboard>("Dashboard", DashboardSchema);
