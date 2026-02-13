import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { shifts, exams } from "@/lib/db/schema";
import { eq, desc, sql, and, inArray } from "drizzle-orm";

// GET - List shifts with full analytics
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const examId = searchParams.get("examId");
        const dateFrom = searchParams.get("dateFrom");
        const dateTo = searchParams.get("dateTo");
        const difficulty = searchParams.get("difficulty");

        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "50");
        const offset = (page - 1) * limit;
        const sort = searchParams.get("sort") || "date";
        const order = searchParams.get("order") || "asc";

        const conditions = [];
        if (examId && examId !== "all") conditions.push(eq(shifts.examId, parseInt(examId)));
        if (dateFrom) conditions.push(sql`${shifts.date} >= ${dateFrom}`);
        if (dateTo) conditions.push(sql`${shifts.date} <= ${dateTo}`);
        if (difficulty && difficulty !== "all") conditions.push(eq(shifts.difficultyLabel, difficulty));

        // Sort field
        let orderBy;
        switch (sort) {
            case "shiftCode": orderBy = shifts.shiftCode; break;
            case "candidateCount": orderBy = shifts.candidateCount; break;
            case "avgRawScore": orderBy = shifts.avgRawScore; break;
            case "difficultyIndex": orderBy = shifts.difficultyIndex; break;
            case "shiftNumber": orderBy = shifts.shiftNumber; break;
            default: orderBy = shifts.date;
        }

        // Full select with all stats
        const shiftsList = await db
            .select({
                id: shifts.id,
                examId: shifts.examId,
                date: shifts.date,
                shiftNumber: shifts.shiftNumber,
                shiftCode: shifts.shiftCode,
                timeSlot: shifts.timeSlot,
                startTime: shifts.startTime,
                endTime: shifts.endTime,
                candidateCount: shifts.candidateCount,
                avgRawScore: shifts.avgRawScore,
                medianRawScore: shifts.medianRawScore,
                stdDev: shifts.stdDev,
                maxRawScore: shifts.maxRawScore,
                minRawScore: shifts.minRawScore,
                percentileCutoffs: shifts.percentileCutoffs,
                sectionStats: shifts.sectionStats,
                difficultyIndex: shifts.difficultyIndex,
                difficultyLabel: shifts.difficultyLabel,
                normalizationFactor: shifts.normalizationFactor,
                statsUpdatedAt: shifts.statsUpdatedAt,
                createdAt: shifts.createdAt,
            })
            .from(shifts)
            .where(conditions.length ? and(...conditions) : undefined)
            .orderBy(order === "asc" ? orderBy : desc(orderBy))
            .limit(limit)
            .offset(offset);

        // Count
        const [countResult] = await db
            .select({ count: sql<number>`count(*)` })
            .from(shifts)
            .where(conditions.length ? and(...conditions) : undefined);

        // Exam names
        const examIds = [...new Set(shiftsList.map(s => s.examId))];
        const examNames: Record<number, string> = {};
        const examMarks: Record<number, number> = {};
        if (examIds.length > 0) {
            const examData = await db.select({ id: exams.id, name: exams.name, totalMarks: exams.totalMarks }).from(exams).where(inArray(exams.id, examIds));
            examData.forEach((e) => {
                examNames[e.id] = e.name;
                examMarks[e.id] = e.totalMarks;
            });
        }

        // Aggregate summary when filtering by exam
        let summary = null;
        if (examId && examId !== "all") {
            const eid = parseInt(examId);
            const [agg] = await db
                .select({
                    totalShifts: sql<number>`count(*)`,
                    totalCandidates: sql<number>`coalesce(sum(candidate_count), 0)`,
                    examAvgScore: sql<number>`avg(avg_raw_score)`,
                    examMinScore: sql<number>`min(min_raw_score)`,
                    examMaxScore: sql<number>`max(max_raw_score)`,
                    avgStdDev: sql<number>`avg(std_dev)`,
                    minNormFactor: sql<number>`min(normalization_factor)`,
                    maxNormFactor: sql<number>`max(normalization_factor)`,
                    easyCount: sql<number>`count(*) filter (where difficulty_label in ('Easy', 'easy'))`,
                    moderateCount: sql<number>`count(*) filter (where difficulty_label in ('Moderate', 'moderate'))`,
                    hardCount: sql<number>`count(*) filter (where difficulty_label in ('Difficult', 'hard', 'Hard'))`,
                })
                .from(shifts)
                .where(eq(shifts.examId, eid));

            summary = {
                totalShifts: Number(agg.totalShifts),
                totalCandidates: Number(agg.totalCandidates),
                examAvgScore: agg.examAvgScore ? Number(agg.examAvgScore) : null,
                scoreRange: { min: agg.examMinScore ? Number(agg.examMinScore) : null, max: agg.examMaxScore ? Number(agg.examMaxScore) : null },
                avgStdDev: agg.avgStdDev ? Number(agg.avgStdDev) : null,
                normFactorRange: { min: agg.minNormFactor ? Number(agg.minNormFactor) : null, max: agg.maxNormFactor ? Number(agg.maxNormFactor) : null },
                difficultyDistribution: {
                    easy: Number(agg.easyCount),
                    moderate: Number(agg.moderateCount),
                    hard: Number(agg.hardCount),
                },
                totalMarks: examMarks[eid] || null,
            };
        }

        return NextResponse.json({
            shifts: shiftsList.map((s) => ({
                ...s,
                examName: examNames[s.examId] || "Unknown",
                totalMarks: examMarks[s.examId] || null,
            })),
            summary,
            pagination: {
                total: Number(countResult.count),
                page,
                limit,
                totalPages: Math.ceil(Number(countResult.count) / limit)
            }
        });
    } catch (error) {
        console.error("Error fetching shifts:", error);
        return NextResponse.json({ error: "Failed to fetch shifts" }, { status: 500 });
    }
}

// POST - Create new shift
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        if (!body.examId || !body.date || !body.shiftNumber) {
            return NextResponse.json(
                { error: "Missing required fields: examId, date, shiftNumber" },
                { status: 400 }
            );
        }

        const shiftCode = body.shiftCode || `${body.date.replace(/-/g, "")}_S${body.shiftNumber}`;

        const [newShift] = await db.insert(shifts).values({
            examId: body.examId,
            date: new Date(body.date).toISOString(),
            shiftNumber: body.shiftNumber,
            shiftCode,
            timeSlot: body.timeSlot || "morning",
            startTime: body.startTime,
            endTime: body.endTime,
            difficultyIndex: body.difficultyIndex || 0.5,
            difficultyLabel: body.difficultyLabel || "Moderate",
            normalizationFactor: body.normalizationFactor || 1.0,
        }).returning();

        await db.update(exams).set({
            totalShifts: sql`${exams.totalShifts} + 1`,
        }).where(eq(exams.id, body.examId));

        return NextResponse.json({ shift: newShift, success: true }, { status: 201 });
    } catch (error) {
        console.error("Error creating shift:", error);
        return NextResponse.json({ error: "Failed to create shift" }, { status: 500 });
    }
}
