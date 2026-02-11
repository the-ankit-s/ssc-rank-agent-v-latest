import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { submissions, shifts } from "@/lib/db/schema";
import { eq, sql, count, avg, min, max, desc } from "drizzle-orm";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const examId = parseInt(id);

        if (isNaN(examId)) {
            return NextResponse.json({ error: "Invalid exam ID" }, { status: 400 });
        }

        // Aggregate Stats
        const [aggregateStats] = await db
            .select({
                totalSubmissions: count(),
                avgScore: avg(submissions.rawScore),
                maxScore: max(submissions.rawScore),
                minScore: min(submissions.rawScore),
            })
            .from(submissions)
            .where(eq(submissions.examId, examId));

        // Score Distribution (Buckets of 10 or 20 depends on range, let's do 25 for simplicity)
        const scoreDistribution = await db
            .select({
                range: sql<string>`
                    CASE 
                        WHEN ${submissions.rawScore} < 50 THEN '0-50'
                        WHEN ${submissions.rawScore} < 100 THEN '50-100'
                        WHEN ${submissions.rawScore} < 150 THEN '100-150'
                        ELSE '150+'
                    END
                `,
                count: count(),
            })
            .from(submissions)
            .where(eq(submissions.examId, examId))
            .groupBy(sql`
                CASE 
                    WHEN ${submissions.rawScore} < 50 THEN '0-50'
                    WHEN ${submissions.rawScore} < 100 THEN '50-100'
                    WHEN ${submissions.rawScore} < 150 THEN '100-150'
                    ELSE '150+'
                END
            `);

        // Category Breakdown
        const categoryBreakdown = await db
            .select({
                category: submissions.category,
                count: count(),
                avgScore: avg(submissions.rawScore),
            })
            .from(submissions)
            .where(eq(submissions.examId, examId))
            .groupBy(submissions.category);

        // Shift-wise Performance
        const shiftPerformance = await db
            .select({
                shiftId: submissions.shiftId,
                avgScore: avg(submissions.rawScore),
                count: count(),
            })
            .from(submissions)
            .where(eq(submissions.examId, examId))
            .groupBy(submissions.shiftId);

        // Fetch shift names
        const shiftIds = shiftPerformance.map(s => s.shiftId);
        const shiftNames: Record<number, string> = {};
        if (shiftIds.length > 0) {
            const shiftData = await db
                .select({ id: shifts.id, date: shifts.date, shift: shifts.shiftNumber })
                .from(shifts)
                .where(sql`${shifts.id} IN (${sql.join(shiftIds.map(id => sql`${id}`), sql`, `)})`);

            shiftData.forEach(s => {
                shiftNames[s.id] = `${new Date(s.date).toLocaleDateString()} (Shift ${s.shift})`;
            });
        }

        return NextResponse.json({
            analytics: {
                totalSubmissions: aggregateStats?.totalSubmissions || 0,
                avgScore: aggregateStats?.avgScore ? Number(aggregateStats.avgScore).toFixed(2) : "0.00",
                maxScore: aggregateStats?.maxScore || 0,
                minScore: aggregateStats?.minScore || 0,
                scoreDistribution: scoreDistribution.map(s => ({
                    range: s.range,
                    count: s.count
                })),
                categoryBreakdown: categoryBreakdown.map(c => ({
                    category: c.category,
                    count: c.count,
                    avgScore: c.avgScore ? Number(c.avgScore).toFixed(2) : "0.00"
                })),
                shiftPerformance: shiftPerformance.map(s => ({
                    name: shiftNames[s.shiftId] || `Shift ${s.shiftId}`,
                    avgScore: s.avgScore ? Number(s.avgScore).toFixed(2) : "0.00",
                    count: s.count
                }))
            }
        });

    } catch (error) {
        console.error("Error fetching exam analytics:", error);
        // @ts-ignore
        if (error.message) console.error("Error message:", error.message);
        // @ts-ignore
        if (error.stack) console.error("Error stack:", error.stack);
        return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
    }
}
