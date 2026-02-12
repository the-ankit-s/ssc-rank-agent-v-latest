import { pgEnum } from "drizzle-orm/pg-core";

export const agencyEnum = pgEnum("agency", [
  "SSC",
  "RRB",
  "IBPS",
  "TCS",
  "NTA",
  "STATE_GOVT",
]);

export const examStatusEnum = pgEnum("exam_status", [
  "upcoming",
  "active",
  "answer_key_released",
  "closed",
]);

export const analysisPhaseEnum = pgEnum("analysis_phase", [
  "collecting",
  "preliminary",
  "intermediate",
  "final",
]);

export const categoryEnum = pgEnum("category", [
  "UR",
  "OBC",
  "EWS",
  "SC",
  "ST",
]);

export const genderEnum = pgEnum("gender", ["M", "F", "O"]);

export const jobStatusEnum = pgEnum("job_status", [
  "pending",
  "running",
  "success",
  "failed",
]);

export const jobTypeEnum = pgEnum("job_type", [
  "rank_calculation",
  "normalization",
  "cutoff_prediction",
  "backup",
  "cleanup",
  "analytics",
]);

export const logLevelEnum = pgEnum("log_level", [
  "DEBUG",
  "INFO",
  "WARN",
  "ERROR",
]);

export const confidenceLevelEnum = pgEnum("confidence_level", [
  "low",
  "medium",
  "high",
]);

export const auditActionEnum = pgEnum("audit_action", [
  "create",
  "update",
  "delete",
  "bulk_update",
  "bulk_delete",
]);

export const auditEntityEnum = pgEnum("audit_entity", [
  "exam",
  "shift",
  "submission",
  "cutoff",
  "admin_user",
  "settings",
]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "system_alert",
  "job_failed",
  "high_error_rate",
  "low_disk_space",
]);

export const notificationChannelEnum = pgEnum("notification_channel", [
  "in_app",
  "email",
  "sms",
  "slack",
]);

export const errorStatusEnum = pgEnum("error_status", [
  "new",
  "acknowledged",
  "resolved",
  "ignored",
]);

export const errorSeverityEnum = pgEnum("error_severity", [
  "critical",
  "high",
  "medium",
  "low",
]);
