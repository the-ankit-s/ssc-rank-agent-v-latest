
import { db } from "@/lib/db";
import { jobRuns, jobTypeEnum } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Import job definitions (we will create these next)
import { calculateRanks } from "./definitions/rank-calculation";
import { normalizeScores } from "./definitions/normalization";
import { predictCutoffs } from "./definitions/cutoff-prediction";
import { cleanupData } from "./definitions/cleanup";
import { updateAnalytics } from "./definitions/analytics";
import { performBackup } from "./definitions/backup";

// Define the job function signature
export type JobFunction = (jobId: number, metadata?: any) => Promise<void>;

// Registry mapping job types to functions
export const jobRegistry: Record<string, JobFunction> = {
    rank_calculation: calculateRanks,
    normalization: normalizeScores,
    cutoff_prediction: predictCutoffs,
    cleanup: cleanupData,
    analytics: updateAnalytics,
    backup: performBackup,
};

// Helper to get job type enum valid values
export const validJobTypes = jobTypeEnum.enumValues;

