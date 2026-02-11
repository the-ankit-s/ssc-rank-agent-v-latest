import { db } from "@/lib/db/client";
import { systemLogs, errorGroups } from "@/lib/db/schema";
import { createHash } from "crypto";
import { sql } from "drizzle-orm";

export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

interface LogEntry {
    level: LogLevel;
    component: string;
    action?: string;
    message: string;
    details?: Record<string, unknown>;
    requestId?: string;
    userId?: string;
    ip?: string;
}

export async function log(entry: LogEntry) {
    try {
        let errorGroupId: number | undefined;

        if (entry.level === "ERROR") {
            try {
                // Generate hash for error grouping (Message + Component)
                // We truncate message to avoid massive hashes if message varies slightly, 
                // but ideally message should be the error template.
                const hashInput = `${entry.component}:${entry.message.substring(0, 500)}`;
                const errorHash = createHash("md5").update(hashInput).digest("hex");

                // Upsert error group
                const [group] = await db
                    .insert(errorGroups)
                    .values({
                        errorHash,
                        message: entry.message.substring(0, 1000), // Truncate for DB
                        component: entry.component,
                        stackTrace: (entry.details?.stack as string) || null,
                        lastSeen: new Date(),
                        occurrenceCount: 1,
                        status: "new",
                        severity: "medium", // Default
                    })
                    .onConflictDoUpdate({
                        target: errorGroups.errorHash,
                        set: {
                            lastSeen: new Date(),
                            occurrenceCount: sql`${errorGroups.occurrenceCount} + 1`,
                            // We don't update status implicitly. If it's resolved, it stays resolved until manually changed? 
                            // Or should we reopen it? 
                            // For now, let's just track occurrence.
                            // If we want to reopen: status: sql`CASE WHEN ${errorGroups.status} = 'resolved' THEN 'new' ELSE ${errorGroups.status} END`
                        },
                    })
                    .returning({ id: errorGroups.id });

                errorGroupId = group?.id;
            } catch (err) {
                console.error("Failed to group error:", err);
                // Fallback: proceed to log without group
            }
        }

        await db.insert(systemLogs).values({
            level: entry.level,
            component: entry.component,
            action: entry.action,
            message: entry.message,
            details: entry.details,
            requestId: entry.requestId,
            userId: entry.userId,
            ip: entry.ip,
            errorGroupId: errorGroupId,
        });
    } catch (error) {
        console.error("Failed to write log:", error);
    }
}

export const logger = {
    debug: (entry: Omit<LogEntry, "level">) => log({ ...entry, level: "DEBUG" }),
    info: (entry: Omit<LogEntry, "level">) => log({ ...entry, level: "INFO" }),
    warn: (entry: Omit<LogEntry, "level">) => log({ ...entry, level: "WARN" }),
    error: (entry: Omit<LogEntry, "level">) => log({ ...entry, level: "ERROR" }),
};
