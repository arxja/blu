export const ReportConditionOperators = [
  "eq",
  "neq",
  "gt",
  "lt",
  "gte",
  "lte",
  "contains",
] as const;
export type ReportConditionOperator = (typeof ReportConditionOperators)[number];

export const ReportDateRanges = [
  "today",
  "yesterday",
  "last_7_days",
  "last_30_days",
  "last_90_days",
  "custom",
] as const;
export type ReportDateRange = (typeof ReportDateRanges)[number];

export const ReportSchedules = [
  "manual",
  "daily",
  "weekly",
  "monthly",
] as const;
export type ReportSchedule = (typeof ReportSchedules)[number];
