import { pgTable, serial, text, integer, real, boolean, timestamp, jsonb, uniqueIndex, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { exams } from "./exams";

export const dailyAnalytics = pgTable(
  "daily_analytics",
  {
    id: serial("id").primaryKey(),

    examId: integer("exam_id")
      .references(() => exams.id, { onDelete: "cascade" })
      .notNull(),

    date: text("date").notNull(),

    // Submission Stats
    newSubmissions: integer("new_submissions").default(0),
    totalSubmissions: integer("total_submissions").default(0),

    // Score Distribution
    avgScore: real("avg_score"),
    medianScore: real("median_score"),

    // Category Breakdown
    categoryBreakdown: jsonb("category_breakdown").$type<Record<string, number>>(),

    // Peak Hours
    peakHour: integer("peak_hour"),
    peakSubmissions: integer("peak_submissions"),

    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    uniqueDaily: uniqueIndex("unique_daily_analytics_idx").on(table.examId, table.date),
    dateIdx: index("daily_analytics_date_idx").on(table.date),
  })
);

export const scoreDistribution = pgTable(
  "score_distribution",
  {
    id: serial("id").primaryKey(),

    examId: integer("exam_id")
      .references(() => exams.id, { onDelete: "cascade" })
      .notNull(),
    shiftId: integer("shift_id"),

    bucketStart: real("bucket_start").notNull(),
    bucketEnd: real("bucket_end").notNull(),

    count: integer("count").default(0),
    percentage: real("percentage"),

    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    examBucketIdx: index("score_dist_exam_bucket_idx").on(table.examId, table.bucketStart),
  })
);

export const apiMetrics = pgTable(
  "api_metrics",
  {
    id: serial("id").primaryKey(),
    endpoint: text("endpoint").notNull(),
    method: text("method").notNull(),
    statusCode: integer("status_code").notNull(),
    responseTime: integer("response_time").notNull(),
    timestamp: timestamp("timestamp").defaultNow(),
    date: text("date").notNull(),
  },
  (table) => ({
    endpointIdx: index("api_metrics_endpoint_idx").on(table.endpoint),
    dateIdx: index("api_metrics_date_idx").on(table.date),
    timestampIdx: index("api_metrics_timestamp_idx").on(table.timestamp),
  })
);

export const parserStats = pgTable(
  "parser_stats",
  {
    id: serial("id").primaryKey(),
    domain: text("domain").notNull(),
    success: boolean("success").notNull(),
    parseTime: integer("parse_time"),
    errorMessage: text("error_message"),
    timestamp: timestamp("timestamp").defaultNow(),
    date: text("date").notNull(),
  },
  (table) => ({
    domainIdx: index("parser_domain_idx").on(table.domain),
    dateIdx: index("parser_date_idx").on(table.date),
  })
);

export const dailyAnalyticsRelations = relations(dailyAnalytics, ({ one }) => ({
  exam: one(exams, {
    fields: [dailyAnalytics.examId],
    references: [exams.id],
  }),
}));
