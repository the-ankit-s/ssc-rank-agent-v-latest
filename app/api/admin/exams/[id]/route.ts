import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { exams, shifts, submissions } from "@/lib/db/schema";
import { eq, count } from "drizzle-orm";

// GET - Get single exam
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const examId = parseInt(id);

        if (isNaN(examId)) {
            return NextResponse.json({ error: "Invalid exam ID" }, { status: 400 });
        }

        const [exam] = await db.select().from(exams).where(eq(exams.id, examId)).limit(1);

        if (!exam) {
            return NextResponse.json({ error: "Exam not found" }, { status: 404 });
        }

        // Get shift count
        const [shiftCount] = await db
            .select({ count: count() })
            .from(shifts)
            .where(eq(shifts.examId, examId));

        // Get submission count
        const [submissionCount] = await db
            .select({ count: count() })
            .from(submissions)
            .where(eq(submissions.examId, examId));

        return NextResponse.json({
            exam,
            stats: {
                shifts: shiftCount?.count || 0,
                submissions: submissionCount?.count || 0,
            },
        });
    } catch (error) {
        console.error("Error fetching exam:", error);
        return NextResponse.json({ error: "Failed to fetch exam" }, { status: 500 });
    }
}

// PUT - Update exam
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const examId = parseInt(id);
        const body = await request.json();

        if (isNaN(examId)) {
            return NextResponse.json({ error: "Invalid exam ID" }, { status: 400 });
        }

        const [updated] = await db
            .update(exams)
            .set({
                name: body.name,
                tier: body.tier,
                totalMarks: body.totalMarks,
                totalQuestions: body.totalQuestions,
                duration: body.duration,
                defaultPositive: body.defaultPositive,
                defaultNegative: body.defaultNegative,
                sectionConfig: body.sectionConfig,
                hasSectionalTiming: body.hasSectionalTiming,
                hasNormalization: body.hasNormalization,
                allowMultipleSubmissions: body.allowMultipleSubmissions,
                isActive: body.isActive,
                status: body.status,
                analysisPhase: body.analysisPhase,
                isFeatured: body.isFeatured,
                priorityOrder: body.priorityOrder,
                metaDescription: body.metaDescription,
                examStartDate: body.examStartDate ? new Date(body.examStartDate) : null,
                examEndDate: body.examEndDate ? new Date(body.examEndDate) : null,
                answerKeyReleaseDate: body.answerKeyReleaseDate ? new Date(body.answerKeyReleaseDate) : null,
                answerKeyUrl: body.answerKeyUrl,
                officialWebsite: body.officialWebsite,
                updatedAt: new Date(),
            })
            .where(eq(exams.id, examId))
            .returning();

        if (!updated) {
            return NextResponse.json({ error: "Exam not found" }, { status: 404 });
        }

        return NextResponse.json({ exam: updated, success: true });
    } catch (error) {
        console.error("Error updating exam:", error);
        return NextResponse.json({ error: "Failed to update exam" }, { status: 500 });
    }
}

// DELETE - Delete exam
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const examId = parseInt(id);

        if (isNaN(examId)) {
            return NextResponse.json({ error: "Invalid exam ID" }, { status: 400 });
        }

        // Check for existing submissions
        const [submissionCount] = await db
            .select({ count: count() })
            .from(submissions)
            .where(eq(submissions.examId, examId));

        if (submissionCount && submissionCount.count > 0) {
            return NextResponse.json(
                { error: "Cannot delete exam with existing submissions" },
                { status: 400 }
            );
        }

        await db.delete(exams).where(eq(exams.id, examId));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting exam:", error);
        return NextResponse.json({ error: "Failed to delete exam" }, { status: 500 });
    }
}
