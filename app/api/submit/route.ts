import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { submissions, exams, shifts } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { parseSSC } from "@/lib/parser";
import { ExamResult } from "@/lib/parser/types";

import crypto from "crypto";

function hashString(str: string): string {
    return crypto.createHash("sha256").update(str).digest("hex");
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { url, category, exam: examSlug } = body;

        // Validate inputs
        if (!url || !category) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        // Get the exam by slug
        const [examData] = await db
            .select()
            .from(exams)
            .where(eq(exams.slug, examSlug))
            .limit(1);

        if (!examData) {
            return NextResponse.json(
                { error: "Exam not found" },
                { status: 404 }
            );
        }

        // 1. FETCH HTML
        let html = "";
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error("Failed to fetch URL");
            html = await response.text();
        } catch (fetchError) {
            console.error("Fetch error:", fetchError);
            return NextResponse.json(
                { error: "Failed to fetch answer key URL. Please check the link." },
                { status: 400 }
            );
        }

        // 2. PARSE DATA
        // 2. PARSE DATA
        let parsedResult: ExamResult;
        try {
            parsedResult = parseSSC(html, (examData.tier as any) || "tier2");
        } catch (parseError) {
            console.error("Parse error:", parseError);
            if (parseError instanceof Error) {
                console.error(parseError.stack);
            }
            return NextResponse.json(
                {
                    error: "Failed to parse answer key. Ensure it's a valid SSC format or check if the exam tier is supported.",
                    details: parseError instanceof Error ? parseError.message : "Unknown parser error"
                },
                { status: 400 }
            );
        }

        const { metadata, sectionPerformance, scoreWithoutComputer, scoreWithComputer } = parsedResult;

        // 3. FIND/CREATE SHIFT
        // Format date/time from metadata to match DB expected format
        // Metadata example: "Exam Date": "26/10/2023", "Exam Time": "9:00 AM - 11:00 AM"

        let shiftId = null;
        if (metadata["Exam Date"] && metadata["Exam Time"]) {
            // Convert DD/MM/YYYY to YYYY-MM-DD
            const [day, month, year] = metadata["Exam Date"].split("/");
            const isoDate = `${year}-${month}-${day}`; // ISO String for DB comparison if needed, or keeping logic simple

            // Try to find existing shift
            // We use a simplified check here. In a real app, strict date parsing is needed.
            // For now, we will try to match based on date string or create new.

            // Note: simple string matching for 'date' column which is text in our schema
            const existingShift = await db.query.shifts.findFirst({
                where: and(
                    eq(shifts.examId, examData.id),
                    eq(shifts.date, new Date(isoDate).toISOString())
                    // We stored date as ISO string in Phase 5 fix. 
                    // Let's ensure consistency.
                )
            });

            if (existingShift) {
                shiftId = existingShift.id;
            } else {
                // Create new shift if not found (Auto-discovery)
                const [newShift] = await db.insert(shifts).values({
                    examId: examData.id,
                    date: new Date(isoDate).toISOString(),
                    shiftNumber: 1, // Defaulting to 1 as we can't easily infer without more logic/inputs
                    shiftCode: `${year}${month}${day}_${metadata["Exam Time"].substring(0, 2)}`,
                    timeSlot: metadata["Exam Time"],
                    candidateCount: 0
                }).returning();
                shiftId = newShift.id;
            }
        }

        if (!shiftId) {
            // Fallback to a random shift if parsing failed (should not happen with valid key)
            const [fallbackShift] = await db
                .select()
                .from(shifts)
                .where(eq(shifts.examId, examData.id))
                .limit(1);

            if (fallbackShift) shiftId = fallbackShift.id;
            else {
                return NextResponse.json({ error: "No shifts configured for this exam" }, { status: 500 });
            }
        }


        // 4. CHECK DUPLICATE
        // We use Roll Number + Exam ID as unique constraint
        const rollNumber = metadata["Roll Number"] || `UNKNOWN-${nanoid(6)}`;
        const rollNumberHash = hashString(rollNumber); // Simple hash for privacy if needed, though we store actual roll too

        const [existing] = await db
            .select()
            .from(submissions)
            .where(
                and(
                    eq(submissions.rollNumber, rollNumber),
                    eq(submissions.examId, examData.id)
                )
            )
            .limit(1);

        if (existing) {
            return NextResponse.json({
                success: true,
                submissionId: existing.id,
                rawScore: existing.rawScore,
                normalizedScore: existing.normalizedScore,
                message: "Submission already exists",
            });
        }

        // 5. NORMALIZATION LOGIC (Simplified)
        // In reality, this requires the shift's stats.
        const [shiftStats] = await db.select().from(shifts).where(eq(shifts.id, shiftId));
        const normalizationFactor = shiftStats?.normalizationFactor || 1.0;
        const normalizedScore = scoreWithoutComputer * normalizationFactor;

        // 6. SAVE SUBMISSION
        // Map parser section result to DB schema
        const dbSectionPerformance: Record<string, any> = {};
        Object.entries(sectionPerformance).forEach(([name, data]) => {
            dbSectionPerformance[name] = {
                marks: data.score,
                correct: data.correct,
                wrong: data.wrong,
                unattempted: data.unattempted,
                accuracy: data.totalQuestions > 0 ? (data.correct / data.totalQuestions) * 100 : 0
            };
        });

        const totalCorrect = Object.values(sectionPerformance).reduce((acc, sec) => acc + sec.correct, 0);
        const totalWrong = Object.values(sectionPerformance).reduce((acc, sec) => acc + sec.wrong, 0);
        const totalAttempted = Object.values(sectionPerformance).reduce((acc, sec) => acc + sec.correct + sec.wrong, 0);
        const accuracy = totalAttempted > 0 ? (totalCorrect / totalAttempted) * 100 : 0;

        const [newSubmission] = await db.insert(submissions).values({
            examId: examData.id,
            shiftId: shiftId,
            rollNumber,
            rollNumberHash,
            name: metadata["Candidate Name"] || "Candidate",
            category: category as any,
            gender: "M",
            sectionPerformance: dbSectionPerformance,
            responses: [],
            totalAttempted,
            totalCorrect,
            totalWrong,
            accuracy,
            rawScore: scoreWithoutComputer,
            normalizedScore,
            source: "url_parser",
            sourceUrl: url,
            urlHash: hashString(url),
            examCentre: metadata["Venue Name"],
        }).returning();

        // 7. CALCULATE RANK
        const [rankResult] = await db
            .select({
                rank: sql<number>`count(*) + 1`,
            })
            .from(submissions)
            .where(
                and(
                    eq(submissions.examId, examData.id),
                    sql`${submissions.normalizedScore} > ${normalizedScore}`
                )
            );

        await db.update(submissions)
            .set({ overallRank: rankResult?.rank || 1 })
            .where(eq(submissions.id, newSubmission.id));

        // Update stats
        await db.update(exams)
            .set({
                totalSubmissions: sql`${exams.totalSubmissions} + 1`,
                lastSubmissionAt: new Date(),
            })
            .where(eq(exams.id, examData.id));

        await db.update(shifts)
            .set({ candidateCount: sql`${shifts.candidateCount} + 1` })
            .where(eq(shifts.id, shiftId));

        return NextResponse.json({
            success: true,
            submissionId: newSubmission.id,
            rawScore: scoreWithoutComputer,
            normalizedScore,
            rank: rankResult?.rank || 1,
            candidateName: metadata["Candidate Name"]
        });

    } catch (error: any) {
        console.error("Error processing submission:", error);

        // Handle Unique Constraint Violation (Postgres Code 23505)
        if (error?.code === "23505") {
            return NextResponse.json(
                {
                    success: true,
                    message: "Submission already exists (duplicate detected)",
                    submissionId: 0, // Client should redirect or handle gracefully
                    // Ideally we fetch the existing ID here, but for now just prevent 500
                    error: "This answer key has already been submitted."
                },
                { status: 409 } // Conflict
            );
        }

        return NextResponse.json(
            {
                error: (error instanceof Error ? error.message : "Failed to process submission"),
                success: false,
            },
            { status: 500 }
        );
    }
}
