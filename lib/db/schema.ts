import { pgTable, serial, text, integer, real, boolean, timestamp, jsonb, uniqueIndex, index, pgEnum } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// ============================================
// ENUMS
// ============================================

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

// ============================================
// TYPESCRIPT INTERFACES
// ============================================

export interface SectionConfig {
    code: string;
    label: string;
    maxMarks: number;
    questions: number;
    positive: number;
    negative: number;
    order: number;
    isQualifying: boolean;
    timeLimit?: number;
}

export interface SectionPerformance {
    marks: number;
    correct: number;
    wrong: number;
    unattempted: number;
    accuracy?: number;
    percentile?: number;
}

export interface JobMetadata {
    examId?: number;
    shiftId?: number;
    durationMs?: number;
    triggeredBy?: string;
    affectedRows?: number;
}

export interface PercentileCutoffs {
    [percentile: string]: number;
}

// ============================================
// ADMIN TABLES
// ============================================

export const adminUsers = pgTable(
    "admin_users",
    {
        id: serial("id").primaryKey(),
        email: text("email").notNull().unique(),
        passwordHash: text("password_hash").notNull(),
        name: text("name").notNull(),
        role: text("role").notNull().default("admin"), // admin, super_admin, viewer
        isActive: boolean("is_active").default(true),
        lastLoginAt: timestamp("last_login_at"),
        createdAt: timestamp("created_at").defaultNow(),
        updatedAt: timestamp("updated_at").defaultNow(),
    },
    (table) => ({
        emailIdx: uniqueIndex("admin_email_idx").on(table.email),
    })
);

export const adminSessions = pgTable(
    "admin_sessions",
    {
        id: serial("id").primaryKey(),
        adminUserId: integer("admin_user_id")
            .references(() => adminUsers.id, { onDelete: "cascade" })
            .notNull(),
        token: text("token").notNull().unique(),
        expiresAt: timestamp("expires_at").notNull(),
        createdAt: timestamp("created_at").defaultNow(),
    },
    (table) => ({
        tokenIdx: uniqueIndex("session_token_idx").on(table.token),
        userIdIdx: index("session_user_idx").on(table.adminUserId),
    })
);

export const auditLogs = pgTable(
    "audit_logs",
    {
        id: serial("id").primaryKey(),
        adminUserId: integer("admin_user_id").references(() => adminUsers.id),

        entity: auditEntityEnum("entity").notNull(),
        entityId: integer("entity_id"),
        action: auditActionEnum("action").notNull(),

        oldValues: jsonb("old_values").$type<Record<string, unknown>>(),
        newValues: jsonb("new_values").$type<Record<string, unknown>>(),

        ip: text("ip"),
        userAgent: text("user_agent"),

        timestamp: timestamp("timestamp").defaultNow(),
    },
    (table) => ({
        entityIdx: index("audit_entity_idx").on(table.entity, table.entityId),
        timestampIdx: index("audit_timestamp_idx").on(table.timestamp),
        userIdx: index("audit_user_idx").on(table.adminUserId),
    })
);

export const systemSettings = pgTable(
    "system_settings",
    {
        id: serial("id").primaryKey(),
        key: text("key").notNull().unique(),
        value: jsonb("value").$type<unknown>().notNull(),
        category: text("category").notNull(), // general, parsing, calculation, performance, security
        description: text("description"),
        updatedBy: integer("updated_by").references(() => adminUsers.id),
        updatedAt: timestamp("updated_at").defaultNow(),
    },
    (table) => ({
        keyIdx: uniqueIndex("setting_key_idx").on(table.key),
        categoryIdx: index("setting_category_idx").on(table.category),
    })
);

export const notifications = pgTable(
    "notifications",
    {
        id: serial("id").primaryKey(),
        type: notificationTypeEnum("type").notNull(),
        channel: notificationChannelEnum("channel").notNull(),
        title: text("title").notNull(),
        message: text("message").notNull(),
        metadata: jsonb("metadata").$type<Record<string, unknown>>(),
        isRead: boolean("is_read").default(false),
        createdAt: timestamp("created_at").defaultNow(),
    },
    (table) => ({
        typeIdx: index("notification_type_idx").on(table.type),
        createdAtIdx: index("notification_created_idx").on(table.createdAt),
    })
);

// ============================================
// CORE EXAM TABLES
// ============================================

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

// ============================================
// ANALYTICS TABLES
// ============================================

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

// ============================================
// USER ENGAGEMENT TABLES
// ============================================

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

// ============================================
// SYSTEM TABLES
// ============================================

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

// ============================================
// RELATIONS
// ============================================

export const adminUsersRelations = relations(adminUsers, ({ many }) => ({
    sessions: many(adminSessions),
    auditLogs: many(auditLogs),
}));

export const adminSessionsRelations = relations(adminSessions, ({ one }) => ({
    adminUser: one(adminUsers, {
        fields: [adminSessions.adminUserId],
        references: [adminUsers.id],
    }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
    adminUser: one(adminUsers, {
        fields: [auditLogs.adminUserId],
        references: [adminUsers.id],
    }),
}));

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

export const errorGroupsRelations = relations(errorGroups, ({ many }) => ({
    logs: many(systemLogs),
}));

export const systemLogsRelations = relations(systemLogs, ({ one }) => ({
    errorGroup: one(errorGroups, {
        fields: [systemLogs.errorGroupId],
        references: [errorGroups.id],
    }),
}));

export const cutoffsRelations = relations(cutoffs, ({ one }) => ({
    exam: one(exams, {
        fields: [cutoffs.examId],
        references: [exams.id],
    }),
}));

export const dailyAnalyticsRelations = relations(dailyAnalytics, ({ one }) => ({
    exam: one(exams, {
        fields: [dailyAnalytics.examId],
        references: [exams.id],
    }),
}));

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
