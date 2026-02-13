import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { auditLogs, adminUsers } from "@/lib/db/schema";
import { desc, and, eq, gte, lte, sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);

        // Filters
        const adminUserId = searchParams.get("adminUserId");
        const entity = searchParams.get("entity");
        const action = searchParams.get("action");
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "50");
        const offset = (page - 1) * limit;

        // Build where conditions
        const conditions: any[] = [];
        if (adminUserId) {
            conditions.push(eq(auditLogs.adminUserId, parseInt(adminUserId)));
        }
        if (entity) {
            conditions.push(eq(auditLogs.entity, entity as any));
        }
        if (action) {
            conditions.push(eq(auditLogs.action, action as any));
        }
        if (startDate) {
            conditions.push(gte(auditLogs.timestamp, new Date(startDate)));
        }
        if (endDate) {
            conditions.push(lte(auditLogs.timestamp, new Date(endDate)));
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        // Fetch logs with admin user info
        const logs = await db
            .select({
                id: auditLogs.id,
                entity: auditLogs.entity,
                entityId: auditLogs.entityId,
                action: auditLogs.action,
                oldValues: auditLogs.oldValues,
                newValues: auditLogs.newValues,
                ip: auditLogs.ip,
                userAgent: auditLogs.userAgent,
                timestamp: auditLogs.timestamp,
                adminUser: {
                    id: adminUsers.id,
                    name: adminUsers.name,
                    email: adminUsers.email,
                },
            })
            .from(auditLogs)
            .leftJoin(adminUsers, eq(auditLogs.adminUserId, adminUsers.id))
            .where(whereClause)
            .orderBy(desc(auditLogs.timestamp))
            .limit(limit)
            .offset(offset);

        // Get total count
        const [{ total }] = await db
            .select({ total: sql<number>`COUNT(*)` })
            .from(auditLogs)
            .where(whereClause);

        return NextResponse.json({
            logs,
            pagination: {
                total: Number(total),
                page,
                limit,
                totalPages: Math.ceil(Number(total) / limit),
            },
        });
    } catch (error: any) {
        console.error("Error fetching audit logs:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
