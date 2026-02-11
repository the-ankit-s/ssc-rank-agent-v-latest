
import { db } from "@/lib/db";
import { submissions, jobRuns, exams } from "@/lib/db/schema";
import { eq, desc, sql, and } from "drizzle-orm";

export async function calculateRanks(jobId: number, metadata?: any) {
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
        await updateProgress(jobId, Math.round((processed / examIds.length) * 80) + 10, `Processing exam ${examId}...`);

        // 1. Calculate Overall Ranks
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

        // 2. Calculate Category Ranks
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

        // 3. Calculate Shift Ranks
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

        processed++;
    }

    await updateProgress(jobId, 100, `Rank calculation complete for ${examIds.length} exam(s)`);
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
