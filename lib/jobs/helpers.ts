import { db } from "@/lib/db";
import { jobRuns, exams } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

/**
 * Shared context for background job definitions.
 * Eliminates duplicated updateProgress / exam-resolution logic
 * and ensures totalRecords + recordsProcessed are always tracked.
 */
export class JobContext {
    private _processed = 0;

    constructor(public readonly jobId: number) { }

    // ─── Progress ────────────────────────────────────────────────────────

    /** Set the total number of records this job will process. */
    async setTotal(total: number) {
        await db
            .update(jobRuns)
            .set({ totalRecords: total })
            .where(eq(jobRuns.id, this.jobId));
    }

    /** Increment recordsProcessed by `n` (default 1). */
    async incrementProcessed(n = 1) {
        this._processed += n;
        await db
            .update(jobRuns)
            .set({ recordsProcessed: this._processed })
            .where(eq(jobRuns.id, this.jobId));
    }

    /** Update progress percent + a human-readable status message. */
    async updateProgress(percent: number, message: string) {
        await db
            .update(jobRuns)
            .set({
                progressPercent: percent,
                recordsProcessed: this._processed,
                metadata: sql`jsonb_set(
                    COALESCE(metadata, '{}'::jsonb),
                    '{result}',
                    ${JSON.stringify({ message })}::jsonb
                )`,
            })
            .where(eq(jobRuns.id, this.jobId));
    }

    // ─── Exam Resolution ─────────────────────────────────────────────────

    /**
     * Resolve exam IDs from job metadata.
     * If metadata.examId is set, returns [examId].
     * Otherwise, returns all active exam IDs.
     */
    async getExamIds(metadata?: any): Promise<number[]> {
        if (metadata?.examId) return [metadata.examId];

        const allExams = await db
            .select({ id: exams.id })
            .from(exams)
            .where(eq(exams.isActive, true));

        return allExams.map((e) => e.id);
    }
}
