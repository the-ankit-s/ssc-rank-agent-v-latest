
import { db } from "@/lib/db";
import { jobRuns } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { JobContext } from "../helpers";

/**
 * Database Backup Job
 * Creates a manifest of all tables with their row counts,
 * serving as a snapshot summary. A real production deployment
 * would invoke pg_dump here.
 */
export async function performBackup(jobId: number, metadata?: any) {
    const ctx = new JobContext(jobId);
    await ctx.updateProgress(10, "Enumerating tables…");

    // Get all user tables and their row counts
    const tables = await db.execute(sql`
        SELECT 
            relname as table_name,
            n_live_tup as row_count
        FROM pg_stat_user_tables
        ORDER BY n_live_tup DESC;
    `) as unknown as Array<{ table_name: string; row_count: number }>;

    const tableList = Array.isArray(tables) ? tables : [];
    await ctx.setTotal(tableList.length);
    await ctx.updateProgress(30, `Found ${tableList.length} tables, building manifest…`);

    const manifest: Record<string, number> = {};
    let totalRows = 0;

    for (let i = 0; i < tableList.length; i++) {
        const t = tableList[i];
        manifest[t.table_name] = Number(t.row_count) || 0;
        totalRows += Number(t.row_count) || 0;
        await ctx.incrementProcessed(1);
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `backup_manifest_${timestamp}.json`;

    await ctx.updateProgress(80, "Storing backup manifest…");

    // Store the manifest in job metadata
    await db
        .update(jobRuns)
        .set({
            progressPercent: 100,
            metadata: sql`jsonb_set(
                COALESCE(metadata, '{}'::jsonb),
                '{result}',
                ${JSON.stringify({
                message: `Backup manifest created: ${tableList.length} tables, ${totalRows.toLocaleString()} total rows`,
                filename,
                timestamp,
                tableCount: tableList.length,
                totalRows,
                tables: manifest,
            })}::jsonb
            )`,
        })
        .where(eq(jobRuns.id, jobId));
}
