import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { cutoffs, exams } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { csvText, examId } = body;

        if (!csvText || !examId) {
            return NextResponse.json(
                { error: "Missing csvText or examId" },
                { status: 400 }
            );
        }

        // Verify exam exists
        const [exam] = await db
            .select({ id: exams.id })
            .from(exams)
            .where(eq(exams.id, parseInt(examId)));

        if (!exam) {
            return NextResponse.json({ error: "Exam not found" }, { status: 404 });
        }

        // Parse CSV
        const lines = csvText.trim().split("\n");
        if (lines.length < 2) {
            return NextResponse.json(
                { error: "CSV must have a header row and at least one data row" },
                { status: 400 }
            );
        }

        const headers = lines[0].split(",").map((h: string) => h.trim().toLowerCase());
        const requiredHeaders = ["category", "expected_cutoff"];
        const missing = requiredHeaders.filter(h => !headers.includes(h));
        if (missing.length > 0) {
            return NextResponse.json(
                { error: `Missing required CSV columns: ${missing.join(", ")}` },
                { status: 400 }
            );
        }

        const errors: { row: number; error: string }[] = [];
        const rows: any[] = [];

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const values = line.split(",").map((v: string) => v.trim());
            const row: Record<string, string> = {};
            headers.forEach((h: string, idx: number) => {
                row[h] = values[idx] || "";
            });

            // Validate required fields
            if (!row.category || !row.expected_cutoff) {
                errors.push({ row: i + 1, error: "Missing category or expected_cutoff" });
                continue;
            }

            const expectedCutoff = parseFloat(row.expected_cutoff);
            if (isNaN(expectedCutoff)) {
                errors.push({ row: i + 1, error: "Invalid expected_cutoff value" });
                continue;
            }

            rows.push({
                examId: parseInt(examId),
                category: row.category.toUpperCase(),
                postCode: row.post_code || "GEN",
                postName: row.post_name || "General Post",
                expectedCutoff,
                safeScore: row.safe_score ? parseFloat(row.safe_score) : null,
                minimumScore: row.minimum_score ? parseFloat(row.minimum_score) : null,
                previousYearCutoff: row.previous_year_cutoff ? parseFloat(row.previous_year_cutoff) : null,
                previousYearVacancy: row.previous_year_vacancy ? parseInt(row.previous_year_vacancy) : null,
                currentYearVacancy: row.current_year_vacancy ? parseInt(row.current_year_vacancy) : null,
                confidenceLevel: (row.confidence_level as "low" | "medium" | "high") || "low",
                isPublished: row.is_published === "true",
                priorityOrder: row.priority_order ? parseInt(row.priority_order) : 0,
            });
        }

        // Batch insert
        let inserted = 0;
        if (rows.length > 0) {
            const result = await db.insert(cutoffs).values(rows).returning({ id: cutoffs.id });
            inserted = result.length;
        }

        return NextResponse.json({
            success: true,
            imported: inserted,
            errors,
            totalRows: lines.length - 1,
        });
    } catch (error) {
        console.error("Error importing cutoffs:", error);
        return NextResponse.json(
            { error: "Failed to import cutoffs" },
            { status: 500 }
        );
    }
}
