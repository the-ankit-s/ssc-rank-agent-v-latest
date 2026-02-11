
import { db } from "@/lib/db";
import { jobRuns } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { jobRegistry } from "./registry";

export async function runJob(jobId: number) {
    console.log(`[JobRunner] Starting job ${jobId}...`);

    try {
        // 1. Fetch job details
        const [job] = await db
            .select()
            .from(jobRuns)
            .where(eq(jobRuns.id, jobId))
            .limit(1);

        if (!job) {
            console.error(`[JobRunner] Job ${jobId} not found`);
            return;
        }

        // 2. Update status to running
        await db
            .update(jobRuns)
            .set({
                status: "running",
                startedAt: new Date(),
                progressPercent: 0,
            })
            .where(eq(jobRuns.id, jobId));

        // 3. Execute the job function
        const jobFunction = jobRegistry[job.jobType];
        if (!jobFunction) {
            throw new Error(`No handler found for job type: ${job.jobType}`);
        }

        await jobFunction(jobId, job.metadata);

        // 4. Update status to success
        await db
            .update(jobRuns)
            .set({
                status: "success",
                completedAt: new Date(),
                progressPercent: 100,
            })
            .where(eq(jobRuns.id, jobId));

        console.log(`[JobRunner] Job ${jobId} completed successfully`);

    } catch (error: any) {
        console.error(`[JobRunner] Job ${jobId} failed:`, error);

        // 5. Update status to failed
        await db
            .update(jobRuns)
            .set({
                status: "failed",
                completedAt: new Date(),
                errorMessage: error.message || "Unknown error",
                errorStack: error.stack,
            })
            .where(eq(jobRuns.id, jobId));
    }
}
