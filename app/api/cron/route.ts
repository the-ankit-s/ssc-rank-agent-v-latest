
import { startTransition } from "react";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { scheduledJobs, jobRuns } from "@/lib/db/schema";
import { runJob } from "@/lib/jobs/runner";
import { eq, sql, and, lte } from "drizzle-orm";

export const dynamic = 'force-dynamic'; // Ensure this is not cached

export async function GET() {
    try {
        // 1. Get enabled jobs that are due
        // For simplicity in this demo, we can just check if nextRunAt <= NOW
        // In a real app with cron expressions, we'd calculate nextRunAt properly.
        // Here we assume "nextRunAt" is set manually or by a previous run.

        // MVP: Simple interval-based logic handling in code or just rely on manual triggers for now?
        // User asked for: "make it automatic... like run score prediction on every sunday"

        // Improving logic:
        // We will fetch all enabled scheduled jobs.
        // If nextRunAt is null (first run) or in the past, we trigger it.

        const dueJobs = await db
            .select()
            .from(scheduledJobs)
            .where(
                and(
                    eq(scheduledJobs.isEnabled, true),
                    lte(scheduledJobs.nextRunAt, new Date())
                )
            );

        if (dueJobs.length === 0) {
            return NextResponse.json({ message: "No jobs due" });
        }

        const triggeredJobs = [];

        for (const schedule of dueJobs) {
            // Create a job run
            const [jobRun] = await db
                .insert(jobRuns)
                .values({
                    jobName: `Scheduled: ${schedule.name}`,
                    jobType: schedule.jobType,
                    status: "pending",
                    triggeredBy: "scheduler",
                    metadata: schedule.config, // Use config as metadata
                })
                .returning();

            triggeredJobs.push(jobRun.id);

            // Update next run time
            const nextRun = new Date();
            const cronParts = (schedule.cronExpression || "").toUpperCase().split(" ");

            // Simple logic: If keyword, use that. If cron string, assume simplified interpretation or default to +1 day
            if (schedule.cronExpression === "WEEKLY" || schedule.cronExpression === "0 0 * * 0") {
                nextRun.setDate(nextRun.getDate() + 7);
            } else if (schedule.cronExpression === "DAILY" || schedule.cronExpression === "0 0 * * *") {
                nextRun.setDate(nextRun.getDate() + 1);
            } else {
                // Fallback: Default to daily if unknown
                nextRun.setDate(nextRun.getDate() + 1);
            }

            await db
                .update(scheduledJobs)
                .set({
                    lastRunAt: new Date(),
                    nextRunAt: nextRun
                })
                .where(eq(scheduledJobs.id, schedule.id));

            // Fire and forget execution
            runJob(jobRun.id).catch(err => console.error(`[Scheduler] Job ${jobRun.id} failed to launch`, err));
        }

        return NextResponse.json({
            success: true,
            triggered: triggeredJobs.length,
            jobs: triggeredJobs
        });

    } catch (error) {
        console.error("[Scheduler] Error:", error);
        return NextResponse.json({ error: "Scheduler failed" }, { status: 500 });
    }
}
