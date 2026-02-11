import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { submissions, exams, shifts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

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

        // Fetch submission with related exam and shift data
        const [submission] = await db
            .select({
                id: submissions.id,
                rollNumber: submissions.rollNumber,
                name: submissions.name,
                category: submissions.category,
                rawScore: submissions.rawScore,
                normalizedScore: submissions.normalizedScore,
                overallRank: submissions.overallRank,
                sectionPerformance: submissions.sectionPerformance,
                examCentre: submissions.examCentre,
                createdAt: submissions.createdAt,
                exam: {
                    name: exams.name,
                    tier: exams.tier,
                    totalMarks: exams.totalMarks,
                },
                shift: {
                    date: shifts.date,
                    timeSlot: shifts.timeSlot,
                }
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

        return NextResponse.json(submission);

    } catch (error) {
        console.error("Error fetching submission result:", error);
        return NextResponse.json(
            { error: "Failed to fetch result" },
            { status: 500 }
        );
    }
}
