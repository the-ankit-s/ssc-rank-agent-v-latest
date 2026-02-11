import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { submissions, exams } from "@/lib/db/schema";
import { eq, desc, sql } from "drizzle-orm";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { reportType, examId } = body;

        if (!reportType) {
            return NextResponse.json({ error: "Report type required" }, { status: 400 });
        }

        let data: any[] = [];
        let filename = `report_${reportType}_${Date.now()}.csv`;

        if (reportType === "exam_summary") {
            // Generate summary of all submissions for an exam
            data = await db
                .select({
                    rollNumber: submissions.rollNumber,
                    name: submissions.name,
                    category: submissions.category,
                    gender: submissions.gender,
                    rawScore: submissions.rawScore,
                    normalizedScore: submissions.normalizedScore,
                    rank: submissions.overallRank,
                    examName: exams.name,
                    date: submissions.createdAt,
                })
                .from(submissions)
                .leftJoin(exams, eq(submissions.examId, exams.id))
                .where(examId ? eq(submissions.examId, examId) : undefined)
                .orderBy(desc(submissions.rawScore))
                .limit(1000); // Limit for safety in this demo
        } else if (reportType === "category_performance") {
            data = await db
                .select({
                    category: submissions.category,
                    count: sql`count(*)`,
                    avgScore: sql`avg(${submissions.rawScore})`,
                    maxScore: sql`max(${submissions.rawScore})`,
                    minScore: sql`min(${submissions.rawScore})`
                })
                .from(submissions)
                .where(examId ? eq(submissions.examId, examId) : undefined)
                .groupBy(submissions.category)
        }

        // Convert to CSV
        if (data.length === 0) {
            return NextResponse.json({ error: "No data found for report" }, { status: 404 });
        }

        const headers = Object.keys(data[0]).join(",");
        const rows = data.map(row =>
            Object.values(row).map(value =>
                typeof value === 'string' ? `"${value}"` : value
            ).join(",")
        ).join("\n");

        const csvContent = `${headers}\n${rows}`;

        // In a real app, we might upload this to S3 and return a URL
        // Here we'll return the content directly which client can download as blob

        return new NextResponse(csvContent, {
            headers: {
                "Content-Type": "text/csv",
                "Content-Disposition": `attachment; filename="${filename}"`,
            }
        });

    } catch (error) {
        console.error("Error generating report:", error);
        return NextResponse.json(
            { error: "Failed to generate report" },
            { status: 500 }
        );
    }
}
