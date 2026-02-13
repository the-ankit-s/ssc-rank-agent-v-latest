import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { exams, shifts, submissions, cutoffs, dailyAnalytics, scoreDistribution, systemLogs } from "@/lib/db/schema";
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

// DELETE - Delete exam (supports ?force=true for exams with submissions)
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const examId = parseInt(id);
        const force = request.nextUrl.searchParams.get("force") === "true";

        if (isNaN(examId)) {
            return NextResponse.json({ error: "Invalid exam ID" }, { status: 400 });
        }

        // Fetch exam details for logging
        const [exam] = await db.select().from(exams).where(eq(exams.id, examId)).limit(1);
        if (!exam) {
            return NextResponse.json({ error: "Exam not found" }, { status: 404 });
        }

        // Count all related data
        const [subCount] = await db.select({ count: count() }).from(submissions).where(eq(submissions.examId, examId));
        const [shiftCount] = await db.select({ count: count() }).from(shifts).where(eq(shifts.examId, examId));
        const [cutoffCount] = await db.select({ count: count() }).from(cutoffs).where(eq(cutoffs.examId, examId));

        const submissionTotal = subCount?.count || 0;
        const shiftTotal = shiftCount?.count || 0;
        const cutoffTotal = cutoffCount?.count || 0;

        // If has submissions and not force — return detailed breakdown, don't delete
        if (submissionTotal > 0 && !force) {
            return NextResponse.json({
                error: "Exam has submissions. Use force delete to proceed.",
                blocked: true,
                breakdown: {
                    examName: exam.name,
                    submissions: submissionTotal,
                    shifts: shiftTotal,
                    cutoffs: cutoffTotal,
                },
            }, { status: 400 });
        }

        console.log(`[DELETE] ${force ? "FORCE " : ""}Deleting "${exam.name}" (ID: ${examId}) — ${submissionTotal} subs, ${shiftTotal} shifts, ${cutoffTotal} cutoffs`);

        // Cascade delete everything in correct order
        await db.delete(dailyAnalytics).where(eq(dailyAnalytics.examId, examId));
        await db.delete(scoreDistribution).where(eq(scoreDistribution.examId, examId));
        await db.delete(submissions).where(eq(submissions.examId, examId));
        await db.delete(shifts).where(eq(shifts.examId, examId));
        await db.delete(cutoffs).where(eq(cutoffs.examId, examId));
        await db.delete(exams).where(eq(exams.id, examId));

        // Write audit log to systemLogs
        try {
            await db.insert(systemLogs).values({
                level: "WARN",
                component: "exam_management",
                action: "delete_exam",
                message: `Deleted exam "${exam.name}" (${exam.slug})${force ? " [FORCE — included submissions]" : ""}`,
                details: {
                    examId,
                    examName: exam.name,
                    slug: exam.slug,
                    force,
                    deleted: { submissions: submissionTotal, shifts: shiftTotal, cutoffs: cutoffTotal },
                    deletedAt: new Date().toISOString(),
                },
            });
        } catch (logErr) {
            console.error("[DELETE] Failed to write audit log:", logErr);
        }

        console.log(`[DELETE] Successfully deleted "${exam.name}" (ID: ${examId})`);
        return NextResponse.json({
            success: true,
            deleted: { submissions: submissionTotal, shifts: shiftTotal, cutoffs: cutoffTotal },
        });
    } catch (error: any) {
        console.error("[DELETE] Error deleting exam:", error);
        return NextResponse.json({ error: error.message || "Failed to delete exam" }, { status: 500 });
    }
}
