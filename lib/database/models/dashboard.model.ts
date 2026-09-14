// lib/database/models/dashboard.model.ts
import {
  Schema,
  model,
  models,
  type HydratedDocument,
  type Model,
  type Types,
} from "mongoose";

// ---- Nested widget types ----

export type WidgetType =
  | "line_chart"
  | "bar_chart"
  | "pie_chart"
  | "table"
  | "funnel"
  | "retention";

export type WidgetMetric = "count" | "unique_users" | "sum" | "avg";

export type WidgetGroupBy = "hour" | "day" | "week" | "month";

export interface WidgetQuery {
  eventName: string;
  metric: WidgetMetric;
  field?: string;
  groupBy: WidgetGroupBy;
  filters?: Record<string, unknown>;
  dateRange: string;
}

export interface WidgetPosition {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Widget {
  id: string;
  type: WidgetType;
  title: string;
  query: WidgetQuery;
  position: WidgetPosition;
}

// ---- Plain shape ----

export interface Dashboard {
  tenantId: Types.ObjectId;
  createdBy: string;
  name: string;
  widgets: Widget[];
  isPublic: boolean;
  sharedWith: string[];
  createdAt: Date;
  updatedAt: Date;
}

export type DashboardDocument = HydratedDocument<Dashboard>;

// ---- Schema ----

const WidgetSchema = new Schema<Widget>(
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
  { _id: false },
);

const DashboardSchema = new Schema<Dashboard>(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, ref: "Tenant" },
    createdBy: { type: String, required: true, ref: "DashboardUser" },
    name: { type: String, required: true },
    widgets: [WidgetSchema],
    isPublic: { type: Boolean, default: false },
    sharedWith: [{ type: String, ref: "DashboardUser" }],
  },
  { timestamps: true },
);

DashboardSchema.index({ tenantId: 1, createdBy: 1 });
DashboardSchema.index({ tenantId: 1, isPublic: 1 });
DashboardSchema.index({ sharedWith: 1 });

export const DashboardModel =
  (models.Dashboard as Model<Dashboard>) ??
  model<Dashboard>("Dashboard", DashboardSchema);
