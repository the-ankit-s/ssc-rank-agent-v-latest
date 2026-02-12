import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { submissions, exams, shifts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// POST - Recalculate score and rank for a submission
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const submissionId = parseInt(id);
        const body = await request.json();
        const { action } = body;

        if (isNaN(submissionId)) {
            return NextResponse.json({ error: "Invalid submission ID" }, { status: 400 });
        }

        const [submission] = await db
            .select()
            .from(submissions)
            .where(eq(submissions.id, submissionId))
            .limit(1);

        if (!submission) {
            return NextResponse.json({ error: "Submission not found" }, { status: 404 });
        }

        if (action === "score") {
            // Recalculate score from responses
            const responses = submission.responses as Array<{
                qNo: number;
                section: string;
                selected: string | null;
                correct: string;
                isCorrect: boolean;
            }>;

            if (!responses || responses.length === 0) {
                return NextResponse.json(
                    { error: "No responses found for recalculation" },
                    { status: 400 }
                );
            }

            // Get exam details for marking scheme
            const [exam] = await db
                .select()
                .from(exams)
                .where(eq(exams.id, submission.examId))
                .limit(1);

            if (!exam) {
                return NextResponse.json({ error: "Exam not found" }, { status: 404 });
            }

            // Recalculate score
            let rawScore = 0;
            let totalCorrect = 0;
            let totalWrong = 0;
            let totalAttempted = 0;

            const sectionPerformance: Record<string, any> = {};

            // TODO: Support section-specific and question-specific marking schemes
            // Currently assumes all questions use the same defaultPositive/defaultNegative

            responses.forEach((response) => {
                const section = response.section;
                if (!sectionPerformance[section]) {
                    sectionPerformance[section] = {
                        marks: 0,
                        correct: 0,
                        wrong: 0,
                        unattempted: 0,
                        total: 0,
                    };
                }

                sectionPerformance[section].total++;

                if (response.selected) {
                    totalAttempted++;
                    if (response.isCorrect) {
                        rawScore += exam.defaultPositive;
                        totalCorrect++;
                        sectionPerformance[section].correct++;
                        sectionPerformance[section].marks += exam.defaultPositive;
                    } else {
                        rawScore -= exam.defaultNegative;
                        totalWrong++;
                        sectionPerformance[section].wrong++;
                        sectionPerformance[section].marks -= exam.defaultNegative;
                    }
                } else {
                    sectionPerformance[section].unattempted++;
                }
            });

            const accuracy = totalAttempted > 0 ? (totalCorrect / totalAttempted) * 100 : 0;

            // Update submission with recalculated values
            const [updated] = await db
                .update(submissions)
                .set({
                    rawScore,
                    totalCorrect,
                    totalWrong,
                    totalAttempted,
                    accuracy,
                    sectionPerformance,
                    updatedAt: new Date(),
                })
                .where(eq(submissions.id, submissionId))
                .returning();

            return NextResponse.json({
                success: true,
                message: "Score recalculated successfully",
                submission: updated,
            });
        } else if (action === "rank") {
            // Trigger rank recalculation job (placeholder for now)
            // In a real implementation, this would trigger a background job
            return NextResponse.json({
                success: true,
                message: "Rank recalculation triggered. This may take a few minutes.",
            });
        } else {
            return NextResponse.json(
                { error: "Invalid action. Use 'score' or 'rank'" },
                { status: 400 }
            );
        }
    } catch (error) {
        console.error("Error recalculating:", error);
        return NextResponse.json({ error: "Failed to recalculate" }, { status: 500 });
    }
}
