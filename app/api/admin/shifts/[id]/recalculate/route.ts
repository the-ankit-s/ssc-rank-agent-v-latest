import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { shifts, submissions } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const shiftId = parseInt(id);

        // 1. Get all submissions for this shift
        const stats = await db
            .select({
                count: sql<number>`count(*)`,
                avgRaw: sql<number>`avg(${submissions.rawScore})`,
                maxRaw: sql<number>`max(${submissions.rawScore})`,
                minRaw: sql<number>`min(${submissions.rawScore})`,
                stdDev: sql<number>`stddev(${submissions.rawScore})`,
            })
            .from(submissions)
            .where(eq(submissions.shiftId, shiftId));

        const result = stats[0];

        // 2. Update shift stats
        const updatedShift = await db.update(shifts)
            .set({
                candidateCount: Number(result.count),
                avgRawScore: Number(result.avgRaw),
                maxRawScore: Number(result.maxRaw),
                minRawScore: Number(result.minRaw),
                stdDev: Number(result.stdDev),
                statsUpdatedAt: new Date()
            })
            .where(eq(shifts.id, shiftId))
            .returning();

        return NextResponse.json({ success: true, shift: updatedShift[0] });
    } catch (error) {
        console.error("Error recalculating shift stats:", error);
        return NextResponse.json({ error: "Failed to recalculate stats" }, { status: 500 });
    }
}
