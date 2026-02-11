import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { errorGroups } from "@/lib/db/schema";
import { desc, eq, and, ilike, sql, inArray } from "drizzle-orm";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "10");
        const offset = (page - 1) * limit;

        const status = searchParams.get("status"); // new, acknowledged, resolved, ignored
        const severity = searchParams.get("severity"); // critical, high, medium, low
        const search = searchParams.get("search");

        const filters = [];
        if (status && status !== "all") filters.push(eq(errorGroups.status, status as any));
        if (severity && severity !== "all") filters.push(eq(errorGroups.severity, severity as any));
        if (search) filters.push(ilike(errorGroups.message, `%${search}%`));

        const whereClause = filters.length > 0 ? and(...filters) : undefined;

        // Fetch data
        const data = await db
            .select()
            .from(errorGroups)
            .where(whereClause)
            .orderBy(desc(errorGroups.lastSeen))
            .limit(limit)
            .offset(offset);

        // Fetch count
        const [{ count }] = await db
            .select({ count: sql<number>`count(*)` })
            .from(errorGroups)
            .where(whereClause);

        return NextResponse.json({
            data,
            meta: {
                total: Number(count),
                page,
                limit,
                totalPages: Math.ceil(Number(count) / limit),
            },
        });
    } catch (error) {
        console.error("Error fetching error groups:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
