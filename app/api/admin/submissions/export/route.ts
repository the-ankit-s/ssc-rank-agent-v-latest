import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { submissions, exams, shifts } from "@/lib/db/schema";
import { inArray } from "drizzle-orm";

// POST - Export submissions as CSV
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { ids } = body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ error: "No IDs provided" }, { status: 400 });
        }

        // Fetch submissions
        const submissionsList = await db
            .select()
            .from(submissions)
            .where(inArray(submissions.id, ids));

        // Get exam names
        const examIds = [...new Set(submissionsList.map((s) => s.examId))];
        const examNames: Record<number, string> = {};
        if (examIds.length > 0) {
            const examData = await db
                .select({ id: exams.id, name: exams.name })
                .from(exams)
                .where(inArray(exams.id, examIds));
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
                .from(shifts)
                .where(inArray(shifts.id, shiftIds));
            shiftData.forEach((s) => {
                shiftCodes[s.id] = s.shiftCode;
            });
        }

        // Build CSV
        const headers = [
            "ID",
            "Roll Number",
            "Name",
            "Exam",
            "Shift",
            "Category",
            "Gender",
            "Raw Score",
            "Normalized Score",
            "Overall Rank",
            "Category Rank",
            "Accuracy",
            "Submitted At",
        ];

        const rows = submissionsList.map((s) => [
            s.id,
            s.rollNumber,
            s.name,
            examNames[s.examId] || "Unknown",
            shiftCodes[s.shiftId] || "Unknown",
            s.category,
            s.gender,
            s.rawScore,
            s.normalizedScore || "N/A",
            s.overallRank || "N/A",
            s.categoryRank || "N/A",
            s.accuracy ? `${s.accuracy.toFixed(2)}%` : "N/A",
            s.createdAt?.toISOString() || "",
        ]);

        const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");

        return new NextResponse(csv, {
            headers: {
                "Content-Type": "text/csv",
                "Content-Disposition": `attachment; filename="submissions-${Date.now()}.csv"`,
            },
        });
    } catch (error) {
        console.error("Error exporting submissions:", error);
        return NextResponse.json(
            { error: "Failed to export submissions" },
            { status: 500 }
        );
    }
}
