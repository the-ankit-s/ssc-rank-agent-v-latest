import { z } from "zod";

/**
 * Exam form validation schema
 */
export const examSchema = z.object({
    name: z.string().min(3, "Exam name must be at least 3 characters"),
    slug: z.string().min(3).regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens"),
    agency: z.enum(["SSC", "RRB", "IBPS", "TCS", "NTA", "STATE_GOVT"]),
    year: z.number().min(2020).max(2030),
    tier: z.string().optional(),
    totalMarks: z.number().positive("Total marks must be positive"),
    totalQuestions: z.number().positive("Total questions must be positive"),
    duration: z.number().positive("Duration must be positive"),
    defaultPositive: z.number().positive(),
    defaultNegative: z.number().nonnegative(),
    hasSectionalTiming: z.boolean().default(false),
    hasNormalization: z.boolean().default(true),
    allowMultipleSubmissions: z.boolean().default(false),
    answerKeyUrl: z.string().url().optional().or(z.literal("")),
    officialWebsite: z.string().url().optional().or(z.literal("")),
});

export type ExamFormData = z.infer<typeof examSchema>;

/**
 * Shift form validation schema
 */
export const shiftSchema = z.object({
    examId: z.number().positive(),
    shiftCode: z.string().min(3),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
    shiftNumber: z.number().positive(),
    timeSlot: z.enum(["morning", "afternoon", "evening"]).optional(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
});

export type ShiftFormData = z.infer<typeof shiftSchema>;

/**
 * Submission validation schema
 */
export const submissionSchema = z.object({
    examId: z.number().positive(),
    shiftId: z.number().positive(),
    rollNumber: z.string().min(5, "Roll number must be at least 5 characters"),
    name: z.string().min(2, "Name must be at least 2 characters"),
    category: z.enum(["UR", "OBC", "EWS", "SC", "ST"]),
    gender: z.enum(["M", "F", "O"]),
    state: z.string().optional(),
    rawScore: z.number().nonnegative(),
});

export type SubmissionFormData = z.infer<typeof submissionSchema>;

/**
 * Cutoff form validation schema
 */
export const cutoffSchema = z.object({
    examId: z.number().positive(),
    category: z.string().min(2),
    postCode: z.string().optional(),
    postName: z.string().optional(),
    expectedCutoff: z.number().nonnegative(),
    safeScore: z.number().nonnegative().optional(),
    minimumScore: z.number().nonnegative().optional(),
    previousYearCutoff: z.number().nonnegative().optional(),
    confidenceLevel: z.enum(["low", "medium", "high"]).optional(),
});

export type CutoffFormData = z.infer<typeof cutoffSchema>;

/**
 * Admin login validation schema
 */
export const adminLoginSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
});

export type AdminLoginFormData = z.infer<typeof adminLoginSchema>;

/**
 * URL parser validation
 */
export const urlParserSchema = z.object({
    url: z.string().url("Invalid URL format"),
    password: z.string().optional(),
});

export type UrlParserFormData = z.infer<typeof urlParserSchema>;

/**
 * Filter/search schemas
 */
export const examFiltersSchema = z.object({
    agency: z.string().optional(),
    year: z.string().optional(),
    status: z.string().optional(),
    search: z.string().optional(),
    page: z.coerce.number().positive().default(1),
    limit: z.coerce.number().positive().max(100).default(20),
});

export type ExamFilters = z.infer<typeof examFiltersSchema>;

export const submissionFiltersSchema = z.object({
    examId: z.coerce.number().positive().optional(),
    shiftId: z.coerce.number().positive().optional(),
    category: z.string().optional(),
    minScore: z.coerce.number().optional(),
    maxScore: z.coerce.number().optional(),
    search: z.string().optional(),
    page: z.coerce.number().positive().default(1),
    limit: z.coerce.number().positive().max(100).default(20),
});

export type SubmissionFilters = z.infer<typeof submissionFiltersSchema>;
