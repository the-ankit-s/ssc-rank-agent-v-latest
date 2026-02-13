"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface DashboardStats {
    counts: {
        exams: { total: number; active: number; upcoming: number; closed: number };
        submissions: { total: number; today: number; thisWeek: number };
        shifts: number;
    };
    trends: {
        daily: { name: string; submissions: number }[];
        topExams: { name: string; value: number }[];
        categories: { name: string; value: number }[];
    };
    activity: {
        id: string;
        type: "submission" | "alert" | "job" | "system";
        user: string;
        exam: string;
        time: string;
        status: string;
    }[];
    health: {
        db: { status: string; latency: number; message: string };
        api: { status: string; uptime: number; message: string };
        cache: { status: string; message: string };
        workers: { status: string; activeJobs: number; failedJobs: number; message: string };
        lastCheck: string;
    };
}

// ─── Fetchers ───────────────────────────────────────────────────────────────

async function fetchDashboardStats(): Promise<DashboardStats> {
    const res = await fetch("/api/admin/stats");
    if (!res.ok) throw new Error("Failed to fetch dashboard stats");
    return res.json();
}

// ─── Hooks ──────────────────────────────────────────────────────────────────

export function useDashboardStats() {
    return useQuery({
        queryKey: ["admin", "dashboard"],
        queryFn: fetchDashboardStats,
        refetchInterval: 30_000, // auto-refresh every 30s
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
