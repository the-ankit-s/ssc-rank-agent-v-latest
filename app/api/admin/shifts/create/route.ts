
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { shifts, exams } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        if (!body.examId || !body.date || !body.shiftNumber) {
            return NextResponse.json(
                { error: "Missing required fields: examId, date, shiftNumber" },
                { status: 400 }
            );
        }

        const shiftCode = body.shiftCode || `${body.date.replace(/-/g, "")}_S${body.shiftNumber}`;

        const [newShift] = await db.insert(shifts).values({
            examId: body.examId,
            date: body.date, // Expecting YYYY-MM-DD
            shiftNumber: body.shiftNumber,
            shiftCode,
            timeSlot: body.timeSlot || "morning",
            startTime: body.startTime,
            endTime: body.endTime,
            difficultyIndex: body.difficultyIndex || 0.5,
            difficultyLabel: body.difficultyLabel || "moderate",
            normalizationFactor: body.normalizationFactor || 1.0,
        }).returning();

        // Update exam shift count
        await db.update(exams).set({
            totalShifts: sql`${exams.totalShifts} + 1`,
        }).where(eq(exams.id, body.examId));

        return NextResponse.json({ shift: newShift, success: true }, { status: 201 });
    } catch (error) {
        console.error("Error creating shift:", error);
        return NextResponse.json({ error: "Failed to create shift" }, { status: 500 });
    }
}
