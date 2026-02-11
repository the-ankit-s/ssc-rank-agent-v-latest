import { NextResponse, NextRequest } from "next/server";
import { db } from "@/lib/db/client";
import { cutoffs, exams } from "@/lib/db/schema";
import { eq, desc, asc, and, ilike, sql, count } from "drizzle-orm";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const examId = searchParams.get("examId");
        const category = searchParams.get("category");
        const confidence = searchParams.get("confidence");
        const search = searchParams.get("search");
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "20");
        const sort = searchParams.get("sort") || "createdAt";
        const order = searchParams.get("order") || "desc";
        const offset = (page - 1) * limit;

        // Build conditions
        const conditions = [];
        if (examId && examId !== "all") conditions.push(eq(cutoffs.examId, parseInt(examId)));
        if (category && category !== "all") conditions.push(eq(cutoffs.category, category));
        if (confidence && confidence !== "all") conditions.push(eq(cutoffs.confidenceLevel, confidence as any));
        if (search) conditions.push(ilike(cutoffs.postName, `%${search}%`));

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        // Sort mapping
        const sortMap: Record<string, any> = {
            expectedCutoff: cutoffs.expectedCutoff,
            safeScore: cutoffs.safeScore,
            minimumScore: cutoffs.minimumScore,
            createdAt: cutoffs.createdAt,
            category: cutoffs.category,
        };
        const sortCol = sortMap[sort] || cutoffs.createdAt;
        const orderFn = order === "asc" ? asc(sortCol) : desc(sortCol);

        // Count
        const [{ total }] = await db
            .select({ total: count() })
            .from(cutoffs)
            .where(whereClause);

        // Data
        const result = await db
            .select({
                id: cutoffs.id,
                examId: cutoffs.examId,
                examName: exams.name,
                examYear: exams.year,
                category: cutoffs.category,
                postCode: cutoffs.postCode,
                postName: cutoffs.postName,
                expectedCutoff: cutoffs.expectedCutoff,
                safeScore: cutoffs.safeScore,
                minimumScore: cutoffs.minimumScore,
                previousYearCutoff: cutoffs.previousYearCutoff,
                previousYearVacancy: cutoffs.previousYearVacancy,
                currentYearVacancy: cutoffs.currentYearVacancy,
                confidenceLevel: cutoffs.confidenceLevel,
                isPublished: cutoffs.isPublished,
                predictionBasis: cutoffs.predictionBasis,
                updatedAt: cutoffs.updatedAt,
            })
            .from(cutoffs)
            .leftJoin(exams, eq(cutoffs.examId, exams.id))
            .where(whereClause)
            .orderBy(orderFn)
            .limit(limit)
            .offset(offset);

        return NextResponse.json({
            cutoffs: result,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("Error fetching cutoffs:", error);
        return NextResponse.json({ error: "Failed to fetch cutoffs" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();

        if (!body.examId || !body.category || !body.expectedCutoff) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const newCutoff = await db
            .insert(cutoffs)
            .values({
                examId: body.examId,
                category: body.category,
                postCode: body.postCode || "GEN",
                postName: body.postName || "General Post",
                expectedCutoff: body.expectedCutoff,
                safeScore: body.safeScore,
                minimumScore: body.minimumScore,
                previousYearCutoff: body.previousYearCutoff,
                previousYearVacancy: body.previousYearVacancy,
                currentYearVacancy: body.currentYearVacancy,
                confidenceLevel: body.confidenceLevel || "low",
                predictionBasis: body.predictionBasis,
                isPublished: body.isPublished ?? false,
            })
            .returning();

        return NextResponse.json({ cutoff: newCutoff[0] });
    } catch (error) {
        console.error("Error creating cutoff:", error);
        return NextResponse.json({ error: "Failed to create cutoff" }, { status: 500 });
    }
}
