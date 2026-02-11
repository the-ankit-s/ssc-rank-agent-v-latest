
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { shifts, submissions } from "@/lib/db/schema";
import { inArray, eq, sql } from "drizzle-orm";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { ids } = body; // Optional: specific shifts to recalculate

        // If ids provided, recalculate only those. Else, maybe all? Let's restrict to IDs for safety.
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ error: "No IDs provided" }, { status: 400 });
        }

        // Trigger background job or do it inline if simple.
        // Inline logic: Update candidateCount, avgRawScore, max, min, stdDev

        for (const shiftId of ids) {
            const stats = await db
                .select({
                    count: sql<number>`count(*)`,
                    avg: sql<number>`avg(${submissions.rawScore})`,
                    max: sql<number>`max(${submissions.rawScore})`,
                    min: sql<number>`min(${submissions.rawScore})`,
                    stdDev: sql<number>`stddev(${submissions.rawScore})`
                })
                .from(submissions)
                .where(eq(submissions.shiftId, shiftId));

            const s = stats[0];

            await db.update(shifts).set({
                candidateCount: Number(s.count),
                avgRawScore: s.avg ? Number(s.avg) : 0,
                maxRawScore: s.max ? Number(s.max) : 0,
                minRawScore: s.min ? Number(s.min) : 0,
                stdDev: s.stdDev ? Number(s.stdDev) : 0,
                statsUpdatedAt: new Date()
            }).where(eq(shifts.id, shiftId));
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Bulk recalculate error:", error);
        return NextResponse.json({ error: "Failed to recalculate stats" }, { status: 500 });
    }
}
