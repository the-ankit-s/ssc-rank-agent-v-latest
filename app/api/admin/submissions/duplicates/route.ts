import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { submissions, exams } from "@/lib/db/schema";
import { eq, sql, and } from "drizzle-orm";

// GET - Detect duplicate submissions
export async function GET(request: NextRequest) {
    try {
        // Find duplicates by roll number + exam ID
        const duplicateGroups = await db
            .select({
                rollNumber: submissions.rollNumber,
                examId: submissions.examId,
                count: sql<number>`count(*)::int`,
            })
            .from(submissions)
            .groupBy(submissions.rollNumber, submissions.examId)
            .having(sql`count(*) > 1`);

        // For each group, get the submissions
        const groupsWithSubmissions = await Promise.all(
            duplicateGroups.map(async (group) => {
                const subs = await db
                    .select()
                    .from(submissions)
                    .where(
                        and(
                            eq(submissions.rollNumber, group.rollNumber),
                            eq(submissions.examId, group.examId)
                        )
                    )
                    .orderBy(submissions.createdAt);

                const [exam] = await db
                    .select({ name: exams.name })
                    .from(exams)
                    .where(eq(exams.id, group.examId))
                    .limit(1);

                return {
                    rollNumber: group.rollNumber,
                    examId: group.examId,
                    examName: exam?.name || "Unknown",
                    count: group.count,
                    submissions: subs.map((s) => ({
                        id: s.id,
                        name: s.name,
                        rawScore: s.rawScore,
                        normalizedScore: s.normalizedScore,
                        overallRank: s.overallRank,
                        createdAt: s.createdAt,
                        source: s.source,
                    })),
                };
            })
        );

        // Calculate stats
        const totalGroups = groupsWithSubmissions.length;
        const totalAffected = groupsWithSubmissions.reduce(
            (sum, g) => sum + g.count,
            0
        );

        return NextResponse.json({
            groups: groupsWithSubmissions,
            stats: {
                totalGroups,
                totalAffected,
                autoResolved: 0, // Would be tracked in a real implementation
            },
        });
    } catch (error) {
        console.error("Error detecting duplicates:", error);
        return NextResponse.json(
            { error: "Failed to detect duplicates" },
            { status: 500 }
        );
    }
}
