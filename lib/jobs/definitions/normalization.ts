
import { db } from "@/lib/db";
import { submissions, jobRuns, shifts, exams } from "@/lib/db/schema";
import { eq, sql, and } from "drizzle-orm";

export async function normalizeScores(jobId: number, metadata?: any) {
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
        await updateProgress(jobId, Math.round((processed / examIds.length) * 80) + 10, `Normalizing exam ${examId}...`);

        // 1. Calculate stats for each shift (Mean, StdDev)
        await db.execute(sql`
            WITH ShiftStats AS (
                SELECT 
                    shift_id,
                    COUNT(*) as candidate_count,
                    AVG(raw_score) as avg_raw,
                    STDDEV(raw_score) as std_dev,
                    MAX(raw_score) as max_raw
                FROM submissions
                WHERE exam_id = ${examId}
                GROUP BY shift_id
            )
            UPDATE shifts
            SET 
                candidate_count = ShiftStats.candidate_count,
                avg_raw_score = ShiftStats.avg_raw,
                std_dev = ShiftStats.std_dev,
                max_raw_score = ShiftStats.max_raw,
                stats_updated_at = NOW()
            FROM ShiftStats
            WHERE shifts.id = ShiftStats.shift_id;
        `);

        // 2. Fetch Global Stats (needed for Difficulty & Normalization)
        const [globalStats] = await db
            .select({
                avg: sql<number>`AVG(raw_score)`,
                std: sql<number>`STDDEV(raw_score)`
            })
            .from(submissions)
            .where(eq(submissions.examId, examId));

        const globalAvg = globalStats?.avg ? Number(globalStats.avg) : 0;
        const globalStd = globalStats?.std ? Number(globalStats.std) : 1;

        // 3. Update Difficulty Labels based on Global Avg
        if (globalAvg > 0) {
            // Using raw values for arithmetic constants to prevent driver type inference issues
            await db.execute(sql`
                UPDATE shifts
                SET 
                    difficulty_index = avg_raw_score / ${globalAvg},
                    difficulty_label = CASE 
                        WHEN avg_raw_score > ${globalAvg + 10} THEN 'Easy'
                        WHEN avg_raw_score < ${globalAvg - 10} THEN 'Difficult'
                        ELSE 'Moderate'
                    END
                WHERE exam_id = ${examId} AND candidate_count > 0;
            `);
        }

        // 4. Apply Z-Score Normalization
        await db.execute(sql`
            UPDATE submissions s
            SET normalized_score = (
                (s.raw_score - sh.avg_raw_score) / NULLIF(sh.std_dev, 0)
            ) * ${globalStd} + ${globalAvg}
            FROM shifts sh
            WHERE s.shift_id = sh.id 
              AND s.exam_id = ${examId}
              AND sh.std_dev > 0;
        `);

        // Handle cases where StdDev is 0 (fallback to raw score)
        await db.execute(sql`
            UPDATE submissions s
            SET normalized_score = s.raw_score
            FROM shifts sh
            WHERE s.shift_id = sh.id 
              AND s.exam_id = ${examId}
              AND (sh.std_dev IS NULL OR sh.std_dev = 0);
        `);

        processed++;
    }

    await updateProgress(jobId, 100, `Normalization complete for ${examIds.length} exam(s)`);
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
