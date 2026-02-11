
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { exams } from "@/lib/db/schema";
import { inArray } from "drizzle-orm";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { ids, hard } = body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ error: "No IDs provided" }, { status: 400 });
        }

        if (hard) {
            // Hard delete (permanent removal)
            await db
                .delete(exams)
                .where(inArray(exams.id, ids));
        } else {
            // Soft delete (set isActive = false)
            await db
                .update(exams)
                .set({ isActive: false })
                .where(inArray(exams.id, ids));
        }

        return NextResponse.json({ success: true, count: ids.length });
    } catch (error) {
        console.error("Bulk delete error:", error);
        return NextResponse.json({ error: "Failed to delete exams" }, { status: 500 });
    }
}
