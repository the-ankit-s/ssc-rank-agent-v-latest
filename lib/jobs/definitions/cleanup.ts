
import { db } from "@/lib/db";
import { jobRuns, systemLogs } from "@/lib/db/schema";
import { lt, count } from "drizzle-orm";
import { JobContext } from "../helpers";

/**
 * Data Cleanup Job
 * Removes old completed job runs (>30 days) and old system logs (>90 days).
 */
export async function cleanupData(jobId: number, metadata?: any) {
    const ctx = new JobContext(jobId);
    await ctx.updateProgress(5, "Scanning for old records…");

    const jobCutoff = new Date();
    jobCutoff.setDate(jobCutoff.getDate() - 30);

    const logCutoff = new Date();
    logCutoff.setDate(logCutoff.getDate() - 90);

    // Count records eligible for cleanup
    const [jobCount] = await db
        .select({ c: count() })
        .from(jobRuns)
        .where(lt(jobRuns.completedAt, jobCutoff));

    const [logCount] = await db
        .select({ c: count() })
        .from(systemLogs)
        .where(lt(systemLogs.timestamp, logCutoff));

    const totalToClean = (jobCount?.c || 0) + (logCount?.c || 0);
    await ctx.setTotal(totalToClean);

    if (totalToClean === 0) {
        await ctx.updateProgress(100, "Nothing to clean up — all records are recent.");
        return;
    }

    await ctx.updateProgress(20, `Found ${jobCount?.c || 0} old jobs and ${logCount?.c || 0} old logs to remove`);

    // Delete old job runs
    let deletedJobs = 0;
    if ((jobCount?.c || 0) > 0) {
        const result = await db
            .delete(jobRuns)
            .where(lt(jobRuns.completedAt, jobCutoff))
            .returning({ id: jobRuns.id });
        deletedJobs = result.length;
        await ctx.incrementProcessed(deletedJobs);
    }

    await ctx.updateProgress(60, `Deleted ${deletedJobs} old job runs, cleaning logs…`);

    // Delete old system logs
    let deletedLogs = 0;
    if ((logCount?.c || 0) > 0) {
        const result = await db
            .delete(systemLogs)
            .where(lt(systemLogs.timestamp, logCutoff))
            .returning({ id: systemLogs.id });
        deletedLogs = result.length;
        await ctx.incrementProcessed(deletedLogs);
    }

    await ctx.updateProgress(100, `Cleanup complete: removed ${deletedJobs} old jobs and ${deletedLogs} old logs`);
}
