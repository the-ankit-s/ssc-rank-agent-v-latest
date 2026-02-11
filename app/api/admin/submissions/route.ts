import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { submissions, exams, shifts } from "@/lib/db/schema";
import { eq, desc, sql, like, and, or, gte, lte, count } from "drizzle-orm";

// GET - List submissions with filters
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const search = searchParams.get("search");
        const examId = searchParams.get("examId");
        const shiftId = searchParams.get("shiftId");
        const category = searchParams.get("category");
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "50");
        const offset = (page - 1) * limit;

        // Build conditions
        const conditions = [];

        if (search) {
            conditions.push(
                or(
                    like(submissions.name, `%${search}%`),
                    like(submissions.rollNumber, `%${search}%`)
                )
            );
        }

        if (examId) {
            conditions.push(eq(submissions.examId, parseInt(examId)));
        }

        if (shiftId) {
            conditions.push(eq(submissions.shiftId, parseInt(shiftId)));
        }

        if (category && category !== "all") {
            conditions.push(eq(submissions.category, category as any));
        }

        // Get submissions
        const submissionsList = await db
            .select({
                id: submissions.id,
                rollNumber: submissions.rollNumber,
                name: submissions.name,
                category: submissions.category,
                rawScore: submissions.rawScore,
                normalizedScore: submissions.normalizedScore,
                overallRank: submissions.overallRank,
                categoryRank: submissions.categoryRank,
                accuracy: submissions.accuracy,
                examId: submissions.examId,
                shiftId: submissions.shiftId,
                createdAt: submissions.createdAt,
            })
            .from(submissions)
            .where(conditions.length ? and(...conditions) : undefined)
            .orderBy(desc(submissions.createdAt))
            .limit(limit)
            .offset(offset);

        // Get total count
        const [totalResult] = await db
            .select({ count: count() })
            .from(submissions)
            .where(conditions.length ? and(...conditions) : undefined);

        // Get exam names
        const examIds = [...new Set(submissionsList.map((s) => s.examId))];
        const examNames: Record<number, string> = {};
        if (examIds.length > 0) {
            const examData = await db
                .select({ id: exams.id, name: exams.name })
                .from(exams);
            examData.forEach((e) => {
                examNames[e.id] = e.name;
            });
        }

        // Get shift codes
        const shiftIds = [...new Set(submissionsList.map((s) => s.shiftId))];
        const shiftCodes: Record<number, string> = {};
        if (shiftIds.length > 0) {
            const shiftData = await db
                .select({ id: shifts.id, shiftCode: shifts.shiftCode })
                .from(shifts);
            shiftData.forEach((s) => {
                shiftCodes[s.id] = s.shiftCode;
            });
        }

        return NextResponse.json({
            submissions: submissionsList.map((s) => ({
                ...s,
                examName: examNames[s.examId] || "Unknown",
                shiftCode: shiftCodes[s.shiftId] || "Unknown",
            })),
            pagination: {
                page,
                limit,
                total: totalResult?.count || 0,
                totalPages: Math.ceil((totalResult?.count || 0) / limit),
            },
        });
    } catch (error) {
        console.error("Error fetching submissions:", error);
        return NextResponse.json({ error: "Failed to fetch submissions" }, { status: 500 });
    }
}

// DELETE - Bulk delete submissions
export async function DELETE(request: NextRequest) {
    try {
        const body = await request.json();
        const { ids } = body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ error: "No IDs provided" }, { status: 400 });
        }

        for (const id of ids) {
            await db.delete(submissions).where(eq(submissions.id, id));
        }

        return NextResponse.json({ success: true, deleted: ids.length });
    } catch (error) {
        console.error("Error deleting submissions:", error);
        return NextResponse.json({ error: "Failed to delete submissions" }, { status: 500 });
    }
}
