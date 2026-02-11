import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jobRuns } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { runJob } from "@/lib/jobs/runner";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const jobId = parseInt(id);

        if (isNaN(jobId)) {
            return NextResponse.json({ error: "Invalid job ID" }, { status: 400 });
        }

        const [job] = await db
            .select()
            .from(jobRuns)
            .where(eq(jobRuns.id, jobId));

        if (!job) {
            return NextResponse.json({ error: "Job not found" }, { status: 404 });
        }

        return NextResponse.json({ job });
    } catch (error) {
        console.error("Error fetching job:", error);
        return NextResponse.json({ error: "Failed to fetch job" }, { status: 500 });
    }
}

// Retry a failed job
export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const jobId = parseInt(id);

        if (isNaN(jobId)) {
            return NextResponse.json({ error: "Invalid job ID" }, { status: 400 });
        }

        const body = await req.json();
        const { action } = body; // "retry" or "cancel"

        if (action === "retry") {
            const [job] = await db
                .select()
                .from(jobRuns)
                .where(eq(jobRuns.id, jobId));

            if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
            if (job.status !== "failed") return NextResponse.json({ error: "Only failed jobs can be retried" }, { status: 400 });

            // Create a new job run based on the failed one
            const [newJob] = await db
                .insert(jobRuns)
                .values({
                    jobName: job.jobName.replace(/\(retry.*\)/, "").trim() + ` (retry)`,
                    jobType: job.jobType,
                    status: "pending",
                    metadata: job.metadata,
                })
                .returning();

            runJob(newJob.id).catch(err => console.error("Retry job failed:", err));

            return NextResponse.json({ success: true, newJobId: newJob.id });
        }

        if (action === "cancel") {
            const [job] = await db
                .select()
                .from(jobRuns)
                .where(eq(jobRuns.id, jobId));

            if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
            if (job.status !== "running" && job.status !== "pending") {
                return NextResponse.json({ error: "Only running/pending jobs can be cancelled" }, { status: 400 });
            }

            await db
                .update(jobRuns)
                .set({
                    status: "failed",
                    completedAt: new Date(),
                    errorMessage: "Cancelled by admin",
                })
                .where(eq(jobRuns.id, jobId));

            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    } catch (error) {
        console.error("Error:", error);
        return NextResponse.json({ error: "Failed to process action" }, { status: 500 });
    }
}
