import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { submissions } from "@/lib/db/schema";
import { eq, count } from "drizzle-orm";

/**
 * GET /api/result/pending-count
 * Returns the number of pending submissions (for admin UI and batch checks)
 */
export async function GET() {
    try {
        const [result] = await db
            .select({ count: count() })
            .from(submissions)
            .where(eq(submissions.processingStatus, "pending"));

        return NextResponse.json({ count: result?.count || 0 });
    } catch (error) {
        console.error("Error fetching pending count:", error);
        return NextResponse.json({ count: 0 });
    }
}
