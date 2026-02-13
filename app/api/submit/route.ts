import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { submissions, exams, shifts } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { parseSSC } from "@/lib/parser";
import { ExamResult } from "@/lib/parser/types";
import { checkRateLimit } from "@/lib/rate-limit";

import crypto from "crypto";

function hashString(str: string): string {
    return crypto.createHash("sha256").update(str).digest("hex");
}

export async function POST(request: NextRequest) {
    try {
        // ── 0. RATE LIMIT ───────────────────────────────────────────
        const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
            || request.headers.get("x-real-ip")
            || "unknown";

        const rateCheck = checkRateLimit(ip);
        if (!rateCheck.allowed) {
            return NextResponse.json(
                {
                    error: "Too many submissions. Please try again later.",
                    retryAfter: rateCheck.retryAfter,
                },
                {
                    status: 429,
                    headers: { "Retry-After": String(rateCheck.retryAfter) },
                }
            );
        }

        const body = await request.json();
        const { url, category, exam: examSlug } = body;

        // Validate inputs
        if (!url || !category) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        // ── 1. GET EXAM ─────────────────────────────────────────────
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

        // ── 2. FETCH HTML ───────────────────────────────────────────
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

        // ── 3. PARSE DATA ───────────────────────────────────────────
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

        const { metadata, sectionPerformance, scoreWithoutComputer } = parsedResult;

        // ── 4. FIND/CREATE SHIFT ────────────────────────────────────
        let shiftId = null;
        if (metadata["Exam Date"] && metadata["Exam Time"]) {
            const [day, month, year] = metadata["Exam Date"].split("/");
            const isoDate = `${year}-${month}-${day}`;

            const existingShift = await db.query.shifts.findFirst({
                where: and(
                    eq(shifts.examId, examData.id),
                    eq(shifts.date, new Date(isoDate).toISOString())
                )
            });

            if (existingShift) {
                shiftId = existingShift.id;
            } else {
                const [newShift] = await db.insert(shifts).values({
                    examId: examData.id,
                    date: new Date(isoDate).toISOString(),
                    shiftNumber: 1,
                    shiftCode: `${year}${month}${day}_${metadata["Exam Time"].substring(0, 2)}`,
                    timeSlot: metadata["Exam Time"],
                    candidateCount: 0
                }).returning();
                shiftId = newShift.id;

                await db.update(exams)
                    .set({ totalShifts: sql`${exams.totalShifts} + 1` })
                    .where(eq(exams.id, examData.id));
            }
        }

        if (!shiftId) {
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

        // ── 5. CHECK DUPLICATE ──────────────────────────────────────
        const rollNumber = metadata["Roll Number"] || `UNKNOWN-${nanoid(6)}`;
        const rollNumberHash = hashString(rollNumber);

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
                status: existing.processingStatus || "ready",
                message: "Submission already exists",
            });
        }

        // ── 6. INSERT SUBMISSION (fast-path: no normalization) ──────
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
            // normalizedScore: null — filled by batch job
            // overallRank: null — filled by batch job
            processingStatus: "pending",
            source: "url_parser",
            sourceUrl: url,
            urlHash: hashString(url),
            examCentre: metadata["Venue Name"],
            submitterIp: ip,
        }).returning();

        // ── 7. UPDATE COUNTERS (lightweight) ────────────────────────
        await db.update(exams)
            .set({
                totalSubmissions: sql`${exams.totalSubmissions} + 1`,
                lastSubmissionAt: new Date(),
            })
            .where(eq(exams.id, examData.id));

        await db.update(shifts)
            .set({ candidateCount: sql`${shifts.candidateCount} + 1` })
            .where(eq(shifts.id, shiftId));

        // ── 8. RETURN IMMEDIATELY ───────────────────────────────────
        // NO normalization, NO ranking — those happen in batch jobs.
        return NextResponse.json({
            success: true,
            submissionId: newSubmission.id,
            rawScore: scoreWithoutComputer,
            normalizedScore: null,
            rank: null,
            status: "pending",
            candidateName: metadata["Candidate Name"],
            message: "Submission received. Normalization and ranking will be processed in the next batch run.",
        });

    } catch (error: any) {
        console.error("Error processing submission:", error);

        // Handle Unique Constraint Violation (Postgres Code 23505)
        if (error?.code === "23505") {
            return NextResponse.json(
                {
                    success: true,
                    message: "Submission already exists (duplicate detected)",
                    submissionId: 0,
                    error: "This answer key has already been submitted."
                },
                { status: 409 }
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
