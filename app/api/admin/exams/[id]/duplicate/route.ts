
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { exams } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ id: string }> } // Correct type for Next.js 15+ dynamic params
) {
    const { id } = await context.params;
    const examId = parseInt(id);

    try {
        // Fetch original exam
        const [original] = await db.select().from(exams).where(eq(exams.id, examId));
        if (!original) {
            return NextResponse.json({ error: "Exam not found" }, { status: 404 });
        }

        // Create duplicate data
        const newName = `${original.name} (Copy)`;
        const newSlug = `${original.slug}-copy-${Date.now()}`; // Ensure uniqueness

        // Omit id, createdAt, updatedAt
        const { id: _, createdAt, updatedAt, ...rest } = original;

        const [duplicate] = await db
            .insert(exams)
            .values({
                ...rest,
                name: newName,
                slug: newSlug,
                isActive: false, // Default to inactive
                status: "upcoming" // Reset status
            })
            .returning();

        return NextResponse.json({ success: true, exam: duplicate });
    } catch (error) {
        console.error("Duplicate exam error:", error);
        return NextResponse.json({ error: "Failed to duplicate exam" }, { status: 500 });
    }
}
