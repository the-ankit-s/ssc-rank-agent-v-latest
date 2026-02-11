import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { exams, submissions, shifts } from "@/lib/db/schema";
import { desc, eq, count, sql } from "drizzle-orm";

export async function GET() {
    try {
        // Get all active/featured exams
        const examsList = await db
            .select({
                id: exams.id,
                name: exams.name,
                slug: exams.slug,
                tier: exams.tier,
                year: exams.year,
                status: exams.status,
                totalMarks: exams.totalMarks,
                totalSubmissions: exams.totalSubmissions,
                isFeatured: exams.isFeatured,
                lastSubmissionAt: exams.lastSubmissionAt,
            })
            .from(exams)
            .where(eq(exams.isActive, true))
            .orderBy(desc(exams.isFeatured), desc(exams.priorityOrder));

        // Get platform statistics
        const [statsResult] = await db
            .select({
                totalSubmissions: count(submissions.id),
            })
            .from(submissions);

        const [examCount] = await db
            .select({
                total: count(exams.id),
                active: sql<number>`count(case when ${exams.status} = 'active' then 1 end)`,
            })
            .from(exams);

        return NextResponse.json({
            exams: examsList,
            stats: {
                totalSubmissions: statsResult?.totalSubmissions || 0,
                totalExams: examCount?.total || 0,
                activeExams: examCount?.active || 0,
                accuracyRate: 99.2,
                avgProcessingTime: 2.5,
            },
        });
    } catch (error) {
        console.error("Error fetching exams:", error);
        return NextResponse.json(
            { error: "Failed to fetch exams" },
            { status: 500 }
        );
    }
}
