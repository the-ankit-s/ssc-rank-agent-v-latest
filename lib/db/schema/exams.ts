import {
  pgTable,
  serial,
  text,
  integer,
  real,
  boolean,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import {
  agencyEnum,
  examStatusEnum,
  analysisPhaseEnum,
  categoryEnum,
  genderEnum,
  confidenceLevelEnum,
} from "./enums";
import type { SectionConfig, SectionPerformance, PercentileCutoffs } from "./interfaces";
import { adminUsers } from "./admin";

// Import tables for relations (late-bound, no circular dependency issue)
import { dailyAnalytics } from "./analytics";
import { resultViews, userFeedback } from "./engagement";

export const exams = pgTable(
  "exams",
  {
    id: serial("id").primaryKey(),

    // Identity
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    agency: agencyEnum("agency").notNull(),
    year: integer("year").notNull(),
    tier: text("tier"),

    // Exam Rules
    totalMarks: real("total_marks").notNull(),
    totalQuestions: integer("total_questions").notNull(),
    duration: integer("duration").notNull().default(60),

    // Marking Scheme
    defaultPositive: real("default_positive").notNull().default(2),
    defaultNegative: real("default_negative").notNull().default(0.5),

    // Dynamic Config
    sectionConfig: jsonb("section_config")
      .$type<Record<string, SectionConfig>>()
      .notNull(),

    // Feature Flags
    hasSectionalTiming: boolean("has_sectional_timing").default(false),
    hasNormalization: boolean("has_normalization").default(true),
    allowMultipleSubmissions: boolean("allow_multiple_submissions").default(false),

    // Status & Phases
    isActive: boolean("is_active").default(true),
    status: examStatusEnum("status").default("upcoming"),
    analysisPhase: analysisPhaseEnum("analysis_phase").default("collecting"),

    // Important Dates
    examStartDate: timestamp("exam_start_date"),
    examEndDate: timestamp("exam_end_date"),
    answerKeyReleaseDate: timestamp("answer_key_release_date"),

    // URLs
    answerKeyUrl: text("answer_key_url"),
    officialWebsite: text("official_website"),

    // UI/SEO
    isFeatured: boolean("is_featured").default(false),
    priorityOrder: integer("priority_order").default(0),
    metaDescription: text("meta_description"),
    ogImageUrl: text("og_image_url"),

    // Aggregated Stats
    totalShifts: integer("total_shifts").default(0),
    totalSubmissions: integer("total_submissions").default(0),
    lastSubmissionAt: timestamp("last_submission_at"),
    viewCount: integer("view_count").default(0),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    uniqueExam: uniqueIndex("unique_exam_idx").on(
      table.name,
      table.year,
      table.tier
    ),
    slugIdx: index("exam_slug_idx").on(table.slug),
    statusIdx: index("exam_status_idx").on(table.status),
    agencyYearIdx: index("exam_agency_year_idx").on(table.agency, table.year),
  })
);

export const shifts = pgTable(
  "shifts",
  {
    id: serial("id").primaryKey(),
    examId: integer("exam_id")
      .references(() => exams.id, { onDelete: "cascade" })
      .notNull(),

    // Identity
    shiftCode: text("shift_code").notNull().unique(),

    // Schedule
    date: text("date").notNull(),
    shiftNumber: integer("shift_number").notNull(),
    timeSlot: text("time_slot"),
    startTime: text("start_time"),
    endTime: text("end_time"),

    // Stats Cache
    candidateCount: integer("candidate_count").default(0),
    avgRawScore: real("avg_raw_score"),
    medianRawScore: real("median_raw_score"),
    stdDev: real("std_dev"),
    maxRawScore: real("max_raw_score"),
    minRawScore: real("min_raw_score"),

    // Percentile Distribution
    percentileCutoffs: jsonb("percentile_cutoffs").$type<PercentileCutoffs>(),

    // Section-wise Stats
    sectionStats: jsonb("section_stats").$type<
      Record<
        string,
        {
          avgScore: number;
          maxScore: number;
          avgAccuracy: number;
        }
      >
    >(),

    // Analysis
    difficultyIndex: real("difficulty_index"),
    difficultyLabel: text("difficulty_label"),
    normalizationFactor: real("normalization_factor"),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
    statsUpdatedAt: timestamp("stats_updated_at"),
  },
  (table) => ({
    uniqueShift: uniqueIndex("unique_shift_idx").on(
      table.examId,
      table.date,
      table.shiftNumber
    ),
    examDateIdx: index("exam_date_idx").on(table.examId, table.date),
    difficultyIdx: index("shift_difficulty_idx").on(table.difficultyIndex),
  })
);

export const submissions = pgTable(
  "submissions",
  {
    id: serial("id").primaryKey(),

    // Linkages
    examId: integer("exam_id")
      .references(() => exams.id, { onDelete: "cascade" })
      .notNull(),
    shiftId: integer("shift_id")
      .references(() => shifts.id, { onDelete: "cascade" })
      .notNull(),

    // User Identity
    rollNumber: text("roll_number").notNull(),
    rollNumberHash: text("roll_number_hash").notNull(),
    name: text("name").notNull(),
    fatherName: text("father_name"),
    dob: text("dob"),
    examCentre: text("exam_centre"),
    examCentreCode: text("exam_centre_code"),

    // Demographics
    category: categoryEnum("category").notNull(),
    gender: genderEnum("gender").notNull(),
    state: text("state"),
    horizontalCategory: text("horizontal_category").default("NONE"),
    isPWD: boolean("is_pwd").default(false),
    isExServiceman: boolean("is_ex_serviceman").default(false),

    // Dynamic Performance
    sectionPerformance: jsonb("section_performance")
      .$type<Record<string, SectionPerformance>>()
      .notNull(),

    // Question-wise Responses
    responses: jsonb("responses").$type<
      Array<{
        qNo: number;
        section: string;
        selected: string | null;
        correct: string;
        isCorrect: boolean;
      }>
    >(),

    // Aggregates
    totalAttempted: integer("total_attempted").default(0),
    totalCorrect: integer("total_correct").default(0),
    totalWrong: integer("total_wrong").default(0),
    accuracy: real("accuracy"),

    // Scoring
    rawScore: real("raw_score").notNull(),
    normalizedScore: real("normalized_score"),

    // Ranks
    overallRank: integer("overall_rank"),
    categoryRank: integer("category_rank"),
    shiftRank: integer("shift_rank"),
    stateRank: integer("state_rank"),

    // Percentiles
    overallPercentile: real("overall_percentile"),
    categoryPercentile: real("category_percentile"),
    shiftPercentile: real("shift_percentile"),

    // Metadata
    source: text("source").default("url_parser"),
    sourceUrl: text("source_url"),
    urlHash: text("url_hash"),
    submitterIp: text("submitter_ip"),

    // Result Management
    resultViewCount: integer("result_view_count").default(0),
    isResultPublic: boolean("is_result_public").default(false),
    resultShareToken: text("result_share_token").unique(),
    isDisputed: boolean("is_disputed").default(false),
    adminNotes: text("admin_notes"),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    uniqueRoll: uniqueIndex("unique_roll_idx").on(table.rollNumber, table.examId),
    urlHashIdx: uniqueIndex("url_hash_idx").on(table.urlHash),
    examShiftIdx: index("submission_exam_shift_idx").on(table.examId, table.shiftId),
    rankRawIdx: index("rank_raw_idx").on(table.examId, table.rawScore),
    rankNormIdx: index("rank_norm_idx").on(table.examId, table.normalizedScore),
    catRankIdx: index("cat_rank_idx").on(table.examId, table.category, table.rawScore),
    shiftRankIdx: index("shift_rank_idx").on(table.shiftId, table.rawScore),
    stateRankIdx: index("state_rank_idx").on(table.examId, table.state, table.rawScore),
    categoryIdx: index("submission_category_idx").on(table.category),
    createdAtIdx: index("submission_created_at_idx").on(table.createdAt),
    compositeRankIdx: index("submission_composite_rank_idx").on(
      table.examId,
      table.category,
      table.normalizedScore,
      table.rawScore
    ),
  })
);

export const cutoffs = pgTable(
  "cutoffs",
  {
    id: serial("id").primaryKey(),
    examId: integer("exam_id")
      .references(() => exams.id, { onDelete: "cascade" })
      .notNull(),

    // Identification
    category: text("category").notNull(),
    postCode: text("post_code"),
    postName: text("post_name"),

    // Predictions
    expectedCutoff: real("expected_cutoff").notNull(),
    safeScore: real("safe_score"),
    minimumScore: real("minimum_score"),

    // Historical Data
    previousYearCutoff: real("previous_year_cutoff"),
    previousYearVacancy: integer("previous_year_vacancy"),
    currentYearVacancy: integer("current_year_vacancy"),

    // Confidence
    confidenceLevel: confidenceLevelEnum("confidence_level"),
    predictionBasis: jsonb("prediction_basis").$type<{
      dataPoints: number;
      methodology: string;
      factors: string[];
    }>(),

    // Publishing
    isPublished: boolean("is_published").default(false),
    publishedAt: timestamp("published_at"),
    publishedBy: integer("published_by").references(() => adminUsers.id),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    uniqueCutoff: uniqueIndex("unique_cutoff_idx").on(
      table.examId,
      table.category,
      table.postCode
    ),
  })
);

export const examsRelations = relations(exams, ({ many }) => ({
  shifts: many(shifts),
  submissions: many(submissions),
  cutoffs: many(cutoffs),
  dailyAnalytics: many(dailyAnalytics),
}));

export const shiftsRelations = relations(shifts, ({ one, many }) => ({
  exam: one(exams, {
    fields: [shifts.examId],
    references: [exams.id],
  }),
  submissions: many(submissions),
}));

export const submissionsRelations = relations(submissions, ({ one, many }) => ({
  exam: one(exams, {
    fields: [submissions.examId],
    references: [exams.id],
  }),
  shift: one(shifts, {
    fields: [submissions.shiftId],
    references: [shifts.id],
  }),
  resultViews: many(resultViews),
  feedback: many(userFeedback),
}));

export const cutoffsRelations = relations(cutoffs, ({ one }) => ({
  exam: one(exams, {
    fields: [cutoffs.examId],
    references: [exams.id],
  }),
}));
