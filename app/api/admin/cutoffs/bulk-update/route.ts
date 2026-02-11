import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { cutoffs } from "@/lib/db/schema";
import { inArray } from "drizzle-orm";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { ids, data } = body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ error: "No IDs provided" }, { status: 400 });
        }

        if (!data || typeof data !== "object") {
            return NextResponse.json({ error: "No update data provided" }, { status: 400 });
        }

        await db
            .update(cutoffs)
            .set({ ...data, updatedAt: new Date() })
            .where(inArray(cutoffs.id, ids));

        return NextResponse.json({ success: true, count: ids.length });
    } catch (error) {
        console.error("Error bulk updating cutoffs:", error);
        return NextResponse.json({ error: "Failed to bulk update cutoffs" }, { status: 500 });
    }
}
