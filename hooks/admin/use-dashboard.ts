"use client";

import { useQuery, useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface DashboardStats {
    counts: {
        exams: { total: number; active: number; upcoming: number; closed: number };
        submissions: { total: number; today: number; yesterday: number; deltaPercent: number; thisWeek: number };
        shifts: number;
    };
    trends: {
        daily: { name: string; submissions: number }[];
        topExams: { name: string; value: number }[];
        categories: { name: string; value: number }[];
    };
    scoreSnapshot: {
        avgScore: number;
        avgAccuracy: number;
        maxScore: number;
        totalRanked: number;
        topScorer: { name: string; score: number; exam: string } | null;
    };
    demographics: {
        gender: { name: string; value: number }[];
        topStates: { name: string; value: number }[];
        categories: { name: string; value: number }[];
    };
    upcomingExams: {
        id: number;
        name: string;
        status: string;
        agency: string;
        startDate: string | null;
        submissions: number;
        shifts: number;
    }[];
    activity: {
        id: string;
        type: "submission" | "alert" | "job" | "system" | "audit";
        user: string;
        exam: string;
        time: string;
        status: string;
    }[];
    health: {
        db: { status: string; latency: number; message: string };
        api: { status: string; uptime: number; uptimeFormatted: string; message: string };
        cache: { status: string; message: string };
        workers: { status: string; activeJobs: number; failedJobs: number; totalProcessed: number; message: string };
        memory: { heapUsed: number; heapTotal: number; rss: number; external: number; percentUsed: number };
        lastCheck: string;
    };
    pipeline: {
        parser: { totalParses: number; successRate: number; avgParseTime: number; status: string };
        api: { totalRequests: number; avgResponseTime: number; p95ResponseTime: number; errorRate: number; status: string };
    };
    engagement: {
        resultViews: number;
        feedback: { avgRating: number; total: number; unresolved: number };
        unreadNotifications: number;
    };
    cutoffStatus: {
        total: number;
        published: number;
        draft: number;
        confidence: { level: string; count: number }[];
    };
    recentJobs: {
        name: string;
        type: string;
        status: string;
        startedAt: string;
        completedAt: string | null;
        duration: number | null;
    }[];
    scheduledJobs: {
        id: number;
        name: string;
        type: string;
        cron: string;
        isEnabled: boolean;
        lastRunAt: string | null;
        nextRunAt: string | null;
    }[];
    errorCount24h: number;
    velocity: { hour: string; count: number }[];
}

// ─── Fetchers ───────────────────────────────────────────────────────────────

async function fetchDashboardStats(examId?: number | null): Promise<DashboardStats> {
    const params = examId ? `?examId=${examId}` : "";
    const res = await fetch(`/api/admin/stats${params}`);
    if (!res.ok) throw new Error("Failed to fetch dashboard stats");
    return res.json();
}

// ─── Hooks ──────────────────────────────────────────────────────────────────

export function useDashboardStats(examId?: number | null) {
    return useQuery({
        queryKey: ["admin", "dashboard", { examId }],
        queryFn: () => fetchDashboardStats(examId),
        refetchInterval: 30_000,
    });
}

export function useSuspenseDashboardStats(examId?: number | null) {
    return useSuspenseQuery({
        queryKey: ["admin", "dashboard", { examId }],
        queryFn: () => fetchDashboardStats(examId),
        refetchInterval: 30_000,
    });
}

export function useTriggerDashboardJob() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (type: string) => {
            const res = await fetch("/api/admin/jobs", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type }),
            });
            if (!res.ok) throw new Error("Failed to trigger job");
            return res.json();
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["admin", "dashboard"] });
        },
    });
}
