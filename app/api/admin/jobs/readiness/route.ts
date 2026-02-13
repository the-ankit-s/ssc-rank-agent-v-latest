import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { submissions, exams, shifts } from "@/lib/db/schema";
import { eq, sql, and, isNotNull, isNull, count } from "drizzle-orm";

/**
 * GET /api/admin/jobs/readiness?examId=X
 *
 * Returns step-by-step readiness status for an exam's processing pipeline:
 *   1. Normalization — are scores normalized?
 *   2. Ranks — are ranks calculated?
 *   3. Cutoffs — are both done (ready for cutoff prediction)?
 */
export async function GET(req: NextRequest) {
    try {
        const examId = parseInt(req.nextUrl.searchParams.get("examId") || "0");
        if (!examId) {
            return NextResponse.json({ error: "examId is required" }, { status: 400 });
        }

        // Verify exam exists
        const [exam] = await db.select({
            id: exams.id, name: exams.name,
            hasNormalization: exams.hasNormalization,
            normalizationMethod: exams.normalizationMethod,
        }).from(exams).where(eq(exams.id, examId));

        if (!exam) {
            return NextResponse.json({ error: "Exam not found" }, { status: 404 });
        }

        // Count total submissions
        const [totalResult] = await db
            .select({ c: count() })
            .from(submissions)
            .where(eq(submissions.examId, examId));
        const totalSubs = totalResult?.c || 0;

        if (totalSubs === 0) {
            return NextResponse.json({
                examId, examName: exam.name, totalSubmissions: 0,
                normalization: { ready: false, done: false, message: "No submissions found for this exam", stats: {} },
                ranks: { ready: false, done: false, message: "No submissions found", stats: {} },
                cutoffs: { ready: false, done: false, message: "No submissions found", stats: {} },
            });
        }

        // --- Step 1: Normalization ---
        const [normalizedCount] = await db
            .select({ c: count() })
            .from(submissions)
            .where(and(eq(submissions.examId, examId), isNotNull(submissions.normalizedScore)));

        const [shiftCount] = await db
            .select({ c: count() })
            .from(shifts)
            .where(eq(shifts.examId, examId));

        const normalizedRatio = totalSubs > 0 ? (normalizedCount?.c || 0) / totalSubs : 0;
        const normalizationReady = totalSubs > 0 && (shiftCount?.c || 0) > 0;
        const normalizationDone = normalizedRatio >= 0.9; // 90%+ normalized

        // --- Step 2: Ranks ---
        const [rankedCount] = await db
            .select({ c: count() })
            .from(submissions)
            .where(and(eq(submissions.examId, examId), isNotNull(submissions.overallRank)));

        const rankedRatio = totalSubs > 0 ? (rankedCount?.c || 0) / totalSubs : 0;
        const ranksDone = rankedRatio >= 0.9;
        const ranksReady = normalizationDone; // Can only rank after normalization

        // --- Step 3: Cutoffs ---
        const cutoffsReady = normalizationDone && ranksDone;

        return NextResponse.json({
            examId,
            examName: exam.name,
            totalSubmissions: totalSubs,
            hasNormalization: exam.hasNormalization,
            normalizationMethod: exam.normalizationMethod || "z_score",

            normalization: {
                ready: normalizationReady,
                done: normalizationDone,
                message: !normalizationReady
                    ? "Exam needs shifts configured before normalization"
                    : normalizationDone
                        ? `${normalizedCount?.c}/${totalSubs} submissions normalized (${Math.round(normalizedRatio * 100)}%)`
                        : `Only ${normalizedCount?.c || 0}/${totalSubs} normalized (${Math.round(normalizedRatio * 100)}%) — run normalization first`,
                stats: {
                    total: totalSubs,
                    normalized: normalizedCount?.c || 0,
                    ratio: Math.round(normalizedRatio * 100),
                    shifts: shiftCount?.c || 0,
                },
            },

            ranks: {
                ready: ranksReady,
                done: ranksDone,
                message: !ranksReady
                    ? "Complete normalization before calculating ranks"
                    : ranksDone
                        ? `${rankedCount?.c}/${totalSubs} submissions ranked (${Math.round(rankedRatio * 100)}%)`
                        : `Only ${rankedCount?.c || 0}/${totalSubs} ranked (${Math.round(rankedRatio * 100)}%) — run rank calculation`,
                stats: {
                    total: totalSubs,
                    ranked: rankedCount?.c || 0,
                    ratio: Math.round(rankedRatio * 100),
                },
            },

            cutoffs: {
                ready: cutoffsReady,
                done: false, // This is checked separately via cutoffs table
                message: !cutoffsReady
                    ? !normalizationDone
                        ? "Complete normalization and rank calculation first"
                        : "Complete rank calculation before predicting cutoffs"
                    : "Ready to predict cutoffs",
                stats: {
                    normalizationDone,
                    ranksDone,
                },
            },
        });
    } catch (error) {
        console.error("Readiness check error:", error);
        return NextResponse.json({ error: "Failed to check readiness" }, { status: 500 });
    }
}
