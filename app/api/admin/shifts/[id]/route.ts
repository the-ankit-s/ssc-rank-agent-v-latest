import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { shifts, exams, submissions } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const shiftId = parseInt(id);

        const shift = await db.query.shifts.findFirst({
            where: eq(shifts.id, shiftId),
            with: {
                exam: true
            }
        });

        if (!shift) {
            return NextResponse.json({ error: "Shift not found" }, { status: 404 });
        }

        // Fetch score distribution
        const scores = await db
            .select({ score: submissions.rawScore })
            .from(submissions)
            .where(eq(submissions.shiftId, shiftId));

        // Calculate distribution (buckets of 10)
        const distribution: Record<string, number> = {};
        scores.forEach(s => {
            const score = s.score || 0;
            const bucket = Math.floor(score / 10) * 10;
            const key = `${bucket}-${bucket + 9}`;
            distribution[key] = (distribution[key] || 0) + 1;
        });

        const chartData = Object.entries(distribution)
            .map(([range, count]) => ({ range, count }))
            .sort((a, b) => parseInt(a.range) - parseInt(b.range));

        // Fetch top 5 candidates
        const topCandidates = await db.query.submissions.findMany({
            where: eq(submissions.shiftId, shiftId),
            orderBy: [desc(submissions.rawScore)],
            limit: 5,
            columns: {
                id: true,
                rollNumber: true,
                name: true,
                rawScore: true,
                overallPercentile: true
            }
        });

        return NextResponse.json({ shift, stats: { distribution: chartData }, topCandidates });
    } catch (error) {
        console.error("Error fetching shift:", error);
        return NextResponse.json({ error: "Failed to fetch shift details" }, { status: 500 });
    }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const shiftId = parseInt(id);
        const body = await req.json();

        const updatedShift = await db.update(shifts)
            .set({
                ...body,
                date: body.date ? new Date(body.date).toISOString() : undefined,
                updatedAt: new Date()
            })
            .where(eq(shifts.id, shiftId))
            .returning();

        return NextResponse.json({ shift: updatedShift[0] });
    } catch (error) {
        console.error("Error updating shift:", error);
        return NextResponse.json({ error: "Failed to update shift" }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const shiftId = parseInt(id);

        await db.delete(shifts).where(eq(shifts.id, shiftId));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting shift:", error);
        return NextResponse.json({ error: "Failed to delete shift" }, { status: 500 });
    }
}
