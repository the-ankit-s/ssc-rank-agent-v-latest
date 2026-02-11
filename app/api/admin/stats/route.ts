import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { exams, submissions, shifts, adminUsers, auditLogs, jobRuns, systemLogs } from "@/lib/db/schema";
import { eq, sql, count, desc, gte, and, or } from "drizzle-orm";

export async function GET() {
    try {
        // Get date ranges
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

        // 1. Total exams stats
        const [examStats] = await db
            .select({
                total: count(),
                active: sql<number>`count(case when ${exams.status} = 'active' then 1 end)`,
                upcoming: sql<number>`count(case when ${exams.status} = 'upcoming' then 1 end)`,
                closed: sql<number>`count(case when ${exams.status} = 'closed' then 1 end)`,
            })
            .from(exams);

        // 2. Submission stats
        const [submissionStats] = await db
            .select({
                total: count(),
            })
            .from(submissions);

        const [todaySubmissions] = await db
            .select({ count: count() })
            .from(submissions)
            .where(gte(submissions.createdAt, today));

        const [weekSubmissions] = await db
            .select({ count: count() })
            .from(submissions)
            .where(gte(submissions.createdAt, weekAgo));

        // 3. Shift stats
        const [shiftStats] = await db
            .select({ total: count() })
            .from(shifts);

        // 4. Category breakdown (Pie Chart)
        const categoryBreakdown = await db
            .select({
                category: submissions.category,
                count: count(),
            })
            .from(submissions)
            .groupBy(submissions.category);

        // 5. Daily submissions (Area Chart)
        const dailySubmissions = await db
            .select({
                date: sql<string>`TO_CHAR(${submissions.createdAt}, 'Mon DD')`,
                rawDate: sql<string>`DATE(${submissions.createdAt})`,
                count: count(),
            })
            .from(submissions)
            .where(gte(submissions.createdAt, monthAgo))
            .groupBy(sql`DATE(${submissions.createdAt})`, sql`TO_CHAR(${submissions.createdAt}, 'Mon DD')`)
            .orderBy(sql`DATE(${submissions.createdAt})`);

        // 6. Top 5 Exams (Bar Chart)
        const topExams = await db
            .select({
                examId: submissions.examId,
                name: exams.name,
                count: count(),
            })
            .from(submissions)
            .leftJoin(exams, eq(submissions.examId, exams.id))
            .groupBy(submissions.examId, exams.name)
            .orderBy(desc(count()))
            .limit(5);

        // 7. Recent Activity (Union of Submissions, Audits, Jobs, Logs)

        // A. Recent Submissions
        const recentSubs = await db
            .select({
                type: sql<string>`'submission'`,
                title: submissions.name, // Candidate name
                subtitle: exams.name,
                status: sql<string>`'completed'`,
                timestamp: submissions.createdAt,
                details: submissions.rollNumber
            })
            .from(submissions)
            .leftJoin(exams, eq(submissions.examId, exams.id))
            .orderBy(desc(submissions.createdAt))
            .limit(5);

        // B. Recent Audits
        const recentAudits = await db
            .select({
                type: sql<string>`'audit'`,
                title: sql<string>`${auditLogs.action} || ' ' || ${auditLogs.entity}`,
                subtitle: adminUsers.name,
                status: sql<string>`'info'`,
                timestamp: auditLogs.timestamp,
                details: sql<string>`'Action: ' || ${auditLogs.action}`
            })
            .from(auditLogs)
            .leftJoin(adminUsers, eq(auditLogs.adminUserId, adminUsers.id))
            .orderBy(desc(auditLogs.timestamp))
            .limit(5);

        // C. Recent Jobs
        const recentJobs = await db
            .select({
                type: sql<string>`'job'`,
                title: jobRuns.jobName,
                subtitle: sql<string>`${jobRuns.jobType}`,
                status: sql<string>`
                    CASE 
                        WHEN ${jobRuns.status} = 'success' THEN 'completed'
                        WHEN ${jobRuns.status} = 'failed' THEN 'error'
                        ELSE 'running'
                    END
                `,
                timestamp: jobRuns.startedAt,
                details: jobRuns.errorMessage
            })
            .from(jobRuns)
            .orderBy(desc(jobRuns.startedAt))
            .limit(5);

        // D. Recent System Errors
        const recentErrors = await db
            .select({
                type: sql<string>`'alert'`,
                title: systemLogs.message,
                subtitle: systemLogs.component,
                status: sql<string>`'warning'`,
                timestamp: systemLogs.timestamp,
                details: systemLogs.level
            })
            .from(systemLogs)
            .where(eq(systemLogs.level, 'ERROR'))
            .orderBy(desc(systemLogs.timestamp))
            .limit(5);

        // Merge and Sort
        const allActivity = [...recentSubs, ...recentAudits, ...recentJobs, ...recentErrors]
            .sort((a, b) => new Date(b.timestamp!).getTime() - new Date(a.timestamp!).getTime())
            .slice(0, 10);

        // 8. System Health
        const start = performance.now();
        await db.execute(sql`SELECT 1`);
        const end = performance.now();
        const dbLatency = Math.round(end - start);

        return NextResponse.json({
            counts: {
                exams: { ...examStats, total: examStats?.total || 0 },
                submissions: { ...submissionStats, total: submissionStats?.total || 0, today: todaySubmissions?.count || 0, thisWeek: weekSubmissions?.count || 0 },
                shifts: shiftStats?.total || 0
            },
            trends: {
                daily: dailySubmissions.map(d => ({ name: d.date, submissions: d.count })),
                topExams: topExams.map(e => ({ name: e.name || `Exam ${e.examId}`, value: e.count })),
                categories: categoryBreakdown.map(c => ({ name: c.category, value: c.count }))
            },
            activity: allActivity.map(a => ({
                id: Math.random().toString(36).substr(2, 9),
                type: a.type,
                user: a.subtitle || 'System', // Using subtitle as user/source
                exam: a.title, // Using title as interaction summary
                time: a.timestamp,
                status: a.status
            })),
            health: {
                db: {
                    status: dbLatency < 200 ? 'healthy' : 'degraded',
                    latency: dbLatency,
                    message: dbLatency < 200 ? 'Optimal' : 'High Latency'
                },
                api: {
                    status: 'healthy',
                    uptime: process.uptime(),
                    message: 'Online'
                },
                cache: {
                    status: 'down',
                    message: 'Not Configured'
                },
                workers: {
                    status: recentJobs.some(j => j.status === 'running') ? 'active' : 'idle',
                    activeJobs: recentJobs.filter(j => j.status === 'running').length,
                    failedJobs: recentJobs.filter(j => j.status === 'error').length,
                    message: recentJobs.some(j => j.status === 'running') ? 'Processing' : 'Idle'
                },
                lastCheck: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error("Stats API Error:", error);
        return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
    }
}
