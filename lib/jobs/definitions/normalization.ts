
import { db } from "@/lib/db";
import { submissions, shifts, exams } from "@/lib/db/schema";
import { eq, sql, and, asc, count } from "drizzle-orm";
import { getNormalizedScore, type NormalizationParams } from "@/lib/normalization/formulas";
import { JobContext } from "../helpers";

export async function normalizeScores(jobId: number, metadata?: any) {
    const ctx = new JobContext(jobId);
    const examIds = await ctx.getExamIds(metadata);

    if (examIds.length === 0) {
        await ctx.updateProgress(100, "No active exams found to process.");
        return;
    }

    // Count total submissions across all exams
    let totalSubs = 0;
    for (const examId of examIds) {
        const [{ c }] = await db.select({ c: count() }).from(submissions).where(eq(submissions.examId, examId));
        totalSubs += c;
    }
    await ctx.setTotal(totalSubs);
    await ctx.updateProgress(5, `Found ${examIds.length} exam(s) with ${totalSubs} submissions to normalize`);

    for (let i = 0; i < examIds.length; i++) {
        const examId = examIds[i];
        // Sub-step progress: distribute 5–95% range across exams, then sub-steps within each exam
        const examBase = Math.round((i / examIds.length) * 85) + 5;
        const examRange = Math.round(85 / examIds.length);
        const subPct = (step: number, totalSteps: number) => Math.min(95, examBase + Math.round((step / totalSteps) * examRange));

        await ctx.updateProgress(subPct(0, 6), `Normalizing exam ${examId} (${i + 1}/${examIds.length})…`);

        // 0. Fetch exam normalization config
        const [examRow] = await db
            .select({
                normalizationMethod: exams.normalizationMethod,
                normalizationConfig: exams.normalizationConfig,
                hasNormalization: exams.hasNormalization,
                totalMarks: exams.totalMarks,
            })
            .from(exams)
            .where(eq(exams.id, examId));

        if (!examRow || !examRow.hasNormalization) {
            // Skip exams without normalization — still count their subs
            const [{ c }] = await db.select({ c: count() }).from(submissions).where(eq(submissions.examId, examId));
            await ctx.incrementProcessed(c);
            continue;
        }

        const method = examRow.normalizationMethod || "z_score";

        // 1. Calculate per-shift stats (Mean, StdDev)
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
        await ctx.updateProgress(subPct(1, 6), `Exam ${examId}: Shift stats calculated`);

        // 2. Global stats
        const [globalStats] = await db
            .select({
                avg: sql<number>`AVG(raw_score)`,
                std: sql<number>`STDDEV(raw_score)`
            })
            .from(submissions)
            .where(eq(submissions.examId, examId));

        const globalAvg = globalStats?.avg ? Number(globalStats.avg) : 0;
        const globalStd = globalStats?.std ? Number(globalStats.std) : 1;
        await ctx.updateProgress(subPct(2, 6), `Exam ${examId}: Global stats computed`);

        // 3. Multi-factor difficulty scoring (real-world SSC methodology)
        // Factor 1 (40%): 1 - (avg_score / max_possible) → lower avg = harder
        // Factor 2 (30%): std_dev / avg_score (coefficient of variation) → more spread = harder
        // Factor 3 (30%): (max_score - avg_score) / max_possible (topper gap) → bigger gap = harder
        await db.execute(sql`
            UPDATE shifts
            SET 
                difficulty_index = CASE WHEN avg_raw_score > 0 AND candidate_count > 0 THEN
                    0.4 * (1.0 - avg_raw_score / ${examRow.totalMarks})
                    + 0.3 * LEAST(1.0, COALESCE(std_dev, 0) / NULLIF(avg_raw_score, 0))
                    + 0.3 * (COALESCE(max_raw_score, avg_raw_score) - avg_raw_score) / ${examRow.totalMarks}
                ELSE 0.5 END,
                difficulty_label = CASE 
                    WHEN avg_raw_score IS NULL OR candidate_count = 0 THEN 'Moderate'
                    WHEN (
                        0.4 * (1.0 - avg_raw_score / ${examRow.totalMarks})
                        + 0.3 * LEAST(1.0, COALESCE(std_dev, 0) / NULLIF(avg_raw_score, 0))
                        + 0.3 * (COALESCE(max_raw_score, avg_raw_score) - avg_raw_score) / ${examRow.totalMarks}
                    ) > 0.55 THEN 'Hard'
                    WHEN (
                        0.4 * (1.0 - avg_raw_score / ${examRow.totalMarks})
                        + 0.3 * LEAST(1.0, COALESCE(std_dev, 0) / NULLIF(avg_raw_score, 0))
                        + 0.3 * (COALESCE(max_raw_score, avg_raw_score) - avg_raw_score) / ${examRow.totalMarks}
                    ) > 0.38 THEN 'Moderate'
                    ELSE 'Easy'
                END
            WHERE exam_id = ${examId};
        `);
        await ctx.updateProgress(subPct(3, 6), `Exam ${examId}: Difficulty scoring done`);

        // 3.1. Build global distribution (for equipercentile methods)
        let globalDistribution: Array<{ percentile: number; score: number }> | undefined;

        if (method === "equating" || method === "percentile") {
            const SAMPLE_POINTS = 1000;
            const percentileSteps = Array.from({ length: SAMPLE_POINTS + 1 }, (_, i) => i / 10);

            const [countResult] = await db
                .select({ total: sql<number>`COUNT(*)` })
                .from(submissions)
                .where(eq(submissions.examId, examId));

            const totalCandidates = countResult?.total ? Number(countResult.total) : 0;

            if (totalCandidates > 0) {
                globalDistribution = [];
                for (const pct of percentileSteps) {
                    const position = Math.max(1, Math.min(Math.ceil((pct / 100) * totalCandidates), totalCandidates));
                    const [scoreResult] = await db
                        .select({ score: submissions.rawScore })
                        .from(submissions)
                        .where(eq(submissions.examId, examId))
                        .orderBy(asc(submissions.rawScore))
                        .limit(1)
                        .offset(position - 1);

                    if (scoreResult) {
                        globalDistribution.push({ percentile: pct, score: scoreResult.score });
                    }
                }
            }
        }

        // 4. Apply normalization based on method
        await ctx.updateProgress(subPct(4, 6), `Exam ${examId}: Applying ${method} normalization…`);
        let examSubsProcessed = 0;

        if (method === "z_score") {
            // SQL-based Z-Score (fastest)
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

            // Fallback for zero-stddev shifts
            await db.execute(sql`
                UPDATE submissions s
                SET normalized_score = s.raw_score
                FROM shifts sh
                WHERE s.shift_id = sh.id 
                  AND s.exam_id = ${examId}
                  AND (sh.std_dev IS NULL OR sh.std_dev = 0);
            `);

            const [{ c }] = await db.select({ c: count() }).from(submissions).where(eq(submissions.examId, examId));
            examSubsProcessed = c;

        } else if (method === "raw") {
            await db.execute(sql`
                UPDATE submissions
                SET normalized_score = raw_score
                WHERE exam_id = ${examId};
            `);

            const [{ c }] = await db.select({ c: count() }).from(submissions).where(eq(submissions.examId, examId));
            examSubsProcessed = c;

        } else {
            // Per-row methods (percentile, modified_z, equating, custom)
            const allShifts = await db
                .select({
                    id: shifts.id,
                    candidateCount: shifts.candidateCount,
                    avgRawScore: shifts.avgRawScore,
                    stdDev: shifts.stdDev,
                })
                .from(shifts)
                .where(eq(shifts.examId, examId));

            for (const shift of allShifts) {
                const shiftSubmissions = await db
                    .select({ id: submissions.id, rawScore: submissions.rawScore })
                    .from(submissions)
                    .where(and(eq(submissions.examId, examId), eq(submissions.shiftId, shift.id)))
                    .orderBy(sql`raw_score DESC`);

                const totalInShift = shiftSubmissions.length;
                const shiftMean = shift.avgRawScore ? Number(shift.avgRawScore) : 0;
                const shiftStdDev = shift.stdDev ? Number(shift.stdDev) : 0;

                const updates: { id: number; normalizedScore: number }[] = [];
                for (let j = 0; j < shiftSubmissions.length; j++) {
                    const sub = shiftSubmissions[j];
                    const params: NormalizationParams = {
                        rawScore: sub.rawScore,
                        shiftMean,
                        shiftStdDev,
                        globalMean: globalAvg,
                        globalStdDev: globalStd,
                        maxMarks: examRow.totalMarks,
                        totalInShift,
                        rankInShift: j + 1,
                        config: examRow.normalizationConfig || undefined,
                        globalDistribution,
                    };
                    updates.push({
                        id: sub.id,
                        normalizedScore: getNormalizedScore(method, params),
                    });
                }

                // Batch update in chunks of 500
                const BATCH_SIZE = 500;
                for (let k = 0; k < updates.length; k += BATCH_SIZE) {
                    const batch = updates.slice(k, k + BATCH_SIZE);
                    const cases = batch.map(u => `WHEN ${u.id} THEN ${u.normalizedScore}`).join(" ");
                    const ids = batch.map(u => u.id).join(",");
                    await db.execute(sql.raw(
                        `UPDATE submissions SET normalized_score = CASE id ${cases} END WHERE id IN (${ids})`
                    ));
                }

                examSubsProcessed += shiftSubmissions.length;
            }
        }

        await ctx.incrementProcessed(examSubsProcessed);
        await ctx.updateProgress(subPct(6, 6), `Exam ${examId}: Done — ${examSubsProcessed} submissions normalized`);

        // Stamp normalization tracking so incremental system knows when this ran
        const [{ c: currentTotal }] = await db.select({ c: count() }).from(submissions).where(eq(submissions.examId, examId));
        await db.update(exams).set({
            lastNormalizedAt: new Date(),
            subsAtLastNormalization: currentTotal,
        }).where(eq(exams.id, examId));
    }

    await ctx.updateProgress(100, `Normalization complete for ${examIds.length} exam(s), ${totalSubs} submissions`);
}
