
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { exams } from "@/lib/db/schema";
import { inArray } from "drizzle-orm";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { ids, data } = body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ error: "No IDs provided" }, { status: 400 });
        }

        if (!data || Object.keys(data).length === 0) {
            return NextResponse.json({ error: "No update data provided" }, { status: 400 });
        }

        // Remove sensitive or immutable fields from data if necessary
        // For now, allow updating any passed field that matches schema

        await db
            .update(exams)
            .set(data)
            .where(inArray(exams.id, ids));

        return NextResponse.json({ success: true, count: ids.length });
    } catch (error) {
        console.error("Bulk update error:", error);
        return NextResponse.json({ error: "Failed to update exams" }, { status: 500 });
    }
}
