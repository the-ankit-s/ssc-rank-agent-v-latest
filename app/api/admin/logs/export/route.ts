import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { systemLogs } from "@/lib/db/schema";
import { desc, and, eq, gte, lte, ilike, sql } from "drizzle-orm";
import { format } from "date-fns";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);

        // Filters (same as main logs endpoint)
        const level = searchParams.get("level");
        const component = searchParams.get("component");
        const action = searchParams.get("action");
        const search = searchParams.get("search");
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");
        const formatType = searchParams.get("format") || "json";

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

        // Fetch logs (limit to 10,000 for exports)
        const logs = await db
            .select()
            .from(systemLogs)
            .where(whereClause)
            .orderBy(desc(systemLogs.timestamp))
            .limit(10000);

        if (formatType === "csv") {
            const headers = ["timestamp", "level", "component", "action", "message", "requestId", "userId", "ip"];
            const csvRows = [
                headers.join(","),
                ...logs.map((log) =>
                    [
                        log.timestamp ? format(new Date(log.timestamp), "yyyy-MM-dd HH:mm:ss") : "",
                        log.level,
                        `"${log.component}"`,
                        `"${log.action || ""}"`,
                        `"${log.message.replace(/"/g, '""')}"`,
                        log.requestId || "",
                        log.userId || "",
                        log.ip || "",
                    ].join(",")
                ),
            ];

            return new NextResponse(csvRows.join("\n"), {
                headers: {
                    "Content-Type": "text/csv",
                    "Content-Disposition": `attachment; filename="logs_${Date.now()}.csv"`,
                },
            });
        } else {
            return new NextResponse(JSON.stringify(logs, null, 2), {
                headers: {
                    "Content-Type": "application/json",
                    "Content-Disposition": `attachment; filename="logs_${Date.now()}.json"`,
                },
            });
        }
    } catch (error: any) {
        console.error("Error exporting logs:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
