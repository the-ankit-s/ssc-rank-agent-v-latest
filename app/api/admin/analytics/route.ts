import { NextResponse, NextRequest } from "next/server";
import { db } from "@/lib/db/client";
import { submissions, exams } from "@/lib/db/schema";
import { eq, sql, count, avg, min, max, gte, lte, and, desc } from "drizzle-orm";

function getDateRange(range: string, from?: string, to?: string): { start: Date | null; end: Date | null } {
    const now = new Date();
    let start: Date;
    let end = new Date(now);

    switch (range) {
        case "all":
            return { start: null, end: null };
        case "today":
            start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
        case "yesterday":
            start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
            end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
        case "7d":
            start = new Date(now.getTime() - 7 * 86400000);
            break;
        case "30d":
            start = new Date(now.getTime() - 30 * 86400000);
            break;
        case "90d":
            start = new Date(now.getTime() - 90 * 86400000);
            break;
        case "this_month":
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
        case "last_month":
            start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            end = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
        case "custom":
            start = from ? new Date(from) : new Date(now.getTime() - 30 * 86400000);
            end = to ? new Date(to) : now;
            break;
        default:
            start = new Date(now.getTime() - 30 * 86400000);
    }
    return { start, end };
}

function getPreviousPeriod(start: Date, end: Date) {
    const duration = end.getTime() - start.getTime();
    return {
        start: new Date(start.getTime() - duration),
        end: new Date(start.getTime()),
    };
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const tab = searchParams.get("tab") || "overview";
        const range = searchParams.get("range") || "all";
        const from = searchParams.get("from") || undefined;
        const to = searchParams.get("to") || undefined;

        const { start, end } = getDateRange(range, from, to);

        // When "all" is selected, no date filtering is applied
        const dateFilter = start && end
            ? and(gte(submissions.createdAt, start), lte(submissions.createdAt, end))
            : undefined;

        // Previous period only available when a specific date range is chosen
        const prev = start && end ? getPreviousPeriod(start, end) : null;
        const prevDateFilter = prev
            ? and(gte(submissions.createdAt, prev.start), lte(submissions.createdAt, prev.end))
            : sql`1 = 0`; // Return nothing if no previous period (All Time)

        // ──────────────────────────────────────────────
        // OVERVIEW TAB — top-level KPIs with deltas
        // ──────────────────────────────────────────────
        if (tab === "overview") {
            const [current] = await db
                .select({
                    total: count(),
                    avgScore: avg(submissions.rawScore),
                    maxScore: max(submissions.rawScore),
                    minScore: min(submissions.rawScore),
                    avgAccuracy: avg(submissions.accuracy),
                })
                .from(submissions)
                .where(dateFilter);

            const [previous] = await db
                .select({
                    total: count(),
                    avgScore: avg(submissions.rawScore),
                    avgAccuracy: avg(submissions.accuracy),
                })
                .from(submissions)
                .where(prevDateFilter);

            const [examCount] = await db
                .select({ count: sql<number>`COUNT(DISTINCT ${submissions.examId})` })
                .from(submissions)
                .where(dateFilter);

            const [prevExamCount] = await db
                .select({ count: sql<number>`COUNT(DISTINCT ${submissions.examId})` })
                .from(submissions)
                .where(prevDateFilter);

            const [stateCount] = await db
                .select({ count: sql<number>`COUNT(DISTINCT ${submissions.state})` })
                .from(submissions)
                .where(and(dateFilter, sql`${submissions.state} IS NOT NULL AND ${submissions.state} != ''`));

            // Daily trend for sparkline
            const dailyTrend = await db
                .select({
                    date: sql<string>`TO_CHAR(${submissions.createdAt}, 'YYYY-MM-DD')`,
                    count: count(),
                })
                .from(submissions)
                .where(dateFilter)
                .groupBy(sql`TO_CHAR(${submissions.createdAt}, 'YYYY-MM-DD')`)
                .orderBy(sql`TO_CHAR(${submissions.createdAt}, 'YYYY-MM-DD')`);

            // Top 5 exams quick
            const topExams = await db
                .select({ examName: exams.name, count: count() })
                .from(submissions)
                .innerJoin(exams, eq(submissions.examId, exams.id))
                .where(dateFilter)
                .groupBy(exams.name)
                .orderBy(desc(count()))
                .limit(5);

            // Category split
            const categorySplit = await db
                .select({ category: submissions.category, count: count() })
                .from(submissions)
                .where(dateFilter)
                .groupBy(submissions.category);

            const delta = (cur: number, prev: number) =>
                prev === 0 ? (cur > 0 ? 100 : 0) : Number((((cur - prev) / prev) * 100).toFixed(1));

            return NextResponse.json({
                tab: "overview",
                kpis: {
                    submissions: {
                        value: current.total,
                        prev: previous.total,
                        delta: delta(current.total, previous.total),
                    },
                    avgScore: {
                        value: current.avgScore ? Number(Number(current.avgScore).toFixed(1)) : 0,
                        prev: previous.avgScore ? Number(Number(previous.avgScore).toFixed(1)) : 0,
                        delta: delta(
                            current.avgScore ? Number(current.avgScore) : 0,
                            previous.avgScore ? Number(previous.avgScore) : 0
                        ),
                    },
                    maxScore: {
                        value: current.maxScore ? Number(current.maxScore) : 0,
                    },
                    avgAccuracy: {
                        value: current.avgAccuracy ? Number(Number(current.avgAccuracy).toFixed(1)) : 0,
                        prev: previous.avgAccuracy ? Number(Number(previous.avgAccuracy).toFixed(1)) : 0,
                        delta: delta(
                            current.avgAccuracy ? Number(current.avgAccuracy) : 0,
                            previous.avgAccuracy ? Number(previous.avgAccuracy) : 0
                        ),
                    },
                    activeExams: {
                        value: Number(examCount.count),
                        prev: Number(prevExamCount.count),
                        delta: delta(Number(examCount.count), Number(prevExamCount.count)),
                    },
                    uniqueStates: { value: Number(stateCount.count) },
                },
                dailyTrend,
                topExams,
                categorySplit,
            });
        }

        // ──────────────────────────────────────────────
        // SUBMISSIONS TAB
        // ──────────────────────────────────────────────
        if (tab === "submissions") {
            const dailyTrend = await db
                .select({
                    date: sql<string>`TO_CHAR(${submissions.createdAt}, 'YYYY-MM-DD')`,
                    count: count(),
                })
                .from(submissions)
                .where(dateFilter)
                .groupBy(sql`TO_CHAR(${submissions.createdAt}, 'YYYY-MM-DD')`)
                .orderBy(sql`TO_CHAR(${submissions.createdAt}, 'YYYY-MM-DD')`);

            // Previous period daily for comparison overlay
            const prevDailyTrend = await db
                .select({
                    date: sql<string>`TO_CHAR(${submissions.createdAt}, 'YYYY-MM-DD')`,
                    count: count(),
                })
                .from(submissions)
                .where(prevDateFilter)
                .groupBy(sql`TO_CHAR(${submissions.createdAt}, 'YYYY-MM-DD')`)
                .orderBy(sql`TO_CHAR(${submissions.createdAt}, 'YYYY-MM-DD')`);

            const hourly = await db
                .select({
                    hour: sql<number>`EXTRACT(HOUR FROM ${submissions.createdAt})`,
                    count: count(),
                })
                .from(submissions)
                .where(dateFilter)
                .groupBy(sql`EXTRACT(HOUR FROM ${submissions.createdAt})`)
                .orderBy(sql`EXTRACT(HOUR FROM ${submissions.createdAt})`);

            const dayOfWeek = await db
                .select({
                    day: sql<number>`EXTRACT(DOW FROM ${submissions.createdAt})`,
                    count: count(),
                })
                .from(submissions)
                .where(dateFilter)
                .groupBy(sql`EXTRACT(DOW FROM ${submissions.createdAt})`)
                .orderBy(sql`EXTRACT(DOW FROM ${submissions.createdAt})`);

            const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

            const [summary] = await db.select({ total: count() }).from(submissions).where(dateFilter);
            const [prevSummary] = await db.select({ total: count() }).from(submissions).where(prevDateFilter);

            // Cumulative trend
            let cumulative = 0;
            const cumulativeTrend = dailyTrend.map(d => {
                cumulative += d.count;
                return { date: d.date, cumulative };
            });

            // Fill all 24 hours
            const fullHourly = Array.from({ length: 24 }, (_, i) => {
                const found = hourly.find(h => h.hour === i);
                return { hour: `${String(i).padStart(2, "0")}:00`, count: found?.count || 0 };
            });

            return NextResponse.json({
                tab: "submissions",
                summary: {
                    total: summary.total,
                    prevTotal: prevSummary.total,
                    delta: prevSummary.total === 0 ? (summary.total > 0 ? 100 : 0) : Number((((summary.total - prevSummary.total) / prevSummary.total) * 100).toFixed(1)),
                    avgPerDay: dailyTrend.length > 0 ? Number((summary.total / dailyTrend.length).toFixed(0)) : 0,
                    peakDay: dailyTrend.length > 0 ? dailyTrend.reduce((a, b) => a.count > b.count ? a : b) : null,
                },
                dailyTrend,
                prevDailyTrend,
                cumulativeTrend,
                hourly: fullHourly,
                dayOfWeek: dayOfWeek.map(d => ({ day: dayNames[d.day] || `Day ${d.day}`, count: d.count })),
            });
        }

        // ──────────────────────────────────────────────
        // EXAMS TAB
        // ──────────────────────────────────────────────
        if (tab === "exams") {
            const perExam = await db
                .select({
                    examId: submissions.examId,
                    examName: exams.name,
                    agency: exams.agency,
                    count: count(),
                    avgScore: avg(submissions.rawScore),
                })
                .from(submissions)
                .innerJoin(exams, eq(submissions.examId, exams.id))
                .where(dateFilter)
                .groupBy(submissions.examId, exams.name, exams.agency)
                .orderBy(desc(count()))
                .limit(100);

            const agencyDist = await db
                .select({ agency: exams.agency, count: count() })
                .from(submissions)
                .innerJoin(exams, eq(submissions.examId, exams.id))
                .where(dateFilter)
                .groupBy(exams.agency);

            const topExamIds = perExam.slice(0, 5).map(e => e.examId);
            let popularityOverTime: any[] = [];
            if (topExamIds.length > 0) {
                popularityOverTime = await db
                    .select({
                        date: sql<string>`TO_CHAR(${submissions.createdAt}, 'YYYY-MM-DD')`,
                        examName: exams.name,
                        count: count(),
                    })
                    .from(submissions)
                    .innerJoin(exams, eq(submissions.examId, exams.id))
                    .where(and(
                        dateFilter,
                        sql`${submissions.examId} IN (${sql.join(topExamIds.map(id => sql`${id}`), sql`, `)})`
                    ))
                    .groupBy(sql`TO_CHAR(${submissions.createdAt}, 'YYYY-MM-DD')`, exams.name)
                    .orderBy(sql`TO_CHAR(${submissions.createdAt}, 'YYYY-MM-DD')`);
            }

            return NextResponse.json({
                tab: "exams",
                perExam: perExam.map(e => ({
                    ...e,
                    avgScore: e.avgScore ? Number(Number(e.avgScore).toFixed(1)) : 0,
                })),
                agencyDist,
                popularityOverTime,
            });
        }

        // ──────────────────────────────────────────────
        // SCORES TAB
        // ──────────────────────────────────────────────
        if (tab === "scores") {
            const bucketExpr = sql`
                CASE
                    WHEN ${submissions.rawScore} < 0 THEN 'Below 0'
                    WHEN ${submissions.rawScore} < 20 THEN '0-20'
                    WHEN ${submissions.rawScore} < 40 THEN '20-40'
                    WHEN ${submissions.rawScore} < 60 THEN '40-60'
                    WHEN ${submissions.rawScore} < 80 THEN '60-80'
                    WHEN ${submissions.rawScore} < 100 THEN '80-100'
                    WHEN ${submissions.rawScore} < 120 THEN '100-120'
                    WHEN ${submissions.rawScore} < 140 THEN '120-140'
                    WHEN ${submissions.rawScore} < 160 THEN '140-160'
                    WHEN ${submissions.rawScore} < 180 THEN '160-180'
                    WHEN ${submissions.rawScore} < 200 THEN '180-200'
                    ELSE '200+'
                END
            `;

            const scoreDist = await db
                .select({ bucket: sql<string>`${bucketExpr}`, count: count() })
                .from(submissions)
                .where(dateFilter)
                .groupBy(bucketExpr);

            const bucketOrder = ["Below 0", "0-20", "20-40", "40-60", "60-80", "80-100", "100-120", "120-140", "140-160", "160-180", "180-200", "200+"];
            const orderedDist = bucketOrder.map(b => {
                const found = scoreDist.find(s => s.bucket?.trim() === b);
                return { bucket: b, count: found?.count || 0 };
            }).filter(b => b.count > 0);

            const avgScoreTrend = await db
                .select({
                    date: sql<string>`TO_CHAR(${submissions.createdAt}, 'YYYY-MM-DD')`,
                    avgScore: avg(submissions.rawScore),
                    avgAccuracy: avg(submissions.accuracy),
                    count: count(),
                })
                .from(submissions)
                .where(dateFilter)
                .groupBy(sql`TO_CHAR(${submissions.createdAt}, 'YYYY-MM-DD')`)
                .orderBy(sql`TO_CHAR(${submissions.createdAt}, 'YYYY-MM-DD')`);

            // Accuracy distribution
            const accBucketExpr = sql`
                CASE
                    WHEN ${submissions.accuracy} IS NULL THEN 'N/A'
                    WHEN ${submissions.accuracy} < 10 THEN '0-10%'
                    WHEN ${submissions.accuracy} < 20 THEN '10-20%'
                    WHEN ${submissions.accuracy} < 30 THEN '20-30%'
                    WHEN ${submissions.accuracy} < 40 THEN '30-40%'
                    WHEN ${submissions.accuracy} < 50 THEN '40-50%'
                    WHEN ${submissions.accuracy} < 60 THEN '50-60%'
                    WHEN ${submissions.accuracy} < 70 THEN '60-70%'
                    WHEN ${submissions.accuracy} < 80 THEN '70-80%'
                    WHEN ${submissions.accuracy} < 90 THEN '80-90%'
                    ELSE '90-100%'
                END
            `;

            const accuracyDist = await db
                .select({ bucket: sql<string>`${accBucketExpr}`, count: count() })
                .from(submissions)
                .where(and(dateFilter, sql`${submissions.accuracy} IS NOT NULL`))
                .groupBy(accBucketExpr);

            const accOrder = ["0-10%", "10-20%", "20-30%", "30-40%", "40-50%", "50-60%", "60-70%", "70-80%", "80-90%", "90-100%"];
            const orderedAcc = accOrder.map(b => {
                const found = accuracyDist.find(a => a.bucket?.trim() === b);
                return { bucket: b, count: found?.count || 0 };
            }).filter(b => b.count > 0);

            // Percentile stats
            const [scoreStats] = await db
                .select({
                    avg: avg(submissions.rawScore),
                    max: max(submissions.rawScore),
                    min: min(submissions.rawScore),
                    count: count(),
                    avgAccuracy: avg(submissions.accuracy),
                    median: sql<number>`PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ${submissions.rawScore})`,
                    p90: sql<number>`PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY ${submissions.rawScore})`,
                    p10: sql<number>`PERCENTILE_CONT(0.1) WITHIN GROUP (ORDER BY ${submissions.rawScore})`,
                })
                .from(submissions)
                .where(dateFilter);

            const [prevScoreStats] = await db
                .select({ avg: avg(submissions.rawScore), count: count() })
                .from(submissions)
                .where(prevDateFilter);

            return NextResponse.json({
                tab: "scores",
                summary: {
                    avgScore: scoreStats.avg ? Number(Number(scoreStats.avg).toFixed(1)) : 0,
                    maxScore: scoreStats.max ? Number(scoreStats.max) : 0,
                    minScore: scoreStats.min ? Number(scoreStats.min) : 0,
                    median: scoreStats.median ? Number(Number(scoreStats.median).toFixed(1)) : 0,
                    p90: scoreStats.p90 ? Number(Number(scoreStats.p90).toFixed(1)) : 0,
                    p10: scoreStats.p10 ? Number(Number(scoreStats.p10).toFixed(1)) : 0,
                    avgAccuracy: scoreStats.avgAccuracy ? Number(Number(scoreStats.avgAccuracy).toFixed(1)) : 0,
                    total: scoreStats.count,
                    prevAvg: prevScoreStats.avg ? Number(Number(prevScoreStats.avg).toFixed(1)) : 0,
                    delta: prevScoreStats.avg && scoreStats.avg
                        ? Number((((Number(scoreStats.avg) - Number(prevScoreStats.avg)) / Number(prevScoreStats.avg)) * 100).toFixed(1))
                        : 0,
                },
                scoreDistribution: orderedDist,
                accuracyDistribution: orderedAcc,
                avgScoreTrend: avgScoreTrend.map(t => ({
                    date: t.date,
                    avgScore: t.avgScore ? Number(Number(t.avgScore).toFixed(1)) : 0,
                    avgAccuracy: t.avgAccuracy ? Number(Number(t.avgAccuracy).toFixed(1)) : 0,
                    count: t.count,
                })),
            });
        }

        // ──────────────────────────────────────────────
        // USERS TAB
        // ──────────────────────────────────────────────
        if (tab === "users") {
            const stateDist = await db
                .select({ state: submissions.state, count: count() })
                .from(submissions)
                .where(and(dateFilter, sql`${submissions.state} IS NOT NULL AND ${submissions.state} != ''`))
                .groupBy(submissions.state)
                .orderBy(desc(count()))
                .limit(50);

            const categoryDist = await db
                .select({ category: submissions.category, count: count() })
                .from(submissions)
                .where(dateFilter)
                .groupBy(submissions.category);

            const genderDist = await db
                .select({ gender: submissions.gender, count: count() })
                .from(submissions)
                .where(dateFilter)
                .groupBy(submissions.gender);

            const pwdDist = await db
                .select({
                    isPWD: submissions.isPWD,
                    count: count(),
                })
                .from(submissions)
                .where(dateFilter)
                .groupBy(submissions.isPWD);

            // Category average scores
            const categoryAvgScores = await db
                .select({
                    category: submissions.category,
                    avgScore: avg(submissions.rawScore),
                    avgAccuracy: avg(submissions.accuracy),
                    count: count(),
                })
                .from(submissions)
                .where(dateFilter)
                .groupBy(submissions.category);

            const genderLabels: Record<string, string> = { M: "Male", F: "Female", O: "Other" };

            const [userSummary] = await db
                .select({
                    total: count(),
                    stateCount: sql<number>`COUNT(DISTINCT ${submissions.state})`,
                })
                .from(submissions)
                .where(dateFilter);

            const [prevUserSummary] = await db
                .select({ total: count() })
                .from(submissions)
                .where(prevDateFilter);

            return NextResponse.json({
                tab: "users",
                summary: {
                    total: userSummary.total,
                    prevTotal: prevUserSummary.total,
                    delta: prevUserSummary.total === 0 ? 0 : Number((((userSummary.total - prevUserSummary.total) / prevUserSummary.total) * 100).toFixed(1)),
                    uniqueStates: Number(userSummary.stateCount),
                },
                stateDist,
                categoryDist,
                genderDist: genderDist.map(g => ({ gender: genderLabels[g.gender] || g.gender, count: g.count })),
                pwdDist: pwdDist.map(p => ({ label: p.isPWD ? "PWD" : "Non-PWD", count: p.count })),
                categoryAvgScores: categoryAvgScores.map(c => ({
                    category: c.category,
                    avgScore: c.avgScore ? Number(Number(c.avgScore).toFixed(1)) : 0,
                    avgAccuracy: c.avgAccuracy ? Number(Number(c.avgAccuracy).toFixed(1)) : 0,
                    count: c.count,
                })),
            });
        }

        return NextResponse.json({ error: "Invalid tab" }, { status: 400 });
    } catch (error) {
        console.error("Analytics error:", error);
        return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
    }
}
