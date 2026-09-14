import {
  Schema,
  model,
  models,
  type HydratedDocument,
  type Model,
  type Types,
} from "mongoose";
import {
  ReportConditionOperators,
  ReportDateRanges,
  ReportSchedules,
  type ReportConditionOperator,
  type ReportDateRange,
  type ReportSchedule,
} from "@/lib/reports/constants";

// ---- Nested shapes ----

export interface ReportCondition {
  field: string;
  operator: ReportConditionOperator;
  value: unknown;
}

export interface ReportCustomDateRange {
  start: Date;
  end: Date;
}

export interface ReportFilters {
  eventName: string;
  conditions: ReportCondition[];
  dateRange: ReportDateRange;
  customDateRange?: ReportCustomDateRange;
}

// ---- Plain shape ----

export interface Report {
  tenantId: Types.ObjectId;
  createdBy: Types.ObjectId;
  name: string;
  description?: string;
  filters: ReportFilters;
  schedule: ReportSchedule;
  lastRunAt?: Date;
  lastExportUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ReportDocument = HydratedDocument<Report>;

// ---- Sub-schemas ----

const ReportConditionSchema = new Schema<ReportCondition>(
  {
    field: { type: String, required: true },
    operator: {
      type: String,
      enum: ReportConditionOperators,
      required: true,
    },
    value: { type: Schema.Types.Mixed, required: true },
  },
  { _id: false },
);

const ReportCustomDateRangeSchema = new Schema<ReportCustomDateRange>(
  {
    start: { type: Date, required: true },
    end: { type: Date, required: true },
  },
  { _id: false },
);

const ReportFiltersSchema = new Schema<ReportFilters>(
  {
    eventName: { type: String, required: true },
    conditions: { type: [ReportConditionSchema], default: [] },
    dateRange: {
      type: String,
      enum: ReportDateRanges,
      required: true,
    },
    customDateRange: { type: ReportCustomDateRangeSchema },
  },
  { _id: false },
);

// ---- Schema ----

const ReportSchema = new Schema<Report>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Tenant",
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "DashboardUser",
    },
    name: { type: String, required: true },
    description: { type: String },
    filters: { type: ReportFiltersSchema, required: true },
    schedule: {
      type: String,
      enum: ReportSchedules,
      default: "manual",
    },
    lastRunAt: { type: Date },
    lastExportUrl: { type: String },
  },
  { timestamps: true },
);

// Query: "list this tenant's reports created by user X"
ReportSchema.index({ tenantId: 1, createdBy: 1 });

// Query: "list this tenant's reports filtered by schedule" (UI)
ReportSchema.index({ tenantId: 1, schedule: 1 });

// Worker query: "find all reports due to run right now"
// Different shape from the UI query above — add this if/when
// you build the scheduler:
// ReportSchema.index({ schedule: 1, lastRunAt: 1 });

export const ReportModel =
  (models.Report as Model<Report>) ?? model<Report>("Report", ReportSchema);
