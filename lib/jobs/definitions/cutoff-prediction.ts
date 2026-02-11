
import { db } from "@/lib/db";
import { cutoffs, jobRuns, submissions, exams } from "@/lib/db/schema";
import { eq, sql, and, desc, count } from "drizzle-orm";

export async function predictCutoffs(jobId: number, metadata?: any) {
    let examIds: number[] = [];

    if (metadata?.examId) {
        examIds = [metadata.examId];
    } else {
        const allExams = await db.select({ id: exams.id }).from(exams).where(eq(exams.isActive, true));
        examIds = allExams.map(e => e.id);
    }

    if (examIds.length === 0) {
        await updateProgress(jobId, 100, "No active exams found to process.");
        return;
    }

    let processed = 0;
    for (const examId of examIds) {
        await updateProgress(jobId, Math.round((processed / examIds.length) * 80) + 10, `Predicting cutoffs for exam ${examId}...`);

        // 1. Get Distinct Categories from Submissions
        const categoriesResult = await db
            .selectDistinct({ category: submissions.category })
            .from(submissions)
            .where(eq(submissions.examId, examId));

        const categories = categoriesResult.map(c => c.category).filter(Boolean) as string[];

        const selectionRatios: Record<string, number> = {
            UR: 0.15,
            OBC: 0.18,
            EWS: 0.18,
            SC: 0.20,
            ST: 0.25,
        };

        for (const category of categories) {
            const ratio = selectionRatios[category] || 0.15;

            const [result] = await db.execute(sql`
                SELECT PERCENTILE_CONT(${1 - ratio}) WITHIN GROUP (ORDER BY normalized_score) as cutoff
                FROM submissions
                WHERE exam_id = ${examId} AND category = ${category}
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
                        dataPoints: dataPoints,
                        methodology: "percentile_distribution",
                        factors: ["normalized_scores", "category_ratio"]
                    }
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
                            dataPoints: dataPoints,
                            methodology: "percentile_distribution",
                            factors: ["normalized_scores", "category_ratio"]
                        }
                    }
                });
        }

        processed++;
    }

    await updateProgress(jobId, 100, `Cutoff prediction complete for ${examIds.length} exam(s)`);
}

async function updateProgress(jobId: number, percent: number, message: string) {
    await db
        .update(jobRuns)
        .set({
            progressPercent: percent,
            metadata: sql`jsonb_set(COALESCE(metadata, '{}'::jsonb), '{result}', ${JSON.stringify({ message: message })}::jsonb)`
        })
        .where(eq(jobRuns.id, jobId));
}
