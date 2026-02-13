
import { db } from "@/lib/db";
import { cutoffs, submissions } from "@/lib/db/schema";
import { eq, sql, and, isNull, count } from "drizzle-orm";
import { JobContext } from "../helpers";

export async function predictCutoffs(jobId: number, metadata?: any) {
    const ctx = new JobContext(jobId);
    const examIds = await ctx.getExamIds(metadata);

    if (examIds.length === 0) {
        await ctx.updateProgress(100, "No active exams found to process.");
        return;
    }

    // Selection ratios by category (the percentage of candidates expected to qualify)
    const selectionRatios: Record<string, number> = {
        UR: 0.15, OBC: 0.18, EWS: 0.18, SC: 0.20, ST: 0.25,
    };

    // Pre-compute total categories across all exams for progress tracking
    let totalCategories = 0;
    const examCategories: Map<number, string[]> = new Map();
    const warnings: string[] = [];
    const skippedExams: number[] = [];

    for (const examId of examIds) {
        // Safety check: verify normalization is done (≥90%) before predicting
        const [{ c: totalSubs }] = await db.select({ c: count() }).from(submissions).where(eq(submissions.examId, examId));
        const [{ c: unnormalized }] = await db.select({ c: count() }).from(submissions)
            .where(and(eq(submissions.examId, examId), isNull(submissions.normalizedScore)));

        const normalizedRatio = totalSubs > 0 ? (totalSubs - unnormalized) / totalSubs : 0;

        if (normalizedRatio < 0.9) {
            const msg = `⚠ Exam ${examId}: Only ${Math.round(normalizedRatio * 100)}% normalized (${totalSubs - unnormalized}/${totalSubs}) — skipping to avoid incorrect predictions. Run normalization first.`;
            warnings.push(msg);
            skippedExams.push(examId);
            continue; // SKIP this exam — don't produce wrong cutoffs
        }

        const categoriesResult = await db
            .selectDistinct({ category: submissions.category })
            .from(submissions)
            .where(eq(submissions.examId, examId));

        const cats = categoriesResult.map(c => c.category).filter(Boolean) as string[];
        examCategories.set(examId, cats);
        totalCategories += cats.length;
    }

    if (examCategories.size === 0) {
        const warnSummary = warnings.length > 0
            ? `All exams skipped — normalization required. ${warnings[0]}`
            : "No eligible exams found.";
        await ctx.updateProgress(100, warnSummary);
        return;
    }

    await ctx.setTotal(totalCategories);
    const skipNote = skippedExams.length > 0 ? ` (${skippedExams.length} exam(s) skipped — not normalized)` : "";
    await ctx.updateProgress(5, `Processing ${examCategories.size} exam(s), ${totalCategories} categories${skipNote}`);

    let processedExams = 0;
    for (const [examId, categories] of examCategories) {
        const pct = Math.round((processedExams / examCategories.size) * 85) + 10;
        await ctx.updateProgress(pct, `Predicting cutoffs for exam ${examId} (${processedExams + 1}/${examCategories.size})…`);

        for (const category of categories) {
            const ratio = selectionRatios[category] || 0.15;

            // Calculate cutoff at the (1 - ratio) percentile of normalized scores ONLY
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
                        factors: ["normalized_scores", "category_ratio"],
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
                            factors: ["normalized_scores", "category_ratio"],
                        },
                    },
                });

            await ctx.incrementProcessed(1);
        }
        processedExams++;
    }

    const summary = warnings.length > 0
        ? `Cutoff prediction complete: ${totalCategories} predictions for ${examCategories.size} exam(s). ${warnings.length} exam(s) skipped (not normalized).`
        : `Cutoff prediction complete: ${totalCategories} predictions for ${examCategories.size} exam(s)`;
    await ctx.updateProgress(100, summary);
}
