
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { shifts, exams } from "@/lib/db/schema";
import { inArray, sql, eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { ids } = body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ error: "No IDs provided" }, { status: 400 });
        }

        // 1. Fetch shifts to get their metrics before deletion
        const shiftsToDelete = await db
            .select({
                id: shifts.id,
                examId: shifts.examId,
                candidateCount: shifts.candidateCount
            })
            .from(shifts)
            .where(inArray(shifts.id, ids));

        if (shiftsToDelete.length === 0) {
            return NextResponse.json({ success: true, count: 0 });
        }

        // 2. Aggregate stats by exam
        const statsByExam: Record<number, { shiftCount: number, subCount: number }> = {};

        shiftsToDelete.forEach(s => {
            if (!statsByExam[s.examId]) {
                statsByExam[s.examId] = { shiftCount: 0, subCount: 0 };
            }
            statsByExam[s.examId].shiftCount += 1;
            statsByExam[s.examId].subCount += (s.candidateCount || 0);
        });

        // 3. Delete shifts (Cascade will handle submissions)
        await db.delete(shifts).where(inArray(shifts.id, ids));

        // 4. Update Exam Stats
        for (const [examIdStr, stats] of Object.entries(statsByExam)) {
            const examId = parseInt(examIdStr);
            await db.update(exams)
                .set({
                    totalShifts: sql`${exams.totalShifts} - ${stats.shiftCount}`,
                    totalSubmissions: sql`${exams.totalSubmissions} - ${stats.subCount}`
                })
                .where(eq(exams.id, examId));
        }

        return NextResponse.json({ success: true, count: ids.length });
    } catch (error) {
        console.error("Bulk delete error:", error);
        return NextResponse.json({ error: "Failed to delete shifts" }, { status: 500 });
    }
}
