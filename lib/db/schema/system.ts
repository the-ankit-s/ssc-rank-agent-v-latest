import { pgTable, serial, text, integer, boolean, timestamp, jsonb, uniqueIndex, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { jobStatusEnum, jobTypeEnum, logLevelEnum, errorStatusEnum, errorSeverityEnum } from "./enums";
import type { JobMetadata } from "./interfaces";

export const jobRuns = pgTable(
  "job_runs",
  {
    id: serial("id").primaryKey(),

    jobName: text("job_name").notNull(),
    jobType: jobTypeEnum("job_type").notNull(),
    status: jobStatusEnum("status").notNull().default("pending"),

    // Timing
    scheduledAt: timestamp("scheduled_at"),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),

    // Progress
    totalRecords: integer("total_records"),
    recordsProcessed: integer("records_processed").default(0),
    progressPercent: integer("progress_percent").default(0),

    // Results
    errorMessage: text("error_message"),
    errorStack: text("error_stack"),
    metadata: jsonb("metadata").$type<JobMetadata>(),

    // Context
    triggeredBy: text("triggered_by").default("system"),
  },
  (table) => ({
    statusIdx: index("job_status_idx").on(table.status),
    jobTypeIdx: index("job_type_idx").on(table.jobType),
    startedAtIdx: index("job_started_at_idx").on(table.startedAt),
  })
);

export const scheduledJobs = pgTable(
  "scheduled_jobs",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull().unique(),
    jobType: jobTypeEnum("job_type").notNull(),
    cronExpression: text("cron_expression").notNull(),
    isEnabled: boolean("is_enabled").default(true),
    config: jsonb("config").$type<Record<string, unknown>>(),
    lastRunAt: timestamp("last_run_at"),
    nextRunAt: timestamp("next_run_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    nameIdx: uniqueIndex("scheduled_job_name_idx").on(table.name),
  })
);

export const errorGroups = pgTable(
  "error_groups",
  {
    id: serial("id").primaryKey(),
    errorHash: text("error_hash").notNull().unique(),
    message: text("message").notNull(),
    component: text("component").notNull(),
    stackTrace: text("stack_trace"),

    status: errorStatusEnum("status").default("new"),
    severity: errorSeverityEnum("severity").default("medium"),

    firstSeen: timestamp("first_seen").defaultNow(),
    lastSeen: timestamp("last_seen").defaultNow(),
    occurrenceCount: integer("occurrence_count").default(1),

    metadata: jsonb("metadata").$type<Record<string, unknown>>(),

    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    hashIdx: uniqueIndex("error_group_hash_idx").on(table.errorHash),
    statusIdx: index("error_group_status_idx").on(table.status),
    lastSeenIdx: index("error_group_last_seen_idx").on(table.lastSeen),
  })
);

export const systemLogs = pgTable(
  "system_logs",
  {
    id: serial("id").primaryKey(),

    timestamp: timestamp("timestamp").defaultNow(),
    level: logLevelEnum("level").notNull(),

    component: text("component").notNull(),
    action: text("action"),

    message: text("message").notNull(),
    details: jsonb("details").$type<Record<string, unknown>>(),

    // Context
    requestId: text("request_id"),
    userId: text("user_id"),
    ip: text("ip"),

    // Error Grouping
    errorGroupId: integer("error_group_id").references(() => errorGroups.id, { onDelete: "set null" }),
  },
  (table) => ({
    levelIdx: index("log_level_idx").on(table.level),
    componentIdx: index("log_component_idx").on(table.component),
    timestampIdx: index("log_timestamp_idx").on(table.timestamp),
    errorGroupIdx: index("log_error_group_idx").on(table.errorGroupId),
  })
);

export const errorGroupsRelations = relations(errorGroups, ({ many }) => ({
  logs: many(systemLogs),
}));

export const systemLogsRelations = relations(systemLogs, ({ one }) => ({
  errorGroup: one(errorGroups, {
    fields: [systemLogs.errorGroupId],
    references: [errorGroups.id],
  }),
}));
