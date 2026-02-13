"use client";

import { useQuery, useSuspenseQuery } from "@tanstack/react-query";

// ─── Hook ───────────────────────────────────────────────────────────────────

interface AnalyticsParams {
    tab: string;
    range: string;
    examId: number | null;
    customFrom?: string;
    customTo?: string;
    autoRefresh?: boolean;
}

export function useAnalytics({ tab, range, examId, customFrom, customTo, autoRefresh }: AnalyticsParams) {
    return useQuery({
        queryKey: ["admin", "analytics", { tab, range, examId, customFrom, customTo }],
        queryFn: async () => {
            let url = `/api/admin/analytics?tab=${tab}&range=${range}`;
            if (range === "custom" && customFrom && customTo) url += `&from=${customFrom}&to=${customTo}`;
            if (examId) url += `&examId=${examId}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error("Failed to fetch analytics");
            return res.json();
        },
        refetchInterval: autoRefresh ? 60_000 : false,
    });
}

export function useSuspenseAnalytics({ tab, range, examId, customFrom, customTo, autoRefresh }: AnalyticsParams) {

    return useSuspenseQuery({
        queryKey: ["admin", "analytics", { tab, range, examId, customFrom, customTo }],
        queryFn: async () => {
            let url = `/api/admin/analytics?tab=${tab}&range=${range}`;
            if (range === "custom" && customFrom && customTo) url += `&from=${customFrom}&to=${customTo}`;
            if (examId) url += `&examId=${examId}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error("Failed to fetch analytics");
            return res.json();
        },
        refetchInterval: autoRefresh ? 60_000 : false,
    });
}
