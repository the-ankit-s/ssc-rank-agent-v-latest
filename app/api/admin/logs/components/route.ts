import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { systemLogs } from "@/lib/db/schema";

export async function GET(req: NextRequest) {
    try {
        // Get unique components from logs
        const components = await db
            .selectDistinct({ component: systemLogs.component })
            .from(systemLogs)
            .orderBy(systemLogs.component);

        return NextResponse.json({
            components: components.map((c) => c.component),
        });
    } catch (error: any) {
        console.error("Error fetching components:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
