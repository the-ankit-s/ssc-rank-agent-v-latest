import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jobRuns, jobTypeEnum } from "@/lib/db/schema";
import { runJob } from "@/lib/jobs/runner";
import { desc, asc, eq, and, ilike, count, sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const status = searchParams.get("status");
        const jobType = searchParams.get("type");
        const search = searchParams.get("search");
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "25");
        const sort = searchParams.get("sort") || "id";
        const order = searchParams.get("order") || "desc";
        const offset = (page - 1) * limit;

        const conditions = [];
        if (status && status !== "all") conditions.push(eq(jobRuns.status, status as any));
        if (jobType && jobType !== "all") conditions.push(eq(jobRuns.jobType, jobType as any));
        if (search) conditions.push(ilike(jobRuns.jobName, `%${search}%`));

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        const sortMap: Record<string, any> = {
            id: jobRuns.id,
            startedAt: jobRuns.startedAt,
            completedAt: jobRuns.completedAt,
        };
        const sortCol = sortMap[sort] || jobRuns.id;
        const orderFn = order === "asc" ? asc(sortCol) : desc(sortCol);

        const [{ total }] = await db
            .select({ total: count() })
            .from(jobRuns)
            .where(whereClause);

        const jobs = await db
            .select()
            .from(jobRuns)
            .where(whereClause)
            .orderBy(orderFn)
            .limit(limit)
            .offset(offset);

        return NextResponse.json({
            jobs,
            pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
        });
    } catch (error) {
        console.error("Error fetching jobs:", error);
        return NextResponse.json({ error: "Failed to fetch jobs" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { type, examId, metadata: extraMeta } = body;

        if (!type) {
            return NextResponse.json({ error: "Job type is required" }, { status: 400 });
        }

        const [job] = await db
            .insert(jobRuns)
            .values({
                jobName: `${type.replace(/_/g, " ")} - Manual Trigger`,
                jobType: type,
                status: "pending",
                metadata: { examId, triggeredBy: "admin", ...extraMeta },
            })
            .returning();

        // Fire-and-forget async execution
        runJob(job.id).catch(err => console.error("Async job failed:", err));

        return NextResponse.json({ success: true, jobId: job.id });
    } catch (error) {
        console.error("Error triggering job:", error);
        return NextResponse.json({ error: "Failed to trigger job" }, { status: 500 });
    }
}
