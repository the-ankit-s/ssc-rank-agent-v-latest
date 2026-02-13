import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { cutoffs } from "@/lib/db/schema";
import { inArray } from "drizzle-orm";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { ids } = body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ error: "No IDs provided" }, { status: 400 });
        }

        await db
            .update(cutoffs)
            .set({
                isPublished: true,
                publishedAt: new Date(),
                updatedAt: new Date(),
            })
            .where(inArray(cutoffs.id, ids));

        return NextResponse.json({ success: true, count: ids.length });
    } catch (error) {
        console.error("Error publishing cutoffs:", error);
        return NextResponse.json(
            { error: "Failed to publish cutoffs" },
            { status: 500 }
        );
    }
}
