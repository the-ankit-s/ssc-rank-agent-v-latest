"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Job {
    id: number; jobName: string; jobType: string;
    status: "pending" | "running" | "success" | "failed";
    scheduledAt: string | null; startedAt: string | null; completedAt: string | null;
    totalRecords: number | null; recordsProcessed: number; progressPercent: number;
    errorMessage: string | null; metadata: any; triggeredBy: string;
}

interface Pagination { total: number; page: number; limit: number; totalPages: number }

interface Readiness {
    examId: number; examName: string; totalSubmissions: number;
    normalization: { ready: boolean; done: boolean; message: string; stats: any };
    ranks: { ready: boolean; done: boolean; message: string; stats: any };
    cutoffs: { ready: boolean; done: boolean; message: string; stats: any };
}

// ─── Queries ─────────────────────────────────────────────────────────────────

export function useJobs(params: { page: number; limit: number; status: string; type: string; search: string }) {
    return useQuery({
        queryKey: ["jobs", params],
        queryFn: async () => {
            const query = new URLSearchParams({
                page: params.page.toString(),
                limit: params.limit.toString(),
                status: params.status,
                type: params.type,
                search: params.search,
            });
            const res = await fetch(`/api/admin/jobs?${query}`);
            if (!res.ok) throw new Error("Failed to fetch jobs");
            return res.json() as Promise<{ jobs: Job[]; pagination: Pagination }>;
        },
        placeholderData: (previousData) => previousData, // Keep previous data while fetching new page
    });
}

export function useActiveJobs() {
    return useQuery({
        queryKey: ["activeJobs"],
        queryFn: async () => {
            const res = await fetch("/api/admin/jobs?status=running&limit=10");
            if (!res.ok) throw new Error("Failed to fetch active jobs");
            const data = await res.json();
            return (data.jobs || []) as Job[];
        },
        refetchInterval: 2000, // Poll every 2 seconds
        refetchIntervalInBackground: false, // Pause when tab is hidden
    });
}

export function useScheduledJobs() {
    return useQuery({
        queryKey: ["scheduledJobs"],
        queryFn: async () => {
            const res = await fetch("/api/admin/scheduled-jobs");
            if (!res.ok) throw new Error("Failed to fetch scheduled jobs");
            const data = await res.json();
            return (data.jobs || []) as any[];
        },
    });
}

export function useJobReadiness(examId: string) {
    return useQuery({
        queryKey: ["readiness", examId],
        queryFn: async () => {
            if (!examId) return null;
            const res = await fetch(`/api/admin/jobs/readiness?examId=${examId}`);
            if (!res.ok) throw new Error("Failed to fetch readiness");
            return res.json() as Promise<Readiness>;
        },
        enabled: !!examId,
    });
}

// ─── Mutations ───────────────────────────────────────────────────────────────

export function useTriggerJob() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ type, examId }: { type: string; examId?: number }) => {
            const body = examId ? { type, examId } : { type };
            const res = await fetch("/api/admin/jobs", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            if (!res.ok) throw new Error("Failed to trigger job");
            return res.json();
        },
        onSuccess: (_, variables) => {
            // Invalidate active jobs immediately so it shows up
            queryClient.invalidateQueries({ queryKey: ["activeJobs"] });
            queryClient.invalidateQueries({ queryKey: ["jobs"] });
            if (variables.examId) {
                queryClient.invalidateQueries({ queryKey: ["readiness", variables.examId.toString()] });
            }
        },
    });
}

export function useJobAction() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, action }: { id: number; action: "retry" | "cancel" }) => {
            const res = await fetch(`/api/admin/jobs/${id}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action }),
            });
            if (!res.ok) throw new Error(`${action} failed`);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["activeJobs"] });
            queryClient.invalidateQueries({ queryKey: ["jobs"] });
        },
    });
}

export function useScheduleAction() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (action: { type: "create" | "delete" | "toggle"; id?: number; data?: any }) => {
            let res;
            if (action.type === "create") {
                res = await fetch("/api/admin/scheduled-jobs", {
                    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(action.data),
                });
            } else if (action.type === "delete") {
                res = await fetch(`/api/admin/scheduled-jobs?id=${action.id}`, { method: "DELETE" });
            } else {
                res = await fetch(`/api/admin/scheduled-jobs?id=${action.id}`, {
                    method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(action.data),
                });
            }
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Action failed");
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["scheduledJobs"] });
        },
    });
}
