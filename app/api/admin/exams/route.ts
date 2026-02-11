import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { exams } from "@/lib/db/schema";
import { eq, desc, sql, like, and, or } from "drizzle-orm";

// GET - List all exams with filters
// GET - List all exams with filters, sorting, and pagination
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const search = searchParams.get("search");
        const status = searchParams.get("status");
        const agency = searchParams.get("agency");
        const year = searchParams.get("year");
        const isActive = searchParams.get("isActive"); // 'true', 'false', or undefined

        // Pagination & Sorting
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "10");
        const offset = (page - 1) * limit;
        const sort = searchParams.get("sort") || "createdAt";
        const order = searchParams.get("order") || "desc";

        let query = db.select().from(exams);

        // Build where conditions
        const conditions = [];

        if (search) {
            conditions.push(
                or(
                    like(exams.name, `%${search}%`),
                    like(exams.slug, `%${search}%`)
                )
            );
        }

        if (status && status !== "all") {
            conditions.push(eq(exams.status, status as any));
        }

        if (agency && agency !== "all") {
            conditions.push(eq(exams.agency, agency as any));
        }

        if (year && year !== "all") {
            conditions.push(eq(exams.year, parseInt(year)));
        }

        if (isActive && isActive !== "all") {
            conditions.push(eq(exams.isActive, isActive === "true"));
        }

        // Determine sort field
        let orderBy;
        switch (sort) {
            case "name": orderBy = exams.name; break;
            case "year": orderBy = exams.year; break;
            case "totalSubmissions": orderBy = exams.totalSubmissions; break; // Ensure this column exists or uses separate logic if computed
            case "updatedAt": orderBy = exams.updatedAt; break;
            default: orderBy = exams.createdAt;
        }

        const examsList = await db
            .select()
            .from(exams)
            .where(conditions.length ? and(...conditions) : undefined)
            .orderBy(order === "asc" ? orderBy : desc(orderBy))
            .limit(limit)
            .offset(offset);

        // Get total count for pagination
        const [countResult] = await db
            .select({ count: sql<number>`count(*)` })
            .from(exams)
            .where(conditions.length ? and(...conditions) : undefined);

        return NextResponse.json({
            exams: examsList,
            pagination: {
                total: Number(countResult.count),
                page,
                limit,
                totalPages: Math.ceil(Number(countResult.count) / limit)
            }
        });
    } catch (error) {
        console.error("Error fetching exams:", error);
        return NextResponse.json({ error: "Failed to fetch exams" }, { status: 500 });
    }
}

// POST - Create new exam
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validate required fields
        if (!body.name || !body.agency || !body.year) {
            return NextResponse.json(
                { error: "Missing required fields: name, agency, year" },
                { status: 400 }
            );
        }

        // Generate slug if not provided
        const slug = body.slug || body.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

        // Check for duplicate slug
        const [existing] = await db.select().from(exams).where(eq(exams.slug, slug)).limit(1);
        if (existing) {
            return NextResponse.json({ error: "Exam with this slug already exists" }, { status: 409 });
        }

        const [newExam] = await db.insert(exams).values({
            name: body.name,
            slug,
            agency: body.agency,
            year: body.year,
            tier: body.tier || null,
            totalMarks: body.totalMarks || 200,
            totalQuestions: body.totalQuestions || 100,
            duration: body.duration || 60,
            defaultPositive: body.defaultPositive || 2,
            defaultNegative: body.defaultNegative || 0.5,
            sectionConfig: body.sectionConfig || {},
            hasSectionalTiming: body.hasSectionalTiming || false,
            hasNormalization: body.hasNormalization ?? true,
            allowMultipleSubmissions: body.allowMultipleSubmissions || false,
            isActive: body.isActive ?? true,
            status: body.status || "upcoming",
            analysisPhase: body.analysisPhase || "collecting",
            isFeatured: body.isFeatured || false,
            priorityOrder: body.priorityOrder || 0,
            metaDescription: body.metaDescription || null,
            examStartDate: body.examStartDate ? new Date(body.examStartDate) : null,
            examEndDate: body.examEndDate ? new Date(body.examEndDate) : null,
            answerKeyReleaseDate: body.answerKeyReleaseDate ? new Date(body.answerKeyReleaseDate) : null,
            answerKeyUrl: body.answerKeyUrl || null,
            officialWebsite: body.officialWebsite || null,
        }).returning();

        return NextResponse.json({ exam: newExam, success: true }, { status: 201 });
    } catch (error) {
        console.error("Error creating exam:", error);
        return NextResponse.json({ error: "Failed to create exam" }, { status: 500 });
    }
}
