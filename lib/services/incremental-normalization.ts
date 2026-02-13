/**
 * Incremental Normalization & Re-evaluation Service
 *
 * After the batch normalization job runs, new submissions continue to arrive.
 * This service decides whether those new submissions are significant enough to
 * trigger a full re-normalization, or whether to slot them into the existing
 * normalization curve using cached per-shift statistics.
 *
 * Pipeline:
 *  1. checkSignificance() — compare new-submission count against threshold
 *  2. normalizeNewSubmission() — apply cached shift stats to one new submission
 *  3. recalculateRanks() — re-run SQL window functions for the entire exam
 *  4. recalculateCutoffs() — re-compute percentile-based cutoffs
 */

import { db } from "@/lib/db";
import { exams, submissions, shifts, cutoffs } from "@/lib/db/schema";
import { eq, sql, and, isNull, count } from "drizzle-orm";
import { getNormalizedScore, type NormalizationParams } from "@/lib/normalization/formulas";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SignificanceResult {
    isSignificant: boolean;
    newCount: number;
    totalCount: number;
    subsAtLastNorm: number;
    threshold: number;       // percentage
    percentNew: number;      // actual percentage of new subs
    lastNormalizedAt: Date | null;
}

// ─── Significance Check ─────────────────────────────────────────────────────

/**
 * Determine if the number of new submissions since last normalization
 * is significant enough to warrant a full re-normalization.
 */
export async function checkSignificance(examId: number): Promise<SignificanceResult> {
    const [exam] = await db
        .select({
            totalSubmissions: exams.totalSubmissions,
            subsAtLastNormalization: exams.subsAtLastNormalization,
            reNormThreshold: exams.reNormThreshold,
            lastNormalizedAt: exams.lastNormalizedAt,
        })
        .from(exams)
        .where(eq(exams.id, examId));

    if (!exam) {
        return {
            isSignificant: false,
            newCount: 0,
            totalCount: 0,
            subsAtLastNorm: 0,
            threshold: 5,
            percentNew: 0,
            lastNormalizedAt: null,
        };
    }

    const total = exam.totalSubmissions || 0;
    const atLastNorm = exam.subsAtLastNormalization || 0;
    const threshold = exam.reNormThreshold || 5;
    const newCount = total - atLastNorm;
    const percentNew = atLastNorm > 0 ? (newCount / atLastNorm) * 100 : (newCount > 0 ? 100 : 0);

    return {
        isSignificant: percentNew >= threshold,
        newCount,
        totalCount: total,
        subsAtLastNorm: atLastNorm,
        threshold,
        percentNew: Math.round(percentNew * 100) / 100,
        lastNormalizedAt: exam.lastNormalizedAt,
    };
}

// ─── Incremental Normalization (single submission) ──────────────────────────

/**
 * Normalize a single new submission using cached per-shift statistics.
 * This avoids recalculating stats for the entire exam — we simply read
 * the shift's existing mean/stddev and apply the same formula.
 *
 * Returns the computed normalized score, or null if shift stats aren't available.
 */
export async function normalizeNewSubmission(
    submissionId: number,
    examId: number,
    shiftId: number,
    rawScore: number,
): Promise<number | null> {
    // 1. Get exam normalization config
    const [exam] = await db
        .select({
            normalizationMethod: exams.normalizationMethod,
            normalizationConfig: exams.normalizationConfig,
            hasNormalization: exams.hasNormalization,
            totalMarks: exams.totalMarks,
            lastNormalizedAt: exams.lastNormalizedAt,
        })
        .from(exams)
        .where(eq(exams.id, examId));

    // Exam not found or normalization not enabled or never been normalized yet
    if (!exam || !exam.hasNormalization || !exam.lastNormalizedAt) {
        return null;
    }

    // 2. Get cached shift stats
    const [shift] = await db
        .select({
            candidateCount: shifts.candidateCount,
            avgRawScore: shifts.avgRawScore,
            stdDev: shifts.stdDev,
        })
        .from(shifts)
        .where(eq(shifts.id, shiftId));

    if (!shift || !shift.avgRawScore) {
        return null; // No cached stats — can't normalize incrementally
    }

    const shiftMean = Number(shift.avgRawScore);
    const shiftStdDev = Number(shift.stdDev) || 0;
    const totalInShift = shift.candidateCount || 1;

    // 3. Get global stats (cached from last normalization, compute fresh for safety)
    const [globalStats] = await db
        .select({
            avg: sql<number>`AVG(raw_score)`,
            std: sql<number>`STDDEV(raw_score)`,
        })
        .from(submissions)
        .where(eq(submissions.examId, examId));

    const globalMean = globalStats?.avg ? Number(globalStats.avg) : 0;
    const globalStdDev = globalStats?.std ? Number(globalStats.std) : 1;

    const method = exam.normalizationMethod || "z_score";

    // 4. For z_score method, use the fast SQL-equivalent formula
    if (method === "z_score") {
        if (shiftStdDev === 0) {
            // Zero stddev shift — fallback to raw score
            await db
                .update(submissions)
                .set({ normalizedScore: rawScore })
                .where(eq(submissions.id, submissionId));
            return rawScore;
        }

        const normalizedScore =
            ((rawScore - shiftMean) / shiftStdDev) * globalStdDev + globalMean;

        await db
            .update(submissions)
            .set({ normalizedScore })
            .where(eq(submissions.id, submissionId));

        return normalizedScore;
    }

    if (method === "raw") {
        await db
            .update(submissions)
            .set({ normalizedScore: rawScore })
            .where(eq(submissions.id, submissionId));
        return rawScore;
    }

    // 5. For other methods (percentile, equating, modified_z, custom)
    //    use the formula engine with cached params
    // We need rank-in-shift for percentile methods — approximate via count of higher scores
    const [rankResult] = await db
        .select({ rank: sql<number>`count(*) + 1` })
        .from(submissions)
        .where(
            and(
                eq(submissions.shiftId, shiftId),
                sql`raw_score > ${rawScore}`,
            ),
        );

    const params: NormalizationParams = {
        rawScore,
        shiftMean,
        shiftStdDev,
        globalMean,
        globalStdDev,
        maxMarks: exam.totalMarks,
        totalInShift,
        rankInShift: rankResult?.rank || 1,
        config: exam.normalizationConfig || undefined,
    };

    const normalizedScore = getNormalizedScore(method, params);

    await db
        .update(submissions)
        .set({ normalizedScore })
        .where(eq(submissions.id, submissionId));

    return normalizedScore;
}

// ─── Rank Recalculation ─────────────────────────────────────────────────────

/**
 * Recalculate all ranks for an exam.
 * Uses the same SQL window functions as the batch rank-calculation job.
 * Ranks MUST always be recalculated against the full dataset — there's no
 * meaningful incremental shortcut for window functions.
 */
export async function recalculateRanks(examId: number): Promise<void> {
    // 1. Overall Ranks
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

    // 2. Category Ranks
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

    // 3. Shift Ranks
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

// ─── Cutoff Recalculation ───────────────────────────────────────────────────

/**
 * Recalculate cutoff predictions for an exam.
 * Same logic as the batch cutoff-prediction job.
 */
export async function recalculateCutoffs(examId: number): Promise<void> {
    const selectionRatios: Record<string, number> = {
        UR: 0.15, OBC: 0.18, EWS: 0.18, SC: 0.20, ST: 0.25,
    };

    // Get distinct categories for this exam
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
                    factors: ["normalized_scores", "category_ratio", "incremental_update"],
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
                        factors: ["normalized_scores", "category_ratio", "incremental_update"],
                    },
                },
            });
    }
}

// ─── Full Post-Submission Pipeline ──────────────────────────────────────────

/**
 * Called after a new submission is inserted.
 * Normalizes the submission, recalculates ranks, and optionally recalculates cutoffs.
 *
 * Returns an object describing what was done.
 */
export async function handlePostSubmission(
    submissionId: number,
    examId: number,
    shiftId: number,
    rawScore: number,
): Promise<{
    normalizedScore: number | null;
    ranksRecalculated: boolean;
    significance: SignificanceResult;
}> {
    // 1. Normalize this single submission using cached stats
    const normalizedScore = await normalizeNewSubmission(submissionId, examId, shiftId, rawScore);

    // 2. Always recalculate ranks (fast SQL window function, ~50ms for 10k rows)
    await recalculateRanks(examId);

    // 3. Check if we've crossed the significance threshold
    const significance = await checkSignificance(examId);

    // 4. If significant — recalculate cutoffs too (predictions change meaningfully)
    if (significance.isSignificant) {
        await recalculateCutoffs(examId);
    }

    return {
        normalizedScore,
        ranksRecalculated: true,
        significance,
    };
}
