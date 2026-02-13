/**
 * Batch Processing Service
 * 
 * Runs normalization, ranking, and cutoff calculation for ALL exams
 * that have pending submissions. Designed to be called by:
 * 1. Admin "Run Batch Now" button
 * 2. Scheduled cron job
 * 3. Threshold auto-trigger
 * 
 * Processes exams one at a time to avoid locking the entire DB.
 */

import { db } from "@/lib/db";
import { submissions, exams, shifts, cutoffs, jobRuns } from "@/lib/db/schema";
import { eq, sql, and, count, isNotNull } from "drizzle-orm";
import { getNormalizedScore, type NormalizationParams } from "@/lib/normalization/formulas";


// ─── Types ─────────────────────────────────────────────────────────────────

export interface BatchResult {
    examsProcessed: number;
    totalSubmissions: number;
    errors: string[];
    duration: number; // ms
}

// ─── Main Entry Point ──────────────────────────────────────────────────────

/**
 * Run batch processing for all exams with pending submissions.
 * Returns progress info for the admin UI.
 */
export async function runBatchProcessing(jobId?: number): Promise<BatchResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let totalProcessed = 0;

    try {
        // 1. Find all exams that have pending submissions
        const examsWithPending = await db
            .selectDistinct({ examId: submissions.examId })
            .from(submissions)
            .where(eq(submissions.processingStatus, "pending"));

        const examIds = examsWithPending.map((e) => e.examId);

        if (examIds.length === 0) {
            if (jobId) {
                await updateJobProgress(jobId, 100, 0, 0, "No pending submissions");
            }
            return { examsProcessed: 0, totalSubmissions: 0, errors: [], duration: Date.now() - startTime };
        }

        // 2. Process each exam individually
        for (let i = 0; i < examIds.length; i++) {
            const examId = examIds[i];

            try {
                // Mark pending → processing for this exam
                await db.update(submissions)
                    .set({ processingStatus: "processing" })
                    .where(and(
                        eq(submissions.examId, examId),
                        eq(submissions.processingStatus, "pending"),
                    ));

                // Count processing
                const [countResult] = await db
                    .select({ c: count() })
                    .from(submissions)
                    .where(and(
                        eq(submissions.examId, examId),
                        eq(submissions.processingStatus, "processing"),
                    ));
                const processingCount = countResult?.c || 0;

                // Step A: Normalize ALL submissions for this exam (not just pending)
                await normalizeAllForExam(examId);

                // Step B: Recalculate ALL ranks for this exam
                await recalculateRanks(examId);

                // Step C: Recalculate cutoffs
                await recalculateCutoffs(examId);

                // Step D: Mark processing → ready
                await db.update(submissions)
                    .set({ processingStatus: "ready", updatedAt: new Date() })
                    .where(and(
                        eq(submissions.examId, examId),
                        eq(submissions.processingStatus, "processing"),
                    ));

                // Step E: Update exam metadata
                const [totalCount] = await db
                    .select({ c: count() })
                    .from(submissions)
                    .where(eq(submissions.examId, examId));

                await db.update(exams)
                    .set({
                        lastNormalizedAt: new Date(),
                        subsAtLastNormalization: totalCount?.c || 0,
                    })
                    .where(eq(exams.id, examId));

                totalProcessed += processingCount;

                // Update job progress
                if (jobId) {
                    const pct = Math.round(((i + 1) / examIds.length) * 100);
                    await updateJobProgress(jobId, pct, totalProcessed, examIds.length,
                        `Processed exam ${i + 1}/${examIds.length}`);
                }

            } catch (examError) {
                const msg = `Exam ${examId}: ${examError instanceof Error ? examError.message : String(examError)}`;
                console.error(`Batch error for exam ${examId}:`, examError);
                errors.push(msg);

                // Mark failed submissions back to pending so they retry next batch
                await db.update(submissions)
                    .set({ processingStatus: "pending" })
                    .where(and(
                        eq(submissions.examId, examId),
                        eq(submissions.processingStatus, "processing"),
                    ));
            }
        }

    } catch (error) {
        errors.push(`Fatal: ${error instanceof Error ? error.message : String(error)}`);
    }

    return {
        examsProcessed: (await db.selectDistinct({ examId: submissions.examId }).from(submissions).where(eq(submissions.processingStatus, "ready"))).length,
        totalSubmissions: totalProcessed,
        errors,
        duration: Date.now() - startTime,
    };
}

// ─── Normalize All Submissions for an Exam ─────────────────────────────────

async function normalizeAllForExam(examId: number): Promise<void> {
    // Get exam config
    const [exam] = await db.select({
        normalizationMethod: exams.normalizationMethod,
        normalizationConfig: exams.normalizationConfig,
        totalMarks: exams.totalMarks,
    }).from(exams).where(eq(exams.id, examId));

    if (!exam) {
        console.warn(`[Batch] Exam ${examId} not found, skipping normalization`);
        return;
    }

    console.log(`[Batch] Normalizing exam ${examId}, method: ${exam.normalizationMethod}`);

    // Get all shifts for this exam
    const examShifts = await db.select({
        id: shifts.id,
        avgRawScore: shifts.avgRawScore,
        stdDev: shifts.stdDev,
        candidateCount: shifts.candidateCount,
    }).from(shifts).where(eq(shifts.examId, examId));

    console.log(`[Batch] Found ${examShifts.length} shifts for exam ${examId}`);

    // Step 1: ALWAYS update per-shift stats from actual data
    for (const shift of examShifts) {
        const [stats] = await db.select({
            avg: sql<number>`AVG(raw_score)`,
            std: sql<number>`COALESCE(STDDEV(raw_score), 0)`,
            cnt: sql<number>`COUNT(*)`,
            maxScore: sql<number>`MAX(raw_score)`,
            minScore: sql<number>`MIN(raw_score)`,
        }).from(submissions).where(and(
            eq(submissions.examId, examId),
            eq(submissions.shiftId, shift.id),
        ));

        if (stats) {
            console.log(`[Batch] Shift ${shift.id}: avg=${stats.avg}, std=${stats.std}, count=${stats.cnt}, max=${stats.maxScore}, min=${stats.minScore}`);
            await db.update(shifts).set({
                avgRawScore: stats.avg || 0,
                stdDev: stats.std || 0,
                candidateCount: stats.cnt || 0,
                maxRawScore: stats.maxScore || 0,
                minRawScore: stats.minScore || 0,
                statsUpdatedAt: new Date(),
            }).where(eq(shifts.id, shift.id));
        }
    }

    // Step 2: Determine normalization method
    const method = exam.normalizationMethod || "z_score";

    // If only 1 shift or method is "raw", just set normalized = raw
    if (method === "raw" || examShifts.length <= 1) {
        console.log(`[Batch] Using raw score as normalized (method=${method}, shifts=${examShifts.length})`);
        await db.execute(sql`
            UPDATE submissions 
            SET normalized_score = raw_score 
            WHERE exam_id = ${examId}
        `);
        return;
    }

    // Get fresh global stats
    const [globalStats] = await db.select({
        avg: sql<number>`AVG(raw_score)`,
        std: sql<number>`COALESCE(STDDEV(raw_score), 1)`,
    }).from(submissions).where(eq(submissions.examId, examId));

    const globalMean = Number(globalStats?.avg) || 0;
    const globalStdDev = Number(globalStats?.std) || 1;

    // For z_score: do bulk UPDATE via SQL (fastest method)
    if (method === "z_score") {
        await db.execute(sql`
            UPDATE submissions s
            SET normalized_score = 
                CASE 
                    WHEN sh.std_dev IS NULL OR CAST(sh.std_dev AS DOUBLE PRECISION) = 0 
                    THEN s.raw_score
                    ELSE ((s.raw_score - CAST(sh.avg_raw_score AS DOUBLE PRECISION)) 
                          / CAST(sh.std_dev AS DOUBLE PRECISION)) 
                          * ${globalStdDev} + ${globalMean}
                END
            FROM shifts sh
            WHERE s.shift_id = sh.id AND s.exam_id = ${examId}
        `);
        return;
    }

    if (method === "raw") {
        await db.execute(sql`
            UPDATE submissions SET normalized_score = raw_score WHERE exam_id = ${examId}
        `);
        return;
    }

    // For other methods, fall back to row-by-row (slow but correct)
    const allSubs = await db.select({
        id: submissions.id,
        shiftId: submissions.shiftId,
        rawScore: submissions.rawScore,
    }).from(submissions).where(eq(submissions.examId, examId));

    // Refresh shift stats after the update
    const freshShifts = await db.select({
        id: shifts.id,
        avgRawScore: shifts.avgRawScore,
        stdDev: shifts.stdDev,
        candidateCount: shifts.candidateCount,
    }).from(shifts).where(eq(shifts.examId, examId));

    const shiftMap = new Map(freshShifts.map((s) => [s.id, s]));

    for (const sub of allSubs) {
        const shift = shiftMap.get(sub.shiftId);
        if (!shift) continue;

        const params: NormalizationParams = {
            rawScore: sub.rawScore,
            shiftMean: Number(shift.avgRawScore) || 0,
            shiftStdDev: Number(shift.stdDev) || 1,
            globalMean,
            globalStdDev,
            maxMarks: exam.totalMarks,
            totalInShift: shift.candidateCount || 1,
            rankInShift: 1, // Approximate
            config: exam.normalizationConfig || undefined,
        };

        const normalizedScore = getNormalizedScore(method, params);
        await db.update(submissions)
            .set({ normalizedScore })
            .where(eq(submissions.id, sub.id));
    }
}

// ─── Rank Recalculation (reused from incremental-normalization) ────────────

async function recalculateRanks(examId: number): Promise<void> {
    console.log(`[Batch] Recalculating ranks for exam ${examId}`);

    // Overall Ranks
    await db.execute(sql`
        WITH RankedSubmissions AS (
            SELECT 
                id,
                RANK() OVER (
                    PARTITION BY exam_id 
                    ORDER BY normalized_score DESC, raw_score DESC, dob DESC
                ) as new_rank,
                PERCENT_RANK() OVER (
                    PARTITION BY exam_id 
                    ORDER BY normalized_score ASC
                ) as new_percentile
            FROM submissions
            WHERE exam_id = ${examId}
        )
        UPDATE submissions
        SET 
            overall_rank = RankedSubmissions.new_rank,
            overall_percentile = RankedSubmissions.new_percentile * 100
        FROM RankedSubmissions
        WHERE submissions.id = RankedSubmissions.id;
    `);

    // Category Ranks
    await db.execute(sql`
        WITH RankedSubmissions AS (
            SELECT 
                id,
                RANK() OVER (
                    PARTITION BY exam_id, category 
                    ORDER BY normalized_score DESC, raw_score DESC, dob DESC
                ) as new_rank,
                PERCENT_RANK() OVER (
                    PARTITION BY exam_id, category 
                    ORDER BY normalized_score ASC
                ) as new_percentile
            FROM submissions
            WHERE exam_id = ${examId}
        )
        UPDATE submissions
        SET 
            category_rank = RankedSubmissions.new_rank,
            category_percentile = RankedSubmissions.new_percentile * 100
        FROM RankedSubmissions
        WHERE submissions.id = RankedSubmissions.id;
    `);

    // Shift Ranks
    await db.execute(sql`
        WITH RankedSubmissions AS (
            SELECT 
                id,
                RANK() OVER (
                    PARTITION BY shift_id 
                    ORDER BY normalized_score DESC, raw_score DESC, dob DESC
                ) as new_rank,
                PERCENT_RANK() OVER (
                    PARTITION BY shift_id 
                    ORDER BY normalized_score ASC
                ) as new_percentile
            FROM submissions
            WHERE exam_id = ${examId}
        )
        UPDATE submissions
        SET 
            shift_rank = RankedSubmissions.new_rank,
            shift_percentile = RankedSubmissions.new_percentile * 100
        FROM RankedSubmissions
        WHERE submissions.id = RankedSubmissions.id;
    `);
}

// ─── Cutoff Recalculation ──────────────────────────────────────────────────

async function recalculateCutoffs(examId: number): Promise<void> {
    const selectionRatios: Record<string, number> = {
        UR: 0.15, OBC: 0.18, EWS: 0.18, SC: 0.20, ST: 0.25,
    };

    const categoriesResult = await db
        .selectDistinct({ category: submissions.category })
        .from(submissions)
        .where(eq(submissions.examId, examId));

    const categories = categoriesResult.map((c) => c.category).filter(Boolean) as string[];

    for (const category of categories) {
        const ratio = selectionRatios[category] || 0.15;

        const [result] = await db.execute(sql`
            SELECT PERCENTILE_CONT(${1 - ratio}) WITHIN GROUP (ORDER BY normalized_score) as cutoff
            FROM submissions
            WHERE exam_id = ${examId} AND category = ${category} AND normalized_score IS NOT NULL
        `);

        const [countResult] = await db
            .select({ count: count() })
            .from(submissions)
            .where(and(eq(submissions.examId, examId), eq(submissions.category, category as any)));

        const dataPoints = countResult?.count || 0;
        const predictedScore = Number((result as any).cutoff) || 0;

        await db
            .insert(cutoffs)
            .values({
                examId,
                category,
                postCode: "PREDICTION",
                postName: "Generated Prediction",
                expectedCutoff: predictedScore,
                safeScore: predictedScore + 5,
                minimumScore: predictedScore - 5,
                confidenceLevel: dataPoints > 100 ? "high" : "medium",
                predictionBasis: {
                    dataPoints,
                    methodology: "percentile_distribution",
                    factors: ["normalized_scores", "category_ratio", "batch_processing"],
                },
            })
            .onConflictDoUpdate({
                target: [cutoffs.examId, cutoffs.category, cutoffs.postCode],
                set: {
                    expectedCutoff: predictedScore,
                    safeScore: predictedScore + 5,
                    minimumScore: predictedScore - 5,
                    confidenceLevel: dataPoints > 100 ? "high" : "medium",
                    updatedAt: new Date(),
                    predictionBasis: {
                        dataPoints,
                        methodology: "percentile_distribution",
                        factors: ["normalized_scores", "category_ratio", "batch_processing"],
                    },
                },
            });
    }
}

// ─── Helpers ───────────────────────────────────────────────────────────────

async function updateJobProgress(
    jobId: number,
    percent: number,
    recordsProcessed: number,
    totalRecords: number,
    message: string,
) {
    await db.update(jobRuns)
        .set({
            progressPercent: percent,
            recordsProcessed,
            totalRecords,
            metadata: { message } as any,
        })
        .where(eq(jobRuns.id, jobId));
}

// ─── Pending Count ─────────────────────────────────────────────────────────

/**
 * Get the number of pending submissions across all exams. 
 * Used by admin UI and batch-check to determine if threshold is met.
 */
export async function getPendingCount(): Promise<number> {
    const [result] = await db
        .select({ c: count() })
        .from(submissions)
        .where(eq(submissions.processingStatus, "pending"));
    return result?.c || 0;
}
