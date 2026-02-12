import { pgTable, serial, text, integer, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { submissions } from "./exams";
import { adminUsers } from "./admin";

export const resultViews = pgTable(
  "result_views",
  {
    id: serial("id").primaryKey(),
    submissionId: integer("submission_id")
      .references(() => submissions.id, { onDelete: "cascade" })
      .notNull(),
    viewerIp: text("viewer_ip"),
    viewerLocation: text("viewer_location"),
    timestamp: timestamp("timestamp").defaultNow(),
  },
  (table) => ({
    submissionIdx: index("result_view_submission_idx").on(table.submissionId),
    timestampIdx: index("result_view_timestamp_idx").on(table.timestamp),
  })
);

export const userFeedback = pgTable(
  "user_feedback",
  {
    id: serial("id").primaryKey(),
    submissionId: integer("submission_id").references(() => submissions.id, {
      onDelete: "cascade",
    }),
    rating: integer("rating").notNull(),
    comment: text("comment"),
    feedbackType: text("feedback_type").notNull(),
    isResolved: boolean("is_resolved").default(false),
    resolvedBy: integer("resolved_by").references(() => adminUsers.id),
    resolvedAt: timestamp("resolved_at"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    typeIdx: index("feedback_type_idx").on(table.feedbackType),
    ratingIdx: index("feedback_rating_idx").on(table.rating),
  })
);

export const resultViewsRelations = relations(resultViews, ({ one }) => ({
  submission: one(submissions, {
    fields: [resultViews.submissionId],
    references: [submissions.id],
  }),
}));

export const userFeedbackRelations = relations(userFeedback, ({ one }) => ({
  submission: one(submissions, {
    fields: [userFeedback.submissionId],
    references: [submissions.id],
  }),
}));
