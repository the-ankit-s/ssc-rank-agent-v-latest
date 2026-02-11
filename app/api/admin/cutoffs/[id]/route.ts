import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { cutoffs, exams } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const cutoffId = parseInt(id);

        if (isNaN(cutoffId)) {
            return NextResponse.json({ error: "Invalid cutoff ID" }, { status: 400 });
        }

        const result = await db
            .select({
                id: cutoffs.id,
                examId: cutoffs.examId,
                examName: exams.name,
                category: cutoffs.category,
                postCode: cutoffs.postCode,
                postName: cutoffs.postName,
                expectedCutoff: cutoffs.expectedCutoff,
                safeScore: cutoffs.safeScore,
                minimumScore: cutoffs.minimumScore,
                previousYearCutoff: cutoffs.previousYearCutoff,
                previousYearVacancy: cutoffs.previousYearVacancy,
                currentYearVacancy: cutoffs.currentYearVacancy,
                confidenceLevel: cutoffs.confidenceLevel,
                predictionBasis: cutoffs.predictionBasis,
                isPublished: cutoffs.isPublished,
            })
            .from(cutoffs)
            .leftJoin(exams, eq(cutoffs.examId, exams.id))
            .where(eq(cutoffs.id, cutoffId));

        if (result.length === 0) {
            return NextResponse.json({ error: "Cutoff not found" }, { status: 404 });
        }

        return NextResponse.json({ cutoff: result[0] });
    } catch (error) {
        console.error("Error fetching cutoff:", error);
        return NextResponse.json({ error: "Failed to fetch cutoff" }, { status: 500 });
    }
}

export async function PUT(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const cutoffId = parseInt(id);
        const body = await req.json();

        if (isNaN(cutoffId)) {
            return NextResponse.json({ error: "Invalid cutoff ID" }, { status: 400 });
        }

        const updatedCutoff = await db
            .update(cutoffs)
            .set({
                category: body.category,
                postCode: body.postCode,
                postName: body.postName,
                expectedCutoff: body.expectedCutoff,
                safeScore: body.safeScore,
                minimumScore: body.minimumScore,
                previousYearCutoff: body.previousYearCutoff,
                previousYearVacancy: body.previousYearVacancy,
                currentYearVacancy: body.currentYearVacancy,
                confidenceLevel: body.confidenceLevel,
                predictionBasis: body.predictionBasis,
                isPublished: body.isPublished,
                updatedAt: new Date(),
            })
            .where(eq(cutoffs.id, cutoffId))
            .returning();

        if (updatedCutoff.length === 0) {
            return NextResponse.json({ error: "Cutoff not found" }, { status: 404 });
        }

        return NextResponse.json({ cutoff: updatedCutoff[0] });
    } catch (error) {
        console.error("Error updating cutoff:", error);
        return NextResponse.json({ error: "Failed to update cutoff" }, { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const cutoffId = parseInt(id);

        if (isNaN(cutoffId)) {
            return NextResponse.json({ error: "Invalid cutoff ID" }, { status: 400 });
        }

        const deletedCutoff = await db
            .delete(cutoffs)
            .where(eq(cutoffs.id, cutoffId))
            .returning();

        if (deletedCutoff.length === 0) {
            return NextResponse.json({ error: "Cutoff not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, id: cutoffId });
    } catch (error) {
        console.error("Error deleting cutoff:", error);
        return NextResponse.json({ error: "Failed to delete cutoff" }, { status: 500 });
    }
}
