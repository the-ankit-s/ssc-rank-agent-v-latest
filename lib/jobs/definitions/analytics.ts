
import { db } from "@/lib/db";
import { submissions, exams } from "@/lib/db/schema";
import { eq, sql, count } from "drizzle-orm";
import { JobContext } from "../helpers";

/**
 * Analytics Refresh Job
 * Aggregates submission counts, daily trends, and category splits
 * across all active exams, storing a summary in the job metadata.
 */
export async function updateAnalytics(jobId: number, metadata?: any) {
    const ctx = new JobContext(jobId);
    const examIds = await ctx.getExamIds(metadata);

    if (examIds.length === 0) {
        await ctx.updateProgress(100, "No active exams to aggregate.");
        return;
    }

    await ctx.setTotal(examIds.length);
    await ctx.updateProgress(10, `Aggregating analytics for ${examIds.length} exam(s)…`);

    const examSummaries: Array<{
        examId: number;
        name: string;
        submissions: number;
        avgScore: number;
        maxScore: number;
        categories: Record<string, number>;
    }> = [];

    let totalSubmissions = 0;

    for (let i = 0; i < examIds.length; i++) {
        const examId = examIds[i];

        // Get exam name
        const [exam] = await db
            .select({ name: exams.name })
            .from(exams)
            .where(eq(exams.id, examId));

        // Aggregate submission stats
        const [stats] = await db
            .select({
                total: count(),
                avgScore: sql<number>`COALESCE(AVG(raw_score), 0)`,
                maxScore: sql<number>`COALESCE(MAX(raw_score), 0)`,
            })
            .from(submissions)
            .where(eq(submissions.examId, examId));

        // Category distribution
        const catResults = await db
            .select({
                category: submissions.category,
                count: count(),
            })
            .from(submissions)
            .where(eq(submissions.examId, examId))
            .groupBy(submissions.category);

        const categories: Record<string, number> = {};
        for (const r of catResults) {
            categories[r.category] = r.count;
        }

        const subCount = stats?.total || 0;
        totalSubmissions += subCount;

        examSummaries.push({
            examId,
            name: exam?.name || `Exam #${examId}`,
            submissions: subCount,
            avgScore: Math.round((stats?.avgScore || 0) * 100) / 100,
            maxScore: stats?.maxScore || 0,
            categories,
        });

        await ctx.incrementProcessed(1);
        const pct = Math.round(((i + 1) / examIds.length) * 80) + 10;
        await ctx.updateProgress(pct, `Processed ${i + 1}/${examIds.length} exams…`);
    }

    // Store summary in metadata
    await db
        .update((await import("@/lib/db/schema")).jobRuns)
        .set({
            metadata: sql`jsonb_set(
                COALESCE(metadata, '{}'::jsonb),
                '{result}',
                ${JSON.stringify({
                message: `Analytics refreshed: ${totalSubmissions} submissions across ${examIds.length} exams`,
                totalSubmissions,
                examCount: examIds.length,
                exams: examSummaries,
                generatedAt: new Date().toISOString(),
            })}::jsonb
            )`,
        })
        .where(eq((await import("@/lib/db/schema")).jobRuns.id, jobId));

    await ctx.updateProgress(100, `Analytics refreshed: ${totalSubmissions} submissions across ${examIds.length} exams`);
}
