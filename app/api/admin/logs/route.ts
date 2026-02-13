import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { systemLogs } from "@/lib/db/schema";
import { desc, and, eq, gte, lte, ilike, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);

        // Pagination
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "50");
        const offset = (page - 1) * limit;

        // Filters
        const level = searchParams.get("level");
        const component = searchParams.get("component");
        const action = searchParams.get("action");
        const search = searchParams.get("search");
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");

        // Build where conditions
        const conditions: any[] = [];

        if (level && level !== "" && level !== "all") {
            conditions.push(eq(systemLogs.level, level as any));
        }
        if (component && component !== "") {
            conditions.push(eq(systemLogs.component, component));
        }
        if (action && action !== "") {
            conditions.push(ilike(systemLogs.action, `%${action}%`));
        }
        if (search && search !== "") {
            conditions.push(ilike(systemLogs.message, `%${search}%`));
        }
        if (startDate && startDate !== "") {
            conditions.push(gte(systemLogs.timestamp, new Date(startDate)));
        }
        if (endDate && endDate !== "") {
            conditions.push(lte(systemLogs.timestamp, new Date(endDate)));
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        // Fetch logs
        const logs = await db
            .select()
            .from(systemLogs)
            .where(whereClause)
            .orderBy(desc(systemLogs.timestamp))
            .limit(limit)
            .offset(offset);

        // Fetch total count for pagination
        const [{ count }] = await db
            .select({ count: sql<number>`count(*)` })
            .from(systemLogs)
            .where(whereClause);

        const total = Number(count);

        return NextResponse.json({
            logs,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("Error fetching logs:", error);
        return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 });
    }
}
