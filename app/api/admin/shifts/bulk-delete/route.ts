
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { shifts } from "@/lib/db/schema";
import { inArray } from "drizzle-orm";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { ids } = body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ error: "No IDs provided" }, { status: 400 });
        }

        // Hard delete for shifts as per user request implied (or check schema for soft delete)
        // Schema doesn't look like it has isActive for shifts, but usually we cascade delete submissions.
        // Let's stick to simple delete for now.

        await db.delete(shifts).where(inArray(shifts.id, ids));

        return NextResponse.json({ success: true, count: ids.length });
    } catch (error) {
        console.error("Bulk delete error:", error);
        return NextResponse.json({ error: "Failed to delete shifts" }, { status: 500 });
    }
}
