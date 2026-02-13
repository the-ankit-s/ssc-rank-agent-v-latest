import { NextRequest, NextResponse } from "next/server";
import { restoreExam, getArchiveInfo } from "@/lib/archive/sqlite-archive";
import { db } from "@/lib/db/client";
import { exams } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// POST — Restore an exam from SQLite archive back to Postgres
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const examId = parseInt(id);
        if (isNaN(examId)) return NextResponse.json({ error: "Invalid exam ID" }, { status: 400 });

        // Check archive exists first
        const [exam] = await db.select().from(exams).where(eq(exams.id, examId)).limit(1);
        if (!exam) return NextResponse.json({ error: "Exam not found" }, { status: 404 });

        const info = getArchiveInfo(exam.slug);
        if (!info?.exists) {
            return NextResponse.json({ error: "No archive file found for this exam" }, { status: 404 });
        }

        const result = await restoreExam(examId);

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json({
            success: true,
            message: `Exam restored successfully. ${result.submissionsRestored} submissions re-imported to PostgreSQL.`,
            submissionsRestored: result.submissionsRestored,
        });
    } catch (error: any) {
        console.error("Restore error:", error);
        return NextResponse.json({ error: error.message || "Failed to restore exam" }, { status: 500 });
    }
}
