import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { submissions, exams, shifts } from "@/lib/db/schema";
import { eq, desc, asc, count, like, and, or, gte, lte, inArray } from "drizzle-orm";

// GET - List submissions with advanced filters, sorting, and pagination
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const search = searchParams.get("search");
        const examId = searchParams.get("examId");
        const shiftId = searchParams.get("shiftId");
        const categories = searchParams.get("category");
        const gender = searchParams.get("gender");
        const scoreMin = searchParams.get("scoreMin");
        const scoreMax = searchParams.get("scoreMax");
        const rankMin = searchParams.get("rankMin");
        const rankMax = searchParams.get("rankMax");
        const dateFrom = searchParams.get("dateFrom");
        const dateTo = searchParams.get("dateTo");
        const source = searchParams.get("source");
        const sortField = searchParams.get("sort") || "createdAt";
        const sortOrder = searchParams.get("order") || "desc";
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "25");
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

        if (examId && examId !== "all") {
            conditions.push(eq(submissions.examId, parseInt(examId)));
        }

        if (shiftId && shiftId !== "all") {
            conditions.push(eq(submissions.shiftId, parseInt(shiftId)));
        }

        if (categories && categories !== "all") {
            const categoryArray = categories.split(",");
            if (categoryArray.length > 0) {
                conditions.push(inArray(submissions.category, categoryArray as any));
            }
        }

        if (gender && gender !== "all") {
            conditions.push(eq(submissions.gender, gender as any));
        }

        if (scoreMin) {
            conditions.push(gte(submissions.rawScore, parseFloat(scoreMin)));
        }

        if (scoreMax) {
            conditions.push(lte(submissions.rawScore, parseFloat(scoreMax)));
        }

        if (rankMin) {
            conditions.push(gte(submissions.overallRank, parseInt(rankMin)));
        }

        if (rankMax) {
            conditions.push(lte(submissions.overallRank, parseInt(rankMax)));
        }

        if (dateFrom) {
            conditions.push(gte(submissions.createdAt, new Date(dateFrom)));
        }

        if (dateTo) {
            conditions.push(lte(submissions.createdAt, new Date(dateTo)));
        }

        if (source && source !== "all") {
            conditions.push(eq(submissions.source, source));
        }

        // Determine sort order
        const sortColumns: Record<string, any> = {
            createdAt: submissions.createdAt,
            rawScore: submissions.rawScore,
            normalizedScore: submissions.normalizedScore,
            overallRank: submissions.overallRank,
            categoryRank: submissions.categoryRank,
            accuracy: submissions.accuracy,
        };

        const sortColumn = sortColumns[sortField] || submissions.createdAt;
        const orderFn = sortOrder === "asc" ? asc : desc;

        // Get submissions
        const submissionsList = await db
            .select({
                id: submissions.id,
                rollNumber: submissions.rollNumber,
                name: submissions.name,
                category: submissions.category,
                gender: submissions.gender,
                rawScore: submissions.rawScore,
                normalizedScore: submissions.normalizedScore,
                overallRank: submissions.overallRank,
                overallPercentile: submissions.overallPercentile,
                categoryRank: submissions.categoryRank,
                accuracy: submissions.accuracy,
                totalAttempted: submissions.totalAttempted,
                totalCorrect: submissions.totalCorrect,
                totalWrong: submissions.totalWrong,
                examId: submissions.examId,
                shiftId: submissions.shiftId,
                source: submissions.source,
                createdAt: submissions.createdAt,
            })
            .from(submissions)
            .where(conditions.length ? and(...conditions) : undefined)
            .orderBy(orderFn(sortColumn))
            .limit(limit)
            .offset(offset);

        // Get total count
        const [totalResult] = await db
            .select({ count: count() })
            .from(submissions)
            .where(conditions.length ? and(...conditions) : undefined);

        // Get exam names and totals
        const examIds = [...new Set(submissionsList.map((s) => s.examId))];
        const examData: Record<number, { name: string; totalMarks: number }> = {};
        if (examIds.length > 0) {
            const examsList = await db
                .select({ id: exams.id, name: exams.name, totalMarks: exams.totalMarks })
                .from(exams)
                .where(inArray(exams.id, examIds));
            examsList.forEach((e) => {
                examData[e.id] = { name: e.name, totalMarks: e.totalMarks };
            });
        }

        // Get shift codes
        const shiftIds = [...new Set(submissionsList.map((s) => s.shiftId))];
        const shiftCodes: Record<number, string> = {};
        if (shiftIds.length > 0) {
            const shiftData = await db
                .select({ id: shifts.id, shiftCode: shifts.shiftCode })
                .from(shifts)
                .where(inArray(shifts.id, shiftIds));
            shiftData.forEach((s) => {
                shiftCodes[s.id] = s.shiftCode;
            });
        }

        return NextResponse.json({
            submissions: submissionsList.map((s) => ({
                ...s,
                examName: examData[s.examId]?.name || "Unknown",
                examTotal: examData[s.examId]?.totalMarks || 200,
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

        await db.delete(submissions).where(inArray(submissions.id, ids));

        return NextResponse.json({ success: true, deleted: ids.length });
    } catch (error) {
        console.error("Error deleting submissions:", error);
        return NextResponse.json({ error: "Failed to delete submissions" }, { status: 500 });
    }
}
