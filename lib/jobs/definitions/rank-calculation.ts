
import { db } from "@/lib/db";
import { submissions, exams, jobRuns } from "@/lib/db/schema";
import { eq, sql, and, isNull, count } from "drizzle-orm";
import { JobContext } from "../helpers";

export async function calculateRanks(jobId: number, metadata?: any) {
    const ctx = new JobContext(jobId);
    const examIds = await ctx.getExamIds(metadata);

    if (examIds.length === 0) {
        await ctx.updateProgress(100, "No active exams found to process.");
        return;
    }

    // Count total submissions to process
    let totalSubs = 0;
    const warnings: string[] = [];

    for (const examId of examIds) {
        const [{ c }] = await db.select({ c: count() }).from(submissions).where(eq(submissions.examId, examId));
        totalSubs += c;
    }
    await ctx.setTotal(totalSubs);
    await ctx.updateProgress(5, `Found ${examIds.length} exam(s) with ${totalSubs} total submissions`);

    for (let i = 0; i < examIds.length; i++) {
        const examId = examIds[i];
        // Sub-step progress: distribute 5–95% across exams, then sub-steps within each exam
        const examBase = Math.round((i / examIds.length) * 85) + 5;
        const examRange = Math.round(85 / examIds.length);
        const subPct = (step: number, totalSteps: number) => Math.min(95, examBase + Math.round((step / totalSteps) * examRange));

        // Safety check: warn if normalization hasn't been run
        const [{ c: totalExamSubs }] = await db.select({ c: count() }).from(submissions).where(eq(submissions.examId, examId));
        const [{ c: unnormalized }] = await db.select({ c: count() }).from(submissions)
            .where(and(eq(submissions.examId, examId), isNull(submissions.normalizedScore)));

        if (totalExamSubs > 0 && unnormalized / totalExamSubs > 0.1) {
            const warnMsg = `⚠ Exam ${examId}: ${unnormalized}/${totalExamSubs} submissions not normalized — ranks will use raw scores as fallback`;
            warnings.push(warnMsg);
            await ctx.updateProgress(subPct(0, 4), warnMsg);
        } else {
            await ctx.updateProgress(subPct(0, 4), `Calculating ranks for exam ${examId} (${i + 1}/${examIds.length})…`);
        }

        // 1. Overall Ranks (partition by exam, order by normalized → raw → dob)
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
        await ctx.updateProgress(subPct(1, 4), `Exam ${examId}: Overall ranks done`);

        // 2. Category Ranks (partition by exam + category)
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
        await ctx.updateProgress(subPct(2, 4), `Exam ${examId}: Category ranks done`);

        // 3. Shift Ranks (partition by shift)
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
        await ctx.updateProgress(subPct(3, 4), `Exam ${examId}: Shift ranks done`);

        // Count subs processed for this exam
        const [{ c }] = await db.select({ c: count() }).from(submissions).where(eq(submissions.examId, examId));
        await ctx.incrementProcessed(c);
    }

    await ctx.updateProgress(100, `Rank calculation complete for ${examIds.length} exam(s), ${totalSubs} submissions`);
}
