
import { db } from "@/lib/db";
import { jobRuns } from "@/lib/db/schema";
import { eq, lt, sql } from "drizzle-orm";

export async function cleanupData(jobId: number, metadata?: any) {
    // Example: Delete job runs older than 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await db
        .delete(jobRuns)
        .where(lt(jobRuns.completedAt, thirtyDaysAgo))
        .returning({ id: jobRuns.id });

    await db
        .update(jobRuns)
        .set({
            metadata: {
                affectedRows: result.length,
            }
        })
        .where(eq(jobRuns.id, jobId));
}
