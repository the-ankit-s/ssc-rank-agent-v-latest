import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { submissions, exams, shifts, systemSettings } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const submissionId = parseInt(id);

        if (isNaN(submissionId)) {
            return NextResponse.json(
                { error: "Invalid submission ID" },
                { status: 400 }
            );
        }

        // Fetch ALL submission data with related exam and shift
        const [submission] = await db
            .select({
                // Core
                id: submissions.id,
                rollNumber: submissions.rollNumber,
                name: submissions.name,
                category: submissions.category,
                processingStatus: submissions.processingStatus,
                createdAt: submissions.createdAt,

                // Student details
                fatherName: submissions.fatherName,
                dob: submissions.dob,
                gender: submissions.gender,
                state: submissions.state,
                examCentre: submissions.examCentre,
                examCentreCode: submissions.examCentreCode,
                horizontalCategory: submissions.horizontalCategory,
                isPWD: submissions.isPWD,
                isExServiceman: submissions.isExServiceman,

                // Performance
                sectionPerformance: submissions.sectionPerformance,
                totalAttempted: submissions.totalAttempted,
                totalCorrect: submissions.totalCorrect,
                totalWrong: submissions.totalWrong,
                accuracy: submissions.accuracy,

                // Scoring
                rawScore: submissions.rawScore,
                normalizedScore: submissions.normalizedScore,

                // All ranks
                overallRank: submissions.overallRank,
                categoryRank: submissions.categoryRank,
                shiftRank: submissions.shiftRank,
                stateRank: submissions.stateRank,

                // Percentiles
                overallPercentile: submissions.overallPercentile,
                categoryPercentile: submissions.categoryPercentile,
                shiftPercentile: submissions.shiftPercentile,

                // Exam info
                exam: {
                    name: exams.name,
                    tier: exams.tier,
                    totalMarks: exams.totalMarks,
                    totalSubmissions: exams.totalSubmissions,
                    agency: exams.agency,
                    year: exams.year,
                },

                // Shift info (includes stats for comparison)
                shift: {
                    date: shifts.date,
                    timeSlot: shifts.timeSlot,
                    shiftNumber: shifts.shiftNumber,
                    candidateCount: shifts.candidateCount,
                    avgRawScore: shifts.avgRawScore,
                    maxRawScore: shifts.maxRawScore,
                    minRawScore: shifts.minRawScore,
                    stdDev: shifts.stdDev,
                    difficultyLabel: shifts.difficultyLabel,
                },
            })
            .from(submissions)
            .leftJoin(exams, eq(submissions.examId, exams.id))
            .leftJoin(shifts, eq(submissions.shiftId, shifts.id))
            .where(eq(submissions.id, submissionId))
            .limit(1);

        if (!submission) {
            return NextResponse.json(
                { error: "Submission not found" },
                { status: 404 }
            );
        }

        // If pending/processing, include queue position and next batch time
        let pendingCount = 0;
        let nextBatchRun: string | null = null;
        let pollIntervalMs = 21_600_000;

        if (submission.processingStatus === "pending" || submission.processingStatus === "processing") {
            const [countResult] = await db
                .select({ count: sql<number>`count(*)` })
                .from(submissions)
                .where(
                    and(
                        eq(submissions.processingStatus, "pending"),
                        sql`${submissions.createdAt} <= ${submission.createdAt}`
                    )
                );
            pendingCount = countResult?.count || 0;

            try {
                const settingsRows = await db
                    .select({ key: systemSettings.key, value: systemSettings.value })
                    .from(systemSettings)
                    .where(
                        sql`${systemSettings.key} IN ('batch_norm_schedule', 'result_poll_interval_ms')`
                    );

                for (const row of settingsRows) {
                    if (row.key === "batch_norm_schedule" && row.value) nextBatchRun = String(row.value);
                    if (row.key === "result_poll_interval_ms" && row.value) pollIntervalMs = Number(row.value) || 21_600_000;
                }
            } catch {
                // Settings table may not have these keys yet
            }
        }

        return NextResponse.json({
            ...submission,
            pendingCount,
            nextBatchRun,
            pollIntervalMs,
        });

    } catch (error) {
        console.error("Error fetching submission result:", error);
        return NextResponse.json(
            { error: "Failed to fetch result" },
            { status: 500 }
        );
    }
}
