import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { submissions, exams, shifts } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

// GET - Get single submission with full details
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const submissionId = parseInt(id);

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

        // Get exam details
        const [exam] = await db
            .select()
            .from(exams)
            .where(eq(exams.id, submission.examId))
            .limit(1);

        // Get shift details
        const [shift] = await db
            .select()
            .from(shifts)
            .where(eq(shifts.id, submission.shiftId))
            .limit(1);

        return NextResponse.json({
            submission,
            exam,
            shift,
        });
    } catch (error) {
        console.error("Error fetching submission:", error);
        return NextResponse.json({ error: "Failed to fetch submission" }, { status: 500 });
    }
}

// PUT - Update submission
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const submissionId = parseInt(id);
        const body = await request.json();

        if (isNaN(submissionId)) {
            return NextResponse.json({ error: "Invalid submission ID" }, { status: 400 });
        }

        const [updated] = await db
            .update(submissions)
            .set({
                name: body.name,
                category: body.category,
                rawScore: body.rawScore,
                normalizedScore: body.normalizedScore,
                overallRank: body.overallRank,
                categoryRank: body.categoryRank,
                updatedAt: new Date(),
            })
            .where(eq(submissions.id, submissionId))
            .returning();

        return NextResponse.json({ submission: updated, success: true });
    } catch (error) {
        console.error("Error updating submission:", error);
        return NextResponse.json({ error: "Failed to update submission" }, { status: 500 });
    }
}

// PATCH - Partial update submission (for edit modal)
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const submissionId = parseInt(id);
        const body = await request.json();

        if (isNaN(submissionId)) {
            return NextResponse.json({ error: "Invalid submission ID" }, { status: 400 });
        }

        const updateData: any = {
            updatedAt: new Date(),
        };

        if (body.name !== undefined) updateData.name = body.name;
        if (body.fatherName !== undefined) updateData.fatherName = body.fatherName;
        if (body.category !== undefined) updateData.category = body.category;
        if (body.gender !== undefined) updateData.gender = body.gender;
        if (body.state !== undefined) updateData.state = body.state;
        if (body.isPWD !== undefined) updateData.isPWD = body.isPWD;
        if (body.isExServiceman !== undefined) updateData.isExServiceman = body.isExServiceman;
        if (body.adminNotes !== undefined) updateData.adminNotes = body.adminNotes;
        if (body.isDisputed !== undefined) updateData.isDisputed = body.isDisputed;
        if (body.isResultPublic !== undefined) updateData.isResultPublic = body.isResultPublic;

        const [updated] = await db
            .update(submissions)
            .set(updateData)
            .where(eq(submissions.id, submissionId))
            .returning();

        return NextResponse.json({ submission: updated, success: true });
    } catch (error) {
        console.error("Error patching submission:", error);
        return NextResponse.json({ error: "Failed to update submission" }, { status: 500 });
    }
}

// DELETE - Delete submission
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const submissionId = parseInt(id);

        if (isNaN(submissionId)) {
            return NextResponse.json({ error: "Invalid submission ID" }, { status: 400 });
        }

        // Get submission details before deletion to update stats
        const [submissionToDelete] = await db
            .select()
            .from(submissions)
            .where(eq(submissions.id, submissionId))
            .limit(1);

        if (!submissionToDelete) {
            return NextResponse.json({ error: "Submission not found" }, { status: 404 });
        }

        await db.delete(submissions).where(eq(submissions.id, submissionId));

        // Update stats
        await db.update(exams)
            .set({ totalSubmissions: sql`${exams.totalSubmissions} - 1` })
            .where(eq(exams.id, submissionToDelete.examId));

        await db.update(shifts)
            .set({ candidateCount: sql`${shifts.candidateCount} - 1` })
            .where(eq(shifts.id, submissionToDelete.shiftId));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting submission:", error);
        return NextResponse.json({ error: "Failed to delete submission" }, { status: 500 });
    }
}
