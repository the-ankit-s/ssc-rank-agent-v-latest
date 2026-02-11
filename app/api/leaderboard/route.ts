import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { submissions, exams } from "@/lib/db/schema";
import { desc, eq, and, count } from "drizzle-orm";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const examId = searchParams.get("examId");
        const category = searchParams.get("category");

        // Default to latest active exam if no examId
        let targetExamId = examId ? parseInt(examId) : undefined;
        if (!targetExamId) {
            const latestExam = await db.query.exams.findFirst({
                where: eq(exams.status, "active"),
                orderBy: desc(exams.createdAt)
            });
            targetExamId = latestExam?.id;
        }

        if (!targetExamId) {
            return NextResponse.json({ leaderboard: [], exams: [] });
        }

        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "25");
        const offset = (page - 1) * limit;

        const conditions = [eq(submissions.examId, targetExamId)];
        if (category && category !== "all") {
            conditions.push(eq(submissions.category, category as any));
        }

        // Get total count for pagination metadata
        const [totalResult] = await db
            .select({ count: count() })
            .from(submissions)
            .where(and(...conditions));

        const totalCount = totalResult?.count || 0;
        const hasMore = offset + limit < totalCount;

        // Get paginated submissions
        const leaderboard = await db
            .select({
                id: submissions.id,
                name: submissions.name,
                rollNumber: submissions.rollNumber,
                category: submissions.category,
                rawScore: submissions.rawScore,
                normalizedScore: submissions.normalizedScore,
                rank: submissions.overallRank,
                examName: exams.name,
            })
            .from(submissions)
            .leftJoin(exams, eq(submissions.examId, exams.id))
            .where(and(...conditions))
            .orderBy(desc(submissions.rawScore)) // Or normalized score
            .limit(limit)
            .offset(offset);

        const allExams = await db.select({ id: exams.id, name: exams.name }).from(exams);

        return NextResponse.json({
            leaderboard,
            exams: allExams,
            currentExamId: targetExamId,
            pagination: {
                page,
                limit,
                total: totalCount,
                hasMore
            }
        });

    } catch (error) {
        console.error("Error fetching leaderboard:", error);
        return NextResponse.json({ error: "Failed to fetch leaderboard" }, { status: 500 });
    }
}
