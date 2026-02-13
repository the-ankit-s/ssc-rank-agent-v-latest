import { NextRequest, NextResponse } from "next/server";
import { archiveExam, getArchiveInfo } from "@/lib/archive/sqlite-archive";
import { db } from "@/lib/db/client";
import { exams, systemLogs, jobRuns } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import path from "path";
import fs from "fs";

async function writeLog(level: "INFO" | "WARN" | "ERROR", action: string, message: string, details?: Record<string, unknown>) {
    try {
        await db.insert(systemLogs).values({ level, component: "archive", action, message, details: details || {} });
    } catch (e) { console.error("[ARCHIVE LOG] Failed to write system log:", e); }
}

// POST — Archive an exam (export to SQLite + delete submissions from Postgres)
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    let jobId: number | null = null;
    try {
        const { id } = await params;
        const examId = parseInt(id);
        if (isNaN(examId)) return NextResponse.json({ error: "Invalid exam ID" }, { status: 400 });

        // Get exam name for logging
        const [exam] = await db.select({ name: exams.name, slug: exams.slug, totalSubmissions: exams.totalSubmissions }).from(exams).where(eq(exams.id, examId)).limit(1);
        const examLabel = exam ? `${exam.name} (${exam.slug})` : `ID ${examId}`;

        // Create a job run record
        const [job] = await db.insert(jobRuns).values({
            jobName: `Archive: ${exam?.name || `Exam #${examId}`}`,
            jobType: "backup",
            status: "running",
            startedAt: new Date(),
            totalRecords: exam?.totalSubmissions || 0,
            recordsProcessed: 0,
            progressPercent: 0,
            triggeredBy: "admin",
            metadata: { examId, slug: exam?.slug, action: "archive" } as any,
        }).returning({ id: jobRuns.id });
        jobId = job?.id || null;

        const result = await archiveExam(examId);

        if (!result.success) {
            // Mark job as failed
            if (jobId) {
                await db.update(jobRuns).set({
                    status: "failed",
                    completedAt: new Date(),
                    errorMessage: result.error || "Archive failed",
                    progressPercent: 0,
                }).where(eq(jobRuns.id, jobId));
            }
            await writeLog("ERROR", "archive_exam", `Archive failed for ${examLabel}: ${result.error}`, { examId, error: result.error, jobId });
            return NextResponse.json({ error: result.error }, { status: 400 });
        }

        // Mark job as success
        if (jobId) {
            await db.update(jobRuns).set({
                status: "success",
                completedAt: new Date(),
                recordsProcessed: result.submissionsArchived || 0,
                progressPercent: 100,
                metadata: {
                    examId, slug: exam?.slug, action: "archive",
                    submissionsArchived: result.submissionsArchived,
                    shiftsArchived: result.shiftsArchived,
                    cutoffsArchived: result.cutoffsArchived,
                    fileSizeMB: result.fileSize ? (result.fileSize / 1024 / 1024).toFixed(2) : "0",
                } as any,
            }).where(eq(jobRuns.id, jobId));
        }

        await writeLog("INFO", "archive_exam", `Archived ${examLabel}: ${result.submissionsArchived} submissions → ${((result.fileSize || 0) / 1024 / 1024).toFixed(2)} MB`, {
            examId, slug: exam?.slug, submissionsArchived: result.submissionsArchived,
            shiftsArchived: result.shiftsArchived, cutoffsArchived: result.cutoffsArchived,
            fileSizeMB: result.fileSize ? (result.fileSize / 1024 / 1024).toFixed(2) : "0", jobId,
        });

        return NextResponse.json({
            success: true,
            message: `Exam archived successfully. ${result.submissionsArchived} submissions moved to SQLite.`,
            archive: {
                filePath: result.filePath,
                fileSize: result.fileSize,
                fileSizeMB: result.fileSize ? (result.fileSize / 1024 / 1024).toFixed(2) : "0",
                submissionsArchived: result.submissionsArchived,
                shiftsArchived: result.shiftsArchived,
                cutoffsArchived: result.cutoffsArchived,
            },
        });
    } catch (error: any) {
        console.error("Archive error:", error);
        if (jobId) {
            try {
                await db.update(jobRuns).set({
                    status: "failed", completedAt: new Date(),
                    errorMessage: error.message || "Unhandled error", errorStack: error.stack,
                }).where(eq(jobRuns.id, jobId));
            } catch { /* best effort */ }
        }
        await writeLog("ERROR", "archive_exam", `Archive request crashed: ${error.message}`, { stack: error.stack, jobId });
        return NextResponse.json({ error: error.message || "Failed to archive exam" }, { status: 500 });
    }
}

// GET — Get archive status for an exam
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const examId = parseInt(id);
        if (isNaN(examId)) return NextResponse.json({ error: "Invalid exam ID" }, { status: 400 });

        const [exam] = await db.select().from(exams).where(eq(exams.id, examId)).limit(1);
        if (!exam) return NextResponse.json({ error: "Exam not found" }, { status: 404 });

        const info = getArchiveInfo(exam.slug);

        return NextResponse.json({
            examId,
            examName: exam.name,
            slug: exam.slug,
            archive: info,
        });
    } catch (error: any) {
        console.error("Archive info error:", error);
        return NextResponse.json({ error: "Failed to get archive info" }, { status: 500 });
    }
}

// DELETE — Delete an archive file (without restoring)
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const examId = parseInt(id);
        if (isNaN(examId)) return NextResponse.json({ error: "Invalid exam ID" }, { status: 400 });

        const [exam] = await db.select().from(exams).where(eq(exams.id, examId)).limit(1);
        if (!exam) return NextResponse.json({ error: "Exam not found" }, { status: 404 });

        const archivePath = path.join(process.cwd(), "data", "archives", `${exam.slug}.db`);
        if (!fs.existsSync(archivePath)) {
            return NextResponse.json({ error: "No archive file found" }, { status: 404 });
        }

        fs.unlinkSync(archivePath);
        return NextResponse.json({ success: true, message: "Archive file deleted" });
    } catch (error: any) {
        console.error("Archive delete error:", error);
        return NextResponse.json({ error: "Failed to delete archive" }, { status: 500 });
    }
}
