import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { errorGroups, systemLogs } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
    try {
        const params = await props.params;
        const id = parseInt(params.id);
        if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

        // Fetch Group
        const group = await db.query.errorGroups.findFirst({
            where: eq(errorGroups.id, id),
        });

        if (!group) return NextResponse.json({ error: "Error group not found" }, { status: 404 });

        // Fetch Recent Instances
        const instances = await db.query.systemLogs.findMany({
            where: eq(systemLogs.errorGroupId, id),
            orderBy: [desc(systemLogs.timestamp)],
            limit: 10,
        });

        return NextResponse.json({ ...group, instances });
    } catch (error) {
        console.error("Error fetching error details:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
    try {
        const params = await props.params;
        const id = parseInt(params.id);
        if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

        const body = await req.json();
        const { status, severity, metadata } = body;

        // Validate Status Enum (optional runtime check)
        const validStatuses = ["new", "acknowledged", "resolved", "ignored"];
        if (status && !validStatuses.includes(status)) {
            return NextResponse.json({ error: "Invalid status" }, { status: 400 });
        }

        const [updated] = await db
            .update(errorGroups)
            .set({
                ...(status && { status }),
                ...(severity && { severity }),
                ...(metadata && { metadata }), // Replaces metadata. If merging needed, logic should change.
                updatedAt: new Date(),
            })
            .where(eq(errorGroups.id, id))
            .returning();

        return NextResponse.json(updated);
    } catch (error) {
        console.error("Error updating error group:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
