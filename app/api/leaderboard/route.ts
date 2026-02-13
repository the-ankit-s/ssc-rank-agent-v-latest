import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { submissions, exams } from "@/lib/db/schema";
import { desc, eq, and, count, avg, max, min, sql } from "drizzle-orm";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const examId = searchParams.get("examId");
        const category = searchParams.get("category");
        const sortBy = searchParams.get("sort") || "rawScore"; // rawScore | normalizedScore | overallPercentile | accuracy

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
            return NextResponse.json({ leaderboard: [], exams: [], stats: null });
        }

        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "50");
        const offset = (page - 1) * limit;

        const conditions: any[] = [eq(submissions.examId, targetExamId)];
        if (category && category !== "all") {
            conditions.push(eq(submissions.category, category as any));
        }

        const filter = and(...conditions);

        // Get total count + aggregate stats
        const [statsResult] = await db
            .select({
                count: count(),
                avgRawScore: avg(submissions.rawScore),
                avgNormScore: avg(submissions.normalizedScore),
                avgAccuracy: avg(submissions.accuracy),
                maxRawScore: max(submissions.rawScore),
                minRawScore: min(submissions.rawScore),
                avgAttempted: avg(submissions.totalAttempted),
            })
            .from(submissions)
            .where(filter);

        const totalCount = statsResult?.count || 0;
        const hasMore = offset + limit < totalCount;

        // Sort column
        const sortCol = sortBy === "normalizedScore" ? desc(submissions.normalizedScore)
            : sortBy === "overallPercentile" ? desc(submissions.overallPercentile)
                : sortBy === "accuracy" ? desc(submissions.accuracy)
                    : desc(submissions.rawScore);

        // Get paginated submissions
        const leaderboard = (await db
            .select({
                id: submissions.id,
                name: submissions.name,
                rollNumber: submissions.rollNumber,
                category: submissions.category,
                gender: submissions.gender,
                state: submissions.state,
                rawScore: submissions.rawScore,
                normalizedScore: submissions.normalizedScore,
                accuracy: submissions.accuracy,
                overallRank: submissions.overallRank,
                overallPercentile: submissions.overallPercentile,
                totalAttempted: submissions.totalAttempted,
                totalCorrect: submissions.totalCorrect,
                totalWrong: submissions.totalWrong,
                examName: exams.name,
            })
            .from(submissions)
            .leftJoin(exams, eq(submissions.examId, exams.id))
            .where(filter)
            .orderBy(sortCol)
            .limit(limit)
            .offset(offset)).map((r, i) => ({
                ...r,
                normalizedScore: r.normalizedScore ? Number(Number(r.normalizedScore).toFixed(2)) : null,
                accuracy: r.accuracy ? Number(Number(r.accuracy).toFixed(1)) : null,
                overallPercentile: r.overallPercentile ? Number(Number(r.overallPercentile).toFixed(2)) : null,
                displayRank: offset + i + 1,
            }));

        // Get the current exam name
        const [currentExam] = await db.select({ name: exams.name }).from(exams).where(eq(exams.id, targetExamId));

        const allExams = await db.select({ id: exams.id, name: exams.name }).from(exams);

        return NextResponse.json({
            leaderboard,
            exams: allExams,
            currentExamId: targetExamId,
            currentExamName: currentExam?.name || "Unknown Exam",
            stats: {
                total: totalCount,
                avgRawScore: statsResult?.avgRawScore ? Number(Number(statsResult.avgRawScore).toFixed(1)) : 0,
                avgNormScore: statsResult?.avgNormScore ? Number(Number(statsResult.avgNormScore).toFixed(2)) : null,
                avgAccuracy: statsResult?.avgAccuracy ? Number(Number(statsResult.avgAccuracy).toFixed(1)) : 0,
                maxRawScore: statsResult?.maxRawScore ? Number(statsResult.maxRawScore) : 0,
                minRawScore: statsResult?.minRawScore ? Number(statsResult.minRawScore) : 0,
                avgAttempted: statsResult?.avgAttempted ? Number(Number(statsResult.avgAttempted).toFixed(0)) : 0,
            },
            pagination: {
                page,
                limit,
                total: totalCount,
                totalPages: Math.ceil(totalCount / limit),
                hasMore,
            },
            sortBy,
            categoryFilter: category || "all",
        });

    } catch (error) {
        console.error("Error fetching leaderboard:", error);
        return NextResponse.json({ error: "Failed to fetch leaderboard" }, { status: 500 });
    }
}
