
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { scheduledJobs, exams } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
    try {
        const jobs = await db
            .select()
            .from(scheduledJobs)
            .orderBy(desc(scheduledJobs.createdAt));

        return NextResponse.json({ jobs });
    } catch (error) {
        console.error("Error fetching scheduled jobs:", error);
        return NextResponse.json({ error: "Failed to fetch scheduled jobs" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validation
        if (!body.jobType || !body.cronExpression || !body.jobName) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Check if job name exists
        const [existing] = await db
            .select()
            .from(scheduledJobs)
            .where(eq(scheduledJobs.name, body.jobName));

        if (existing) {
            return NextResponse.json({ error: "Job with this name already exists" }, { status: 409 });
        }

        const [newJob] = await db
            .insert(scheduledJobs)
            .values({
                name: body.jobName,
                jobType: body.jobType,
                cronExpression: body.cronExpression,
                config: body.config || {},
                isEnabled: true,
                nextRunAt: new Date(), // Run immediately or calculate next run
            })
            .returning();

        return NextResponse.json({ job: newJob }, { status: 201 });
    } catch (error) {
        console.error("Error creating scheduled job:", error);
        return NextResponse.json({ error: "Failed to create scheduled job" }, { status: 500 });
    }

}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "Missing job ID" }, { status: 400 });
        }

        await db.delete(scheduledJobs).where(eq(scheduledJobs.id, parseInt(id)));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting scheduled job:", error);
        return NextResponse.json({ error: "Failed to delete scheduled job" }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "Missing job ID" }, { status: 400 });
        }

        const body = await request.json();

        await db
            .update(scheduledJobs)
            .set({ isEnabled: body.isEnabled, updatedAt: new Date() })
            .where(eq(scheduledJobs.id, parseInt(id)));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error updating scheduled job:", error);
        return NextResponse.json({ error: "Failed to update scheduled job" }, { status: 500 });
    }
}

