import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import {
    exams, submissions, shifts, adminUsers, auditLogs, jobRuns, systemLogs,
    cutoffs, scheduledJobs, parserStats, apiMetrics, resultViews, userFeedback, notifications
} from "@/lib/db/schema";
import { eq, sql, count, desc, gte, lt, and, asc, isNotNull } from "drizzle-orm";

// Helper: safe query wrapper — returns fallback on error
async function safeQuery<T>(fn: () => Promise<T>, fallback: T, label?: string): Promise<T> {
    try {
        return await fn();
    } catch (e) {
        console.error(`[Stats] Query failed (${label || 'unknown'}):`, (e as Error).message);
        return fallback;
    }
}

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const examIdParam = searchParams.get("examId");
        const scoreExamId = examIdParam ? parseInt(examIdParam, 10) : null;

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        // ─── 1. CORE COUNTS (exam + submission + shift) ────────────────
        const [examStats] = await db
            .select({
                total: count(),
                active: sql<number>`count(case when ${exams.status} = 'active' then 1 end)`,
                upcoming: sql<number>`count(case when ${exams.status} = 'upcoming' then 1 end)`,
                closed: sql<number>`count(case when ${exams.status} = 'closed' then 1 end)`,
            })
            .from(exams);

        const [submissionStats] = await db
            .select({ total: count() })
            .from(submissions);

        const [todaySubmissions] = await db
            .select({ count: count() })
            .from(submissions)
            .where(gte(submissions.createdAt, today));

        const [weekSubmissions] = await db
            .select({ count: count() })
            .from(submissions)
            .where(gte(submissions.createdAt, weekAgo));

        const [yesterdaySubmissions] = await db
            .select({ count: count() })
            .from(submissions)
            .where(and(
                gte(submissions.createdAt, yesterday),
                lt(submissions.createdAt, today)
            ));

        const todayCount = todaySubmissions?.count || 0;
        const yesterdayCount = yesterdaySubmissions?.count || 0;
        const deltaPercent = yesterdayCount > 0
            ? Math.round(((todayCount - yesterdayCount) / yesterdayCount) * 100)
            : todayCount > 0 ? 100 : 0;

        const [shiftStats] = await db
            .select({ total: count() })
            .from(shifts);

        // ─── 2. CHARTS — Category, Daily Trends, Top Exams ─────────────
        const categoryBreakdown = await safeQuery(
            () => db.select({ category: submissions.category, count: count() }).from(submissions).groupBy(submissions.category),
            [] as { category: string; count: number }[], "categoryBreakdown"
        );

        const dailySubmissions = await safeQuery(
            () => db
                .select({ date: sql<string>`TO_CHAR(${submissions.createdAt}, 'Mon DD')`, count: count() })
                .from(submissions)
                .where(gte(submissions.createdAt, monthAgo))
                .groupBy(sql`DATE(${submissions.createdAt})`, sql`TO_CHAR(${submissions.createdAt}, 'Mon DD')`)
                .orderBy(sql`DATE(${submissions.createdAt})`),
            [] as { date: string; count: number }[], "dailySubmissions"
        );

        const topExams = await safeQuery(
            () => db
                .select({ examId: submissions.examId, name: exams.name, count: count() })
                .from(submissions)
                .leftJoin(exams, eq(submissions.examId, exams.id))
                .groupBy(submissions.examId, exams.name)
                .orderBy(desc(count()))
                .limit(5),
            [] as { examId: number; name: string | null; count: number }[], "topExams"
        );

        // ─── 3. SCORE SNAPSHOT ──────────────────────────────────────────
        const scoreData = await safeQuery(async () => {
            const scoreWhere = scoreExamId ? eq(submissions.examId, scoreExamId) : undefined;

            const scoreQuery = db
                .select({
                    avgScore: sql<number>`COALESCE(ROUND(AVG(${submissions.rawScore})::numeric, 1), 0)`,
                    avgAccuracy: sql<number>`COALESCE(ROUND(AVG(${submissions.accuracy})::numeric, 1), 0)`,
                    maxScore: sql<number>`COALESCE(MAX(${submissions.rawScore}), 0)`,
                    totalRanked: sql<number>`count(case when ${submissions.overallRank} is not null then 1 end)`,
                })
                .from(submissions);
            const [snapshot] = scoreWhere ? await scoreQuery.where(scoreWhere) : await scoreQuery;

            const topQuery = db
                .select({ name: submissions.name, score: submissions.rawScore, examName: exams.name })
                .from(submissions)
                .leftJoin(exams, eq(submissions.examId, exams.id));
            const topScorer = scoreWhere
                ? await topQuery.where(scoreWhere).orderBy(desc(submissions.rawScore)).limit(1)
                : await topQuery.orderBy(desc(submissions.rawScore)).limit(1);

            return {
                avgScore: snapshot?.avgScore || 0,
                avgAccuracy: snapshot?.avgAccuracy || 0,
                maxScore: snapshot?.maxScore || 0,
                totalRanked: snapshot?.totalRanked || 0,
                topScorer: topScorer.length > 0 ? {
                    name: topScorer[0].name,
                    score: topScorer[0].score,
                    exam: topScorer[0].examName,
                } : null,
            };
        }, { avgScore: 0, avgAccuracy: 0, maxScore: 0, totalRanked: 0, topScorer: null }, "scoreSnapshot");

        // ─── 4. DEMOGRAPHICS ────────────────────────────────────────────
        const demographics = await safeQuery(async () => {
            const gender = await db
                .select({ gender: submissions.gender, count: count() })
                .from(submissions)
                .groupBy(submissions.gender);

            const topStates = await db
                .select({ state: submissions.state, count: count() })
                .from(submissions)
                .where(isNotNull(submissions.state))
                .groupBy(submissions.state)
                .orderBy(desc(count()))
                .limit(5);

            return {
                gender: gender.map(g => ({ name: g.gender, value: g.count })),
                topStates: topStates.map(s => ({ name: s.state || 'Unknown', value: s.count })),
                categories: categoryBreakdown.map(c => ({ name: c.category, value: c.count })),
            };
        }, { gender: [], topStates: [], categories: [] }, "demographics");

        // ─── 5. UPCOMING EXAMS ──────────────────────────────────────────
        const upcomingExams = await safeQuery(
            () => db
                .select({
                    id: exams.id, name: exams.name, status: exams.status,
                    agency: exams.agency, startDate: exams.examStartDate,
                    totalSubmissions: exams.totalSubmissions, totalShifts: exams.totalShifts,
                })
                .from(exams)
                .where(sql`${exams.status} IN ('upcoming', 'active')`)
                .orderBy(asc(exams.examStartDate))
                .limit(5),
            [], "upcomingExams"
        );

        // ─── 6. RECENT ACTIVITY ─────────────────────────────────────────
        const recentSubs = await safeQuery(
            () => db
                .select({
                    type: sql<string>`'submission'`, title: submissions.name,
                    subtitle: exams.name, status: sql<string>`'completed'`,
                    timestamp: submissions.createdAt, details: submissions.rollNumber,
                })
                .from(submissions)
                .leftJoin(exams, eq(submissions.examId, exams.id))
                .orderBy(desc(submissions.createdAt))
                .limit(5),
            [], "recentSubs"
        );

        const recentAudits = await safeQuery(
            () => db
                .select({
                    type: sql<string>`'audit'`,
                    title: sql<string>`CONCAT(${auditLogs.action}, ' ', ${auditLogs.entity})`,
                    subtitle: adminUsers.name,
                    status: sql<string>`'info'`,
                    timestamp: auditLogs.timestamp,
                    details: sql<string>`CONCAT('Action: ', ${auditLogs.action})`,
                })
                .from(auditLogs)
                .leftJoin(adminUsers, eq(auditLogs.adminUserId, adminUsers.id))
                .orderBy(desc(auditLogs.timestamp))
                .limit(5),
            [], "recentAudits"
        );

        const recentJobs = await safeQuery(
            () => db
                .select({
                    type: sql<string>`'job'`, title: jobRuns.jobName,
                    subtitle: sql<string>`${jobRuns.jobType}`,
                    status: sql<string>`CASE WHEN ${jobRuns.status} = 'success' THEN 'completed' WHEN ${jobRuns.status} = 'failed' THEN 'error' ELSE 'running' END`,
                    timestamp: jobRuns.startedAt, details: jobRuns.errorMessage,
                    rawStatus: jobRuns.status, completedAt: jobRuns.completedAt,
                    duration: sql<number>`EXTRACT(EPOCH FROM (COALESCE(${jobRuns.completedAt}, NOW()) - COALESCE(${jobRuns.startedAt}, NOW())))`,
                })
                .from(jobRuns)
                .orderBy(desc(jobRuns.startedAt))
                .limit(10),
            [], "recentJobs"
        );

        const recentErrors = await safeQuery(
            () => db
                .select({
                    type: sql<string>`'alert'`, title: systemLogs.message,
                    subtitle: systemLogs.component, status: sql<string>`'warning'`,
                    timestamp: systemLogs.timestamp, details: systemLogs.level,
                })
                .from(systemLogs)
                .where(eq(systemLogs.level, 'ERROR'))
                .orderBy(desc(systemLogs.timestamp))
                .limit(5),
            [], "recentErrors"
        );

        const [errorCount24hResult] = await safeQuery(
            () => db.select({ count: count() }).from(systemLogs)
                .where(and(eq(systemLogs.level, 'ERROR'), gte(systemLogs.timestamp, dayAgo))),
            [{ count: 0 }], "errorCount24h"
        );

        // Merge and sort activity
        const allActivity = [...recentSubs, ...recentAudits, ...recentJobs.map(j => ({
            type: j.type, title: j.title, subtitle: j.subtitle, status: j.status,
            timestamp: j.timestamp, details: j.details,
        })), ...recentErrors]
            .filter(a => a.timestamp)
            .sort((a, b) => new Date(b.timestamp!).getTime() - new Date(a.timestamp!).getTime())
            .slice(0, 15);

        // ─── 7. SYSTEM HEALTH ───────────────────────────────────────────
        const start = performance.now();
        await db.execute(sql`SELECT 1`);
        const end = performance.now();
        const dbLatency = Math.round(end - start);

        const mem = process.memoryUsage();
        const uptimeSeconds = process.uptime();
        const uptimeDays = Math.floor(uptimeSeconds / 86400);
        const uptimeHours = Math.floor((uptimeSeconds % 86400) / 3600);
        const uptimeMinutes = Math.floor((uptimeSeconds % 3600) / 60);

        const recentCompletedJobs = recentJobs
            .filter(j => j.rawStatus === 'success' || j.rawStatus === 'failed')
            .slice(0, 5)
            .map(j => ({
                name: j.title, type: j.subtitle, status: j.rawStatus,
                startedAt: j.timestamp, completedAt: j.completedAt,
                duration: j.duration ? Math.round(j.duration as number) : null,
            }));

        // ─── 8. DATA PIPELINE HEALTH ────────────────────────────────────
        const pipelineData = await safeQuery(async () => {
            const [parser] = await db
                .select({
                    totalParses: count(),
                    successCount: sql<number>`count(case when ${parserStats.success} = true then 1 end)`,
                    avgParseTime: sql<number>`COALESCE(ROUND(AVG(${parserStats.parseTime})::numeric), 0)`,
                })
                .from(parserStats)
                .where(gte(parserStats.timestamp, dayAgo));

            const successRate = (parser?.totalParses || 0) > 0
                ? Math.round(((parser?.successCount || 0) / parser.totalParses) * 100) : 0;

            const [api] = await db
                .select({
                    totalRequests: count(),
                    avgResponseTime: sql<number>`COALESCE(ROUND(AVG(${apiMetrics.responseTime})::numeric), 0)`,
                    p95ResponseTime: sql<number>`COALESCE((SELECT ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY ${apiMetrics.responseTime})::numeric) FROM ${apiMetrics} WHERE ${apiMetrics.timestamp} >= ${dayAgo.toISOString()}::timestamp), 0)`,
                    errorCount: sql<number>`count(case when ${apiMetrics.statusCode} >= 500 then 1 end)`,
                })
                .from(apiMetrics)
                .where(gte(apiMetrics.timestamp, dayAgo));

            const errorRate = (api?.totalRequests || 0) > 0
                ? Math.round(((api?.errorCount || 0) / api.totalRequests) * 100) : 0;

            return {
                parser: {
                    totalParses: parser?.totalParses || 0,
                    successRate, avgParseTime: parser?.avgParseTime || 0,
                    status: successRate >= 95 ? 'healthy' : successRate >= 80 ? 'degraded' : 'down' as string,
                },
                api: {
                    totalRequests: api?.totalRequests || 0,
                    avgResponseTime: api?.avgResponseTime || 0,
                    p95ResponseTime: api?.p95ResponseTime || 0,
                    errorRate,
                    status: errorRate <= 1 ? 'healthy' : errorRate <= 5 ? 'degraded' : 'down' as string,
                },
            };
        }, {
            parser: { totalParses: 0, successRate: 0, avgParseTime: 0, status: 'down' },
            api: { totalRequests: 0, avgResponseTime: 0, p95ResponseTime: 0, errorRate: 0, status: 'down' },
        }, "pipeline");

        // ─── 9. ENGAGEMENT METRICS ──────────────────────────────────────
        const engagement = await safeQuery(async () => {
            const [views] = await db.select({ count: count() }).from(resultViews)
                .where(gte(resultViews.timestamp, today));

            const [feedback] = await db
                .select({
                    avgRating: sql<number>`COALESCE(ROUND(AVG(${userFeedback.rating})::numeric, 1), 0)`,
                    totalFeedback: count(),
                    unresolved: sql<number>`count(case when ${userFeedback.isResolved} = false then 1 end)`,
                })
                .from(userFeedback);

            const [unread] = await db.select({ count: count() }).from(notifications)
                .where(eq(notifications.isRead, false));

            return {
                resultViews: views?.count || 0,
                feedback: {
                    avgRating: feedback?.avgRating || 0,
                    total: feedback?.totalFeedback || 0,
                    unresolved: feedback?.unresolved || 0,
                },
                unreadNotifications: unread?.count || 0,
            };
        }, {
            resultViews: 0,
            feedback: { avgRating: 0, total: 0, unresolved: 0 },
            unreadNotifications: 0,
        }, "engagement");

        // ─── 10. CUTOFF STATUS ──────────────────────────────────────────
        const cutoffStatus = await safeQuery(async () => {
            const [stats] = await db
                .select({
                    total: count(),
                    published: sql<number>`count(case when ${cutoffs.isPublished} = true then 1 end)`,
                    draft: sql<number>`count(case when ${cutoffs.isPublished} = false then 1 end)`,
                })
                .from(cutoffs);

            const confidence = await db
                .select({ level: cutoffs.confidenceLevel, count: count() })
                .from(cutoffs)
                .where(isNotNull(cutoffs.confidenceLevel))
                .groupBy(cutoffs.confidenceLevel);

            return {
                total: stats?.total || 0,
                published: stats?.published || 0,
                draft: stats?.draft || 0,
                confidence: confidence.map(c => ({ level: c.level, count: c.count })),
            };
        }, { total: 0, published: 0, draft: 0, confidence: [] }, "cutoffStatus");

        // ─── 11. SCHEDULED JOBS ─────────────────────────────────────────
        const scheduledJobsList = await safeQuery(
            () => db
                .select({
                    id: scheduledJobs.id, name: scheduledJobs.name,
                    type: scheduledJobs.jobType, cron: scheduledJobs.cronExpression,
                    isEnabled: scheduledJobs.isEnabled,
                    lastRunAt: scheduledJobs.lastRunAt, nextRunAt: scheduledJobs.nextRunAt,
                })
                .from(scheduledJobs)
                .orderBy(asc(scheduledJobs.nextRunAt))
                .limit(8),
            [], "scheduledJobs"
        );

        // ─── 12. HOURLY VELOCITY ────────────────────────────────────────
        const hourlyVelocity = await safeQuery(
            () => db
                .select({ hour: sql<string>`TO_CHAR(${submissions.createdAt}, 'HH24:00')`, count: count() })
                .from(submissions)
                .where(gte(submissions.createdAt, dayAgo))
                .groupBy(sql`TO_CHAR(${submissions.createdAt}, 'HH24:00')`)
                .orderBy(sql`TO_CHAR(${submissions.createdAt}, 'HH24:00')`),
            [], "velocity"
        );

        // ─── BUILD RESPONSE ─────────────────────────────────────────────
        return NextResponse.json({
            counts: {
                exams: { ...examStats, total: examStats?.total || 0 },
                submissions: { total: submissionStats?.total || 0, today: todayCount, yesterday: yesterdayCount, deltaPercent, thisWeek: weekSubmissions?.count || 0 },
                shifts: shiftStats?.total || 0,
            },
            trends: {
                daily: dailySubmissions.map(d => ({ name: d.date, submissions: d.count })),
                topExams: topExams.map(e => ({ name: e.name || `Exam ${e.examId}`, value: e.count })),
                categories: categoryBreakdown.map(c => ({ name: c.category, value: c.count })),
            },
            scoreSnapshot: scoreData,
            demographics,
            upcomingExams: upcomingExams.map(e => ({
                id: e.id, name: e.name, status: e.status, agency: e.agency,
                startDate: e.startDate, submissions: e.totalSubmissions || 0, shifts: e.totalShifts || 0,
            })),
            activity: allActivity.map(a => ({
                id: Math.random().toString(36).substr(2, 9),
                type: a.type, user: a.subtitle || 'System',
                exam: a.title, time: a.timestamp, status: a.status,
            })),
            health: {
                db: {
                    status: dbLatency < 100 ? 'healthy' : dbLatency < 300 ? 'degraded' : 'down',
                    latency: dbLatency,
                    message: dbLatency < 100 ? 'Optimal' : dbLatency < 300 ? 'Slow Queries' : 'Critical',
                },
                api: {
                    status: 'healthy', uptime: process.uptime(),
                    uptimeFormatted: `${uptimeDays}d ${uptimeHours}h ${uptimeMinutes}m`,
                    message: 'Online',
                },
                cache: { status: 'down', message: 'Not Configured' },
                workers: {
                    status: recentJobs.some(j => j.rawStatus === 'running') ? 'active' : 'idle',
                    activeJobs: recentJobs.filter(j => j.rawStatus === 'running').length,
                    failedJobs: recentJobs.filter(j => j.rawStatus === 'failed').length,
                    totalProcessed: recentJobs.length,
                    message: recentJobs.some(j => j.rawStatus === 'running') ? 'Processing' : 'Idle',
                },
                memory: {
                    heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
                    heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
                    rss: Math.round(mem.rss / 1024 / 1024),
                    external: Math.round(mem.external / 1024 / 1024),
                    percentUsed: Math.round((mem.heapUsed / mem.heapTotal) * 100),
                },
                lastCheck: new Date().toISOString(),
            },
            pipeline: pipelineData,
            engagement,
            cutoffStatus,
            recentJobs: recentCompletedJobs,
            scheduledJobs: scheduledJobsList,
            errorCount24h: errorCount24hResult?.count || 0,
            velocity: hourlyVelocity.map(v => ({ hour: v.hour, count: v.count })),
        });

    } catch (error) {
        console.error("Stats API Error:", error);
        return NextResponse.json({ error: "Failed to fetch stats", details: (error as Error).message }, { status: 500 });
    }
}
