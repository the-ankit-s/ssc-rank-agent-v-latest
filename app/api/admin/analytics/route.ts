import { NextResponse, NextRequest } from "next/server";
import { db } from "@/lib/db/client";
import { submissions, exams } from "@/lib/db/schema";
import { eq, sql, count, avg, min, max, gte, lte, and, desc } from "drizzle-orm";

function getDateRange(range: string, from?: string, to?: string): { start: Date | null; end: Date | null } {
    const now = new Date();
    let start: Date;
    let end = new Date(now);
    switch (range) {
        case "all": return { start: null, end: null };
        case "today": start = new Date(now.getFullYear(), now.getMonth(), now.getDate()); break;
        case "yesterday": start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1); end = new Date(now.getFullYear(), now.getMonth(), now.getDate()); break;
        case "7d": start = new Date(now.getTime() - 7 * 86400000); break;
        case "30d": start = new Date(now.getTime() - 30 * 86400000); break;
        case "90d": start = new Date(now.getTime() - 90 * 86400000); break;
        case "this_month": start = new Date(now.getFullYear(), now.getMonth(), 1); break;
        case "last_month": start = new Date(now.getFullYear(), now.getMonth() - 1, 1); end = new Date(now.getFullYear(), now.getMonth(), 1); break;
        case "custom": start = from ? new Date(from) : new Date(now.getTime() - 30 * 86400000); end = to ? new Date(to) : now; break;
        default: start = new Date(now.getTime() - 30 * 86400000);
    }
    return { start, end };
}

function getPreviousPeriod(start: Date, end: Date) {
    const dur = end.getTime() - start.getTime();
    return { start: new Date(start.getTime() - dur), end: new Date(start.getTime()) };
}

const pct = (cur: number, prev: number) =>
    prev === 0 ? (cur > 0 ? 100 : 0) : Number((((cur - prev) / prev) * 100).toFixed(1));

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const tab = searchParams.get("tab") || "overview";
        const range = searchParams.get("range") || "all";
        const from = searchParams.get("from") || undefined;
        const to = searchParams.get("to") || undefined;
        const examIdParam = searchParams.get("examId");
        const examId = examIdParam ? Number(examIdParam) : null;

        const { start, end } = getDateRange(range, from, to);

        // Build composite filter: date + optional exam
        const conditions: any[] = [];
        if (start && end) {
            conditions.push(gte(submissions.createdAt, start));
            conditions.push(lte(submissions.createdAt, end));
        }
        if (examId) {
            conditions.push(eq(submissions.examId, examId));
        }
        const filter = conditions.length > 0 ? and(...conditions) : undefined;

        // Previous period filter
        const prev = start && end ? getPreviousPeriod(start, end) : null;
        const prevConditions: any[] = [];
        if (prev) {
            prevConditions.push(gte(submissions.createdAt, prev.start));
            prevConditions.push(lte(submissions.createdAt, prev.end));
        } else {
            prevConditions.push(sql`1 = 0`);
        }
        if (examId) prevConditions.push(eq(submissions.examId, examId));
        const prevFilter = and(...prevConditions);

        // ── Exam list (always returned for the selector) ──
        const examList = await db
            .select({ id: exams.id, name: exams.name, agency: exams.agency })
            .from(exams)
            .orderBy(exams.name);

        // ──────────────────────────────────────────────
        // OVERVIEW TAB
        // ──────────────────────────────────────────────
        if (tab === "overview") {
            const [cur] = await db.select({
                total: count(),
                avgScore: avg(submissions.rawScore),
                maxScore: max(submissions.rawScore),
                minScore: min(submissions.rawScore),
                avgAccuracy: avg(submissions.accuracy),
                avgAttempted: avg(submissions.totalAttempted),
                avgCorrect: avg(submissions.totalCorrect),
                avgWrong: avg(submissions.totalWrong),
            }).from(submissions).where(filter);

            const [prv] = await db.select({
                total: count(),
                avgScore: avg(submissions.rawScore),
                avgAccuracy: avg(submissions.accuracy),
            }).from(submissions).where(prevFilter);

            const [examCnt] = await db.select({ count: sql<number>`COUNT(DISTINCT ${submissions.examId})` }).from(submissions).where(filter);
            const [prevExamCnt] = await db.select({ count: sql<number>`COUNT(DISTINCT ${submissions.examId})` }).from(submissions).where(prevFilter);
            const [stateCnt] = await db.select({ count: sql<number>`COUNT(DISTINCT ${submissions.state})` }).from(submissions).where(and(filter, sql`${submissions.state} IS NOT NULL AND ${submissions.state} != ''`));

            // Daily trend
            const dailyTrend = await db.select({
                date: sql<string>`TO_CHAR(${submissions.createdAt}, 'YYYY-MM-DD')`,
                count: count(),
            }).from(submissions).where(filter)
                .groupBy(sql`TO_CHAR(${submissions.createdAt}, 'YYYY-MM-DD')`)
                .orderBy(sql`TO_CHAR(${submissions.createdAt}, 'YYYY-MM-DD')`);

            // Category split (count-based, safe across exams)
            const categorySplit = await db.select({ category: submissions.category, count: count() })
                .from(submissions).where(filter).groupBy(submissions.category);

            // Only include score-based metrics when a single exam is selected OR there's only 1 exam in data
            const isSingleExam = examId || Number(examCnt.count) === 1;

            // Top exams (only when viewing all exams)
            let topExams: any[] = [];
            if (!examId) {
                topExams = await db.select({ examName: exams.name, count: count() })
                    .from(submissions).innerJoin(exams, eq(submissions.examId, exams.id))
                    .where(filter).groupBy(exams.name).orderBy(desc(count())).limit(8);
            }

            // Category performance — only meaningful within single exam
            let categoryPerformance: any[] = [];
            if (isSingleExam) {
                categoryPerformance = (await db.select({
                    category: submissions.category,
                    avgScore: avg(submissions.rawScore),
                    avgAccuracy: avg(submissions.accuracy),
                    count: count(),
                }).from(submissions).where(filter).groupBy(submissions.category)).map(c => ({
                    category: c.category,
                    avgScore: c.avgScore ? Number(Number(c.avgScore).toFixed(1)) : 0,
                    avgAccuracy: c.avgAccuracy ? Number(Number(c.avgAccuracy).toFixed(1)) : 0,
                    count: c.count,
                }));
            }

            // Top performers — 3 separate rankings, only within single exam
            const perfFields = {
                name: submissions.name, rollNumber: submissions.rollNumber,
                rawScore: submissions.rawScore, normalizedScore: submissions.normalizedScore,
                accuracy: submissions.accuracy, category: submissions.category,
                overallRank: submissions.overallRank, overallPercentile: submissions.overallPercentile,
                totalAttempted: submissions.totalAttempted, totalCorrect: submissions.totalCorrect,
                totalWrong: submissions.totalWrong, state: submissions.state, gender: submissions.gender,
            };
            const mapPerf = (p: any) => ({
                name: p.name, rollNumber: p.rollNumber,
                rawScore: p.rawScore,
                normalizedScore: p.normalizedScore ? Number(p.normalizedScore.toFixed(2)) : null,
                accuracy: p.accuracy ? Number(p.accuracy.toFixed(1)) : null,
                category: p.category, rank: p.overallRank,
                percentile: p.overallPercentile ? Number(p.overallPercentile.toFixed(2)) : null,
                attempted: p.totalAttempted, correct: p.totalCorrect, wrong: p.totalWrong,
                state: p.state, gender: p.gender,
            });

            let topByRawScore: any[] = [];
            let topByNormScore: any[] = [];
            let topByPercentile: any[] = [];
            if (isSingleExam) {
                topByRawScore = (await db.select(perfFields).from(submissions)
                    .where(filter).orderBy(desc(submissions.rawScore)).limit(10)).map(mapPerf);

                topByNormScore = (await db.select(perfFields).from(submissions)
                    .where(and(filter, sql`${submissions.normalizedScore} IS NOT NULL`))
                    .orderBy(desc(submissions.normalizedScore)).limit(10)).map(mapPerf);

                topByPercentile = (await db.select(perfFields).from(submissions)
                    .where(and(filter, sql`${submissions.overallPercentile} IS NOT NULL`))
                    .orderBy(desc(submissions.overallPercentile)).limit(10)).map(mapPerf);
            }

            // Attempt analysis — only within single exam (different exams have different Q counts)
            let attemptAnalysis: any[] = [];
            if (isSingleExam) {
                const buckets = await db.select({
                    bucket: sql<string>`CASE
                        WHEN ${submissions.totalAttempted} < 25 THEN '< 25'
                        WHEN ${submissions.totalAttempted} < 50 THEN '25-50'
                        WHEN ${submissions.totalAttempted} < 75 THEN '50-75'
                        WHEN ${submissions.totalAttempted} < 100 THEN '75-100'
                        ELSE '100+' END`,
                    avgAccuracy: avg(submissions.accuracy),
                    avgScore: avg(submissions.rawScore),
                    count: count(),
                }).from(submissions).where(and(filter, sql`${submissions.totalAttempted} IS NOT NULL`))
                    .groupBy(sql`CASE
                        WHEN ${submissions.totalAttempted} < 25 THEN '< 25'
                        WHEN ${submissions.totalAttempted} < 50 THEN '25-50'
                        WHEN ${submissions.totalAttempted} < 75 THEN '50-75'
                        WHEN ${submissions.totalAttempted} < 100 THEN '75-100'
                        ELSE '100+' END`);
                const order = ["< 25", "25-50", "50-75", "75-100", "100+"];
                attemptAnalysis = order.map(b => {
                    const f = buckets.find(a => a.bucket?.trim() === b);
                    return { bucket: b, avgAccuracy: f?.avgAccuracy ? Number(Number(f.avgAccuracy).toFixed(1)) : 0, avgScore: f?.avgScore ? Number(Number(f.avgScore).toFixed(1)) : 0, count: f?.count || 0 };
                }).filter(b => b.count > 0);
            }

            return NextResponse.json({
                tab: "overview",
                examId,
                examList,
                isSingleExam,
                kpis: {
                    submissions: { value: cur.total, prev: prv.total, delta: pct(cur.total, prv.total) },
                    avgScore: isSingleExam ? {
                        value: cur.avgScore ? Number(Number(cur.avgScore).toFixed(1)) : 0,
                        prev: prv.avgScore ? Number(Number(prv.avgScore).toFixed(1)) : 0,
                        delta: pct(cur.avgScore ? Number(cur.avgScore) : 0, prv.avgScore ? Number(prv.avgScore) : 0),
                    } : null,
                    maxScore: isSingleExam ? { value: cur.maxScore ? Number(cur.maxScore) : 0 } : null,
                    avgAccuracy: isSingleExam ? {
                        value: cur.avgAccuracy ? Number(Number(cur.avgAccuracy).toFixed(1)) : 0,
                        prev: prv.avgAccuracy ? Number(Number(prv.avgAccuracy).toFixed(1)) : 0,
                        delta: pct(cur.avgAccuracy ? Number(cur.avgAccuracy) : 0, prv.avgAccuracy ? Number(prv.avgAccuracy) : 0),
                    } : null,
                    activeExams: { value: Number(examCnt.count), prev: Number(prevExamCnt.count), delta: pct(Number(examCnt.count), Number(prevExamCnt.count)) },
                    uniqueStates: { value: Number(stateCnt.count) },
                    avgAttempted: isSingleExam ? { value: cur.avgAttempted ? Number(Number(cur.avgAttempted).toFixed(0)) : 0 } : null,
                    avgCorrect: isSingleExam ? { value: cur.avgCorrect ? Number(Number(cur.avgCorrect).toFixed(0)) : 0 } : null,
                    avgWrong: isSingleExam ? { value: cur.avgWrong ? Number(Number(cur.avgWrong).toFixed(0)) : 0 } : null,
                },
                dailyTrend,
                topExams,
                categorySplit,
                categoryPerformance,
                topByRawScore, topByNormScore, topByPercentile,
                attemptAnalysis,
            });
        }

        // ──────────────────────────────────────────────
        // SUBMISSIONS TAB (count-based — safe across exams)
        // ──────────────────────────────────────────────
        if (tab === "submissions") {
            const dailyTrend = await db.select({
                date: sql<string>`TO_CHAR(${submissions.createdAt}, 'YYYY-MM-DD')`, count: count(),
            }).from(submissions).where(filter)
                .groupBy(sql`TO_CHAR(${submissions.createdAt}, 'YYYY-MM-DD')`)
                .orderBy(sql`TO_CHAR(${submissions.createdAt}, 'YYYY-MM-DD')`);

            const hourly = await db.select({
                hour: sql<number>`EXTRACT(HOUR FROM ${submissions.createdAt})`, count: count(),
            }).from(submissions).where(filter)
                .groupBy(sql`EXTRACT(HOUR FROM ${submissions.createdAt})`)
                .orderBy(sql`EXTRACT(HOUR FROM ${submissions.createdAt})`);

            const dayOfWeek = await db.select({
                day: sql<number>`EXTRACT(DOW FROM ${submissions.createdAt})`, count: count(),
            }).from(submissions).where(filter)
                .groupBy(sql`EXTRACT(DOW FROM ${submissions.createdAt})`)
                .orderBy(sql`EXTRACT(DOW FROM ${submissions.createdAt})`);

            const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
            const [summary] = await db.select({ total: count() }).from(submissions).where(filter);
            const [prevSummary] = await db.select({ total: count() }).from(submissions).where(prevFilter);

            const sourceDist = await db.select({ source: submissions.source, count: count() })
                .from(submissions).where(filter).groupBy(submissions.source);

            let cum = 0;
            const cumulativeTrend = dailyTrend.map(d => { cum += d.count; return { date: d.date, cumulative: cum }; });
            const fullHourly = Array.from({ length: 24 }, (_, i) => {
                const f = hourly.find(h => h.hour === i);
                return { hour: `${String(i).padStart(2, "0")}:00`, count: f?.count || 0 };
            });

            return NextResponse.json({
                tab: "submissions", examId, examList,
                summary: {
                    total: summary.total, prevTotal: prevSummary.total,
                    delta: prevSummary.total === 0 ? (summary.total > 0 ? 100 : 0) : Number((((summary.total - prevSummary.total) / prevSummary.total) * 100).toFixed(1)),
                    avgPerDay: dailyTrend.length > 0 ? Number((summary.total / dailyTrend.length).toFixed(0)) : 0,
                    peakDay: dailyTrend.length > 0 ? dailyTrend.reduce((a, b) => a.count > b.count ? a : b) : null,
                },
                dailyTrend, cumulativeTrend, hourly: fullHourly,
                dayOfWeek: dayOfWeek.map(d => ({ day: dayNames[d.day] || `Day ${d.day}`, count: d.count })),
                sourceDist: sourceDist.map(s => ({ source: s.source || "unknown", count: s.count })),
            });
        }

        // ──────────────────────────────────────────────
        // EXAMS TAB (comparison across exams — no score mixing)
        // ──────────────────────────────────────────────
        if (tab === "exams") {
            // Each exam gets its OWN avg/max/accuracy — compared side by side, not blended
            const perExam = await db.select({
                examId: submissions.examId, examName: exams.name, agency: exams.agency,
                count: count(), avgScore: avg(submissions.rawScore),
                maxScore: max(submissions.rawScore), avgAccuracy: avg(submissions.accuracy),
            }).from(submissions).innerJoin(exams, eq(submissions.examId, exams.id))
                .where(filter).groupBy(submissions.examId, exams.name, exams.agency)
                .orderBy(desc(count())).limit(100);

            const agencyDist = await db.select({ agency: exams.agency, count: count() })
                .from(submissions).innerJoin(exams, eq(submissions.examId, exams.id))
                .where(filter).groupBy(exams.agency);

            const topIds = perExam.slice(0, 5).map(e => e.examId);
            let popularityOverTime: any[] = [];
            if (topIds.length > 0) {
                popularityOverTime = await db.select({
                    date: sql<string>`TO_CHAR(${submissions.createdAt}, 'YYYY-MM-DD')`,
                    examName: exams.name, count: count(),
                }).from(submissions).innerJoin(exams, eq(submissions.examId, exams.id))
                    .where(and(filter, sql`${submissions.examId} IN (${sql.join(topIds.map(id => sql`${id}`), sql`, `)})`))
                    .groupBy(sql`TO_CHAR(${submissions.createdAt}, 'YYYY-MM-DD')`, exams.name)
                    .orderBy(sql`TO_CHAR(${submissions.createdAt}, 'YYYY-MM-DD')`);
            }

            return NextResponse.json({
                tab: "exams", examId, examList,
                perExam: perExam.map(e => ({
                    ...e,
                    avgScore: e.avgScore ? Number(Number(e.avgScore).toFixed(1)) : 0,
                    maxScore: e.maxScore ? Number(e.maxScore) : 0,
                    avgAccuracy: e.avgAccuracy ? Number(Number(e.avgAccuracy).toFixed(1)) : 0,
                })),
                agencyDist, popularityOverTime,
            });
        }

        // ──────────────────────────────────────────────
        // SCORES TAB — must have a single exam selected
        // ──────────────────────────────────────────────
        if (tab === "scores") {
            // Check how many distinct exams
            const [examCnt] = await db.select({ count: sql<number>`COUNT(DISTINCT ${submissions.examId})` }).from(submissions).where(filter);
            const isSingleExam = examId || Number(examCnt.count) === 1;

            if (!isSingleExam) {
                // Return a warning — score analysis needs a single exam
                return NextResponse.json({
                    tab: "scores", examId, examList,
                    warning: "Score analysis requires selecting a specific exam. Different exams have different scoring scales, so mixing them produces meaningless statistics. Please select an exam from the dropdown above.",
                    summary: null, scoreDistribution: [], accuracyDistribution: [], avgScoreTrend: [], normComparison: null,
                });
            }

            const bucketExpr = sql`CASE
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
                ELSE '200+' END`;

            const scoreDist = await db.select({ bucket: sql<string>`${bucketExpr}`, count: count() })
                .from(submissions).where(filter).groupBy(bucketExpr);
            const bucketOrder = ["Below 0", "0-20", "20-40", "40-60", "60-80", "80-100", "100-120", "120-140", "140-160", "160-180", "180-200", "200+"];
            const orderedDist = bucketOrder.map(b => {
                const f = scoreDist.find(s => s.bucket?.trim() === b);
                return { bucket: b, count: f?.count || 0 };
            }).filter(b => b.count > 0);

            const avgScoreTrend = await db.select({
                date: sql<string>`TO_CHAR(${submissions.createdAt}, 'YYYY-MM-DD')`,
                avgScore: avg(submissions.rawScore), avgAccuracy: avg(submissions.accuracy), count: count(),
            }).from(submissions).where(filter)
                .groupBy(sql`TO_CHAR(${submissions.createdAt}, 'YYYY-MM-DD')`)
                .orderBy(sql`TO_CHAR(${submissions.createdAt}, 'YYYY-MM-DD')`);

            const accBucketExpr = sql`CASE
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
                ELSE '90-100%' END`;
            const accuracyDist = await db.select({ bucket: sql<string>`${accBucketExpr}`, count: count() })
                .from(submissions).where(and(filter, sql`${submissions.accuracy} IS NOT NULL`)).groupBy(accBucketExpr);
            const accOrder = ["0-10%", "10-20%", "20-30%", "30-40%", "40-50%", "50-60%", "60-70%", "70-80%", "80-90%", "90-100%"];
            const orderedAcc = accOrder.map(b => {
                const f = accuracyDist.find(a => a.bucket?.trim() === b);
                return { bucket: b, count: f?.count || 0 };
            }).filter(b => b.count > 0);

            const normComparison = await db.select({
                avgRaw: avg(submissions.rawScore), avgNormalized: avg(submissions.normalizedScore),
                maxRaw: max(submissions.rawScore), maxNormalized: max(submissions.normalizedScore),
                normalizedCount: sql<number>`COUNT(${submissions.normalizedScore})`, totalCount: count(),
            }).from(submissions).where(filter);

            const [ss] = await db.select({
                avg: avg(submissions.rawScore), max: max(submissions.rawScore), min: min(submissions.rawScore),
                count: count(), avgAccuracy: avg(submissions.accuracy),
                median: sql<number>`PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ${submissions.rawScore})`,
                p90: sql<number>`PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY ${submissions.rawScore})`,
                p10: sql<number>`PERCENTILE_CONT(0.1) WITHIN GROUP (ORDER BY ${submissions.rawScore})`,
                p25: sql<number>`PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY ${submissions.rawScore})`,
                p75: sql<number>`PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY ${submissions.rawScore})`,
                stdDev: sql<number>`STDDEV(${submissions.rawScore})`,
            }).from(submissions).where(filter);

            const [pss] = await db.select({ avg: avg(submissions.rawScore) }).from(submissions).where(prevFilter);

            return NextResponse.json({
                tab: "scores", examId, examList,
                summary: {
                    avgScore: ss.avg ? Number(Number(ss.avg).toFixed(1)) : 0,
                    maxScore: ss.max ? Number(ss.max) : 0,
                    minScore: ss.min ? Number(ss.min) : 0,
                    median: ss.median ? Number(Number(ss.median).toFixed(1)) : 0,
                    p90: ss.p90 ? Number(Number(ss.p90).toFixed(1)) : 0,
                    p10: ss.p10 ? Number(Number(ss.p10).toFixed(1)) : 0,
                    p25: ss.p25 ? Number(Number(ss.p25).toFixed(1)) : 0,
                    p75: ss.p75 ? Number(Number(ss.p75).toFixed(1)) : 0,
                    stdDev: ss.stdDev ? Number(Number(ss.stdDev).toFixed(1)) : 0,
                    avgAccuracy: ss.avgAccuracy ? Number(Number(ss.avgAccuracy).toFixed(1)) : 0,
                    total: ss.count,
                    delta: pss.avg && ss.avg ? Number((((Number(ss.avg) - Number(pss.avg)) / Number(pss.avg)) * 100).toFixed(1)) : 0,
                },
                scoreDistribution: orderedDist,
                accuracyDistribution: orderedAcc,
                avgScoreTrend: avgScoreTrend.map(t => ({
                    date: t.date,
                    avgScore: t.avgScore ? Number(Number(t.avgScore).toFixed(1)) : 0,
                    avgAccuracy: t.avgAccuracy ? Number(Number(t.avgAccuracy).toFixed(1)) : 0,
                    count: t.count,
                })),
                normComparison: normComparison[0] ? {
                    avgRaw: normComparison[0].avgRaw ? Number(Number(normComparison[0].avgRaw).toFixed(1)) : 0,
                    avgNormalized: normComparison[0].avgNormalized ? Number(Number(normComparison[0].avgNormalized).toFixed(1)) : null,
                    maxRaw: normComparison[0].maxRaw ? Number(normComparison[0].maxRaw) : 0,
                    maxNormalized: normComparison[0].maxNormalized ? Number(normComparison[0].maxNormalized) : null,
                    normalizedCount: Number(normComparison[0].normalizedCount),
                    totalCount: normComparison[0].totalCount,
                } : null,
            });
        }

        // ──────────────────────────────────────────────
        // USERS TAB
        // ──────────────────────────────────────────────
        if (tab === "users") {
            const [examCnt] = await db.select({ count: sql<number>`COUNT(DISTINCT ${submissions.examId})` }).from(submissions).where(filter);
            const isSingleExam = examId || Number(examCnt.count) === 1;

            const stateDist = await db.select({ state: submissions.state, count: count() })
                .from(submissions).where(and(filter, sql`${submissions.state} IS NOT NULL AND ${submissions.state} != ''`))
                .groupBy(submissions.state).orderBy(desc(count())).limit(50);

            const categoryDist = await db.select({ category: submissions.category, count: count() })
                .from(submissions).where(filter).groupBy(submissions.category);

            const genderDist = await db.select({ gender: submissions.gender, count: count() })
                .from(submissions).where(filter).groupBy(submissions.gender);

            const pwdDist = await db.select({ isPWD: submissions.isPWD, count: count() })
                .from(submissions).where(filter).groupBy(submissions.isPWD);

            const genderLabels: Record<string, string> = { M: "Male", F: "Female", O: "Other" };

            // Score-based demographics — only within single exam
            let categoryAvgScores: any[] = [];
            let genderPerformance: any[] = [];
            let topStatesByScore: any[] = [];

            if (isSingleExam) {
                categoryAvgScores = (await db.select({
                    category: submissions.category, avgScore: avg(submissions.rawScore),
                    avgAccuracy: avg(submissions.accuracy), count: count(), maxScore: max(submissions.rawScore),
                }).from(submissions).where(filter).groupBy(submissions.category)).map(c => ({
                    category: c.category,
                    avgScore: c.avgScore ? Number(Number(c.avgScore).toFixed(1)) : 0,
                    avgAccuracy: c.avgAccuracy ? Number(Number(c.avgAccuracy).toFixed(1)) : 0,
                    maxScore: c.maxScore ? Number(c.maxScore) : 0, count: c.count,
                }));

                genderPerformance = (await db.select({
                    gender: submissions.gender, avgScore: avg(submissions.rawScore),
                    avgAccuracy: avg(submissions.accuracy), count: count(),
                }).from(submissions).where(filter).groupBy(submissions.gender)).map(g => ({
                    gender: genderLabels[g.gender] || g.gender,
                    avgScore: g.avgScore ? Number(Number(g.avgScore).toFixed(1)) : 0,
                    avgAccuracy: g.avgAccuracy ? Number(Number(g.avgAccuracy).toFixed(1)) : 0, count: g.count,
                }));

                topStatesByScore = (await db.select({
                    state: submissions.state, avgScore: avg(submissions.rawScore), count: count(),
                }).from(submissions).where(and(filter, sql`${submissions.state} IS NOT NULL AND ${submissions.state} != ''`))
                    .groupBy(submissions.state).having(sql`count(*) >= 5`)
                    .orderBy(desc(avg(submissions.rawScore))).limit(15)).map(s => ({
                        state: s.state, avgScore: s.avgScore ? Number(Number(s.avgScore).toFixed(1)) : 0, count: s.count,
                    }));
            }

            const [us] = await db.select({
                total: count(), stateCount: sql<number>`COUNT(DISTINCT ${submissions.state})`,
            }).from(submissions).where(filter);
            const [pus] = await db.select({ total: count() }).from(submissions).where(prevFilter);

            return NextResponse.json({
                tab: "users", examId, examList, isSingleExam,
                summary: {
                    total: us.total, prevTotal: pus.total,
                    delta: pus.total === 0 ? 0 : Number((((us.total - pus.total) / pus.total) * 100).toFixed(1)),
                    uniqueStates: Number(us.stateCount),
                },
                stateDist, categoryDist,
                genderDist: genderDist.map(g => ({ gender: genderLabels[g.gender] || g.gender, count: g.count })),
                pwdDist: pwdDist.map(p => ({ label: p.isPWD ? "PWD" : "Non-PWD", count: p.count })),
                categoryAvgScores, genderPerformance, topStatesByScore,
            });
        }

        return NextResponse.json({ error: "Invalid tab" }, { status: 400 });
    } catch (error) {
        console.error("Analytics error:", error);
        return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
    }
}
