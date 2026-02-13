import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { exams, submissions } from "@/lib/db/schema";
import { eq, count } from "drizzle-orm";
import { checkSignificance } from "@/lib/services/incremental-normalization";

/**
 * GET /api/admin/re-normalization
 * Returns normalization status for all active exams (or a specific exam via ?examId=).
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const examIdParam = searchParams.get("examId");

        let examIds: number[];

        if (examIdParam) {
            examIds = [parseInt(examIdParam, 10)];
        } else {
            const allExams = await db
                .select({ id: exams.id })
                .from(exams)
                .where(eq(exams.isActive, true));
            examIds = allExams.map((e) => e.id);
        }

        const statuses = await Promise.all(
            examIds.map(async (examId) => {
                const [exam] = await db
                    .select({
                        id: exams.id,
                        name: exams.name,
                        lastNormalizedAt: exams.lastNormalizedAt,
                        subsAtLastNormalization: exams.subsAtLastNormalization,
                        totalSubmissions: exams.totalSubmissions,
                        reNormThreshold: exams.reNormThreshold,
                        normalizationMethod: exams.normalizationMethod,
                    })
                    .from(exams)
                    .where(eq(exams.id, examId));

                if (!exam) return null;

                const significance = await checkSignificance(examId);

                return {
                    examId: exam.id,
                    examName: exam.name,
                    normalizationMethod: exam.normalizationMethod,
                    lastNormalizedAt: exam.lastNormalizedAt,
                    subsAtLastNormalization: exam.subsAtLastNormalization || 0,
                    currentTotalSubmissions: exam.totalSubmissions || 0,
                    newSinceNormalization: significance.newCount,
                    percentNew: significance.percentNew,
                    threshold: significance.threshold,
                    isSignificant: significance.isSignificant,
                    recommendation: significance.isSignificant
                        ? "Full re-normalization recommended"
                        : exam.lastNormalizedAt
                            ? "Incremental normalization sufficient"
                            : "Initial normalization not yet run",
                };
            }),
        );

        return NextResponse.json({
            statuses: statuses.filter(Boolean),
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error("Re-normalization status error:", error);
        return NextResponse.json({ error: "Failed to fetch normalization status" }, { status: 500 });
    }
}

/**
 * POST /api/admin/re-normalization
 * Force a full re-normalization for a specific exam.
 * Body: { examId: number }
 *
 * Note: This resets the tracking fields so the next normalization job will process the exam.
 * The actual normalization happens via the existing batch job queue.
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { examId } = body;

        if (!examId) {
            return NextResponse.json({ error: "examId is required" }, { status: 400 });
        }

        // Reset tracking so the batch job will re-process this exam
        await db
            .update(exams)
            .set({
                lastNormalizedAt: null,
                subsAtLastNormalization: 0,
            })
            .where(eq(exams.id, examId));

        return NextResponse.json({
            success: true,
            message: `Normalization tracking reset for exam ${examId}. Run the normalization job to re-process.`,
        });
    } catch (error) {
        console.error("Force re-normalization error:", error);
        return NextResponse.json({ error: "Failed to trigger re-normalization" }, { status: 500 });
    }
}

/**
 * PATCH /api/admin/re-normalization
 * Update the re-normalization threshold for a specific exam.
 * Body: { examId: number, threshold: number }
 */
export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json();
        const { examId, threshold } = body;

        if (!examId || threshold === undefined) {
            return NextResponse.json({ error: "examId and threshold are required" }, { status: 400 });
        }

        if (threshold < 0 || threshold > 100) {
            return NextResponse.json({ error: "Threshold must be between 0 and 100" }, { status: 400 });
        }

        await db
            .update(exams)
            .set({ reNormThreshold: threshold })
            .where(eq(exams.id, examId));

        return NextResponse.json({
            success: true,
            message: `Re-normalization threshold updated to ${threshold}% for exam ${examId}`,
        });
    } catch (error) {
        console.error("Update threshold error:", error);
        return NextResponse.json({ error: "Failed to update threshold" }, { status: 500 });
    }
}
