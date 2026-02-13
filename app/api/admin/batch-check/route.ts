import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { systemSettings, jobRuns, submissions } from "@/lib/db/schema";
import { eq, and, count } from "drizzle-orm";
import { runBatchProcessing, getPendingCount } from "@/lib/services/batch-processing";

/**
 * POST /api/admin/batch-check
 * 
 * Called to check if batch thresholds are met and trigger processing.
 * Can be called by:
 *   - Admin "Run Batch Now" button (force=true)
 *   - Cron scheduler
 *   - Threshold checker
 */
export async function POST(request: Request) {
    try {
        const body = await request.json().catch(() => ({}));
        const force = (body as any).force === true;

        // Check if batch processing is enabled
        const settings = await getSettings();

        if (!settings.batch_norm_enabled && !force) {
            return NextResponse.json({
                triggered: false,
                reason: "Batch processing is disabled",
            });
        }

        // Check pending count
        const pending = await getPendingCount();

        if (pending === 0) {
            return NextResponse.json({
                triggered: false,
                reason: "No pending submissions",
                pendingCount: 0,
            });
        }

        // If not forced, check conditions
        if (!force) {
            const mode = settings.batch_norm_mode as string;
            const minSubs = Number(settings.batch_norm_min_submissions) || 50;
            const timeWindow = settings.batch_norm_time_window as { start: string; end: string }
                || { start: "00:00", end: "06:00" };

            // Check time window
            const now = new Date();
            const hours = now.getHours();
            const minutes = now.getMinutes();
            const currentTime = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
            const inWindow = currentTime >= timeWindow.start && currentTime <= timeWindow.end;

            if (!inWindow) {
                return NextResponse.json({
                    triggered: false,
                    reason: `Outside time window (${timeWindow.start} - ${timeWindow.end})`,
                    pendingCount: pending,
                });
            }

            // Check threshold
            if (mode === "threshold" || mode === "both") {
                if (pending < minSubs) {
                    return NextResponse.json({
                        triggered: false,
                        reason: `Pending (${pending}) below threshold (${minSubs})`,
                        pendingCount: pending,
                    });
                }
            }
        }

        // Create a job run record
        const [job] = await db.insert(jobRuns).values({
            jobName: `Batch Processing (${pending} pending)`,
            jobType: "normalization",
            status: "running",
            startedAt: new Date(),
            triggeredBy: force ? "admin" : "auto",
            totalRecords: pending,
        }).returning();

        // Run the batch
        try {
            const result = await runBatchProcessing(job.id);

            // Update job as complete
            await db.update(jobRuns)
                .set({
                    status: result.errors.length > 0 ? "failed" : "success",
                    completedAt: new Date(),
                    progressPercent: 100,
                    recordsProcessed: result.totalSubmissions,
                    metadata: {
                        examsProcessed: result.examsProcessed,
                        totalSubmissions: result.totalSubmissions,
                        duration: result.duration,
                        errors: result.errors,
                    } as any,
                    errorMessage: result.errors.length > 0 ? result.errors.join("; ") : null,
                })
                .where(eq(jobRuns.id, job.id));

            return NextResponse.json({
                triggered: true,
                jobId: job.id,
                result,
            });

        } catch (error) {
            // Mark job as failed
            await db.update(jobRuns)
                .set({
                    status: "failed",
                    completedAt: new Date(),
                    errorMessage: error instanceof Error ? error.message : String(error),
                })
                .where(eq(jobRuns.id, job.id));

            throw error;
        }

    } catch (error) {
        console.error("Batch check error:", error);
        return NextResponse.json(
            { error: "Batch processing failed", details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}

// ─── Helper ────────────────────────────────────────────────────────────────

async function getSettings(): Promise<Record<string, unknown>> {
    const defaults: Record<string, unknown> = {
        batch_norm_mode: "both",
        batch_norm_schedule: "0 2 * * *",
        batch_norm_min_submissions: 50,
        batch_norm_time_window: { start: "00:00", end: "06:00" },
        batch_norm_enabled: true,
    };

    try {
        const rows = await db
            .select({ key: systemSettings.key, value: systemSettings.value })
            .from(systemSettings)
            .where(eq(systemSettings.category, "batch_processing"));

        for (const row of rows) {
            defaults[row.key] = row.value;
        }
    } catch {
        // Use defaults
    }

    return defaults;
}
