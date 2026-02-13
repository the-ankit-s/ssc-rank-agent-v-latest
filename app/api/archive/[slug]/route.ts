import { NextRequest, NextResponse } from "next/server";
import { queryArchive, getArchiveInfo } from "@/lib/archive/sqlite-archive";

// GET — Public/paid read-only query endpoint for archived exam data
// Usage:
//   /api/archive/ssc-cgl-2023-tier-i?type=summary          → Free exam overview
//   /api/archive/ssc-cgl-2023-tier-i?type=shifts            → All shifts with stats
//   /api/archive/ssc-cgl-2023-tier-i?type=submissions&page=1&limit=50  → Paginated submissions
//   /api/archive/ssc-cgl-2023-tier-i?type=cutoffs           → All cutoff predictions
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
    try {
        const { slug } = await params;
        const { searchParams } = new URL(request.url);

        const type = (searchParams.get("type") || "summary") as "submissions" | "shifts" | "cutoffs" | "summary";
        if (!["submissions", "shifts", "cutoffs", "summary"].includes(type)) {
            return NextResponse.json({ error: "Invalid type. Use: summary, shifts, submissions, cutoffs" }, { status: 400 });
        }

        // Check archive exists
        const info = getArchiveInfo(slug);
        if (!info?.exists) {
            return NextResponse.json({ error: "Archive not found" }, { status: 404 });
        }

        // TODO: Add authentication/paywall check here for monetization
        // e.g., check API key, subscription status, rate limiting

        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "50");
        const category = searchParams.get("category") || undefined;
        const shiftId = searchParams.get("shiftId") ? parseInt(searchParams.get("shiftId")!) : undefined;
        const sortBy = searchParams.get("sortBy") || undefined;
        const sortOrder = (searchParams.get("sortOrder") || "desc") as "asc" | "desc";

        const result = queryArchive(slug, { type, page, limit, category, shiftId, sortBy, sortOrder });

        if (!result) {
            return NextResponse.json({ error: "Failed to query archive" }, { status: 500 });
        }

        return NextResponse.json({
            slug,
            type,
            ...result,
            totalPages: Math.ceil(result.total / result.limit),
        });
    } catch (error: any) {
        console.error("Archive query error:", error);
        return NextResponse.json({ error: "Failed to query archive" }, { status: 500 });
    }
}
