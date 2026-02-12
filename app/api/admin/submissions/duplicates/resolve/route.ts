import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { submissions } from "@/lib/db/schema";
import { eq, and, inArray, ne } from "drizzle-orm";

// POST - Resolve duplicate submissions
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { action, rollNumber, examId, selectedId } = body;

        if (!action || !rollNumber || !examId) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        // Fetch all submissions in the group
        const groupSubmissions = await db
            .select()
            .from(submissions)
            .where(
                and(
                    eq(submissions.rollNumber, rollNumber),
                    eq(submissions.examId, parseInt(examId))
                )
            )
            .orderBy(submissions.createdAt);

        if (groupSubmissions.length <= 1) {
            return NextResponse.json(
                { error: "No duplicates found for this group" },
                { status: 400 }
            );
        }

        let idsToDelete: number[] = [];

        if (action === "keep_first") {
            // Keep the first (earliest) submission
            idsToDelete = groupSubmissions.slice(1).map((s) => s.id);
        } else if (action === "keep_latest") {
            // Keep the last (most recent) submission
            idsToDelete = groupSubmissions.slice(0, -1).map((s) => s.id);
        } else if (action === "keep_selected") {
            if (!selectedId) {
                return NextResponse.json(
                    { error: "Selected ID is required for keep_selected action" },
                    { status: 400 }
                );
            }
            // Keep the selected submission
            idsToDelete = groupSubmissions
                .filter((s) => s.id !== parseInt(selectedId))
                .map((s) => s.id);
        } else {
            return NextResponse.json({ error: "Invalid action" }, { status: 400 });
        }

        // Delete the submissions
        if (idsToDelete.length > 0) {
            await db.delete(submissions).where(inArray(submissions.id, idsToDelete));
        }

        return NextResponse.json({
            success: true,
            deleted: idsToDelete.length,
        });
    } catch (error) {
        console.error("Error resolving duplicates:", error);
        return NextResponse.json(
            { error: "Failed to resolve duplicates" },
            { status: 500 }
        );
    }
}
