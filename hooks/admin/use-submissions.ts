"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Submission {
    id: number;
    rollNumber: string;
    name: string;
    examName: string;
    shiftCode: string;
    category: string;
    gender: string;
    rawScore: number;
    normalizedScore: number | null;
    overallRank: number | null;
    categoryRank: number | null;
    accuracy: number | null;
    totalCandidates: number;
    createdAt: string;
    examTotal: number;
}

export interface SubmissionFilters {
    search: string;
    examId: string;
    shiftId: string;
    category: string[];
    gender: string;
    scoreMin: string;
    scoreMax: string;
    rankMin: string;
    rankMax: string;
    dateFrom: string;
    dateTo: string;
    source: string;
}

export interface Pagination {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

// ─── Fetchers ───────────────────────────────────────────────────────────────

function buildSubmissionParams(filters: SubmissionFilters, sorting: { field: string; order: string }, page: number, limit: number) {
    const params = new URLSearchParams({ page: page.toString(), limit: limit.toString(), sort: sorting.field, order: sorting.order });
    if (filters.search) params.append("search", filters.search);
    if (filters.examId !== "all") params.append("examId", filters.examId);
    if (filters.shiftId !== "all") params.append("shiftId", filters.shiftId);
    if (filters.category.length > 0) params.append("category", filters.category.join(","));
    if (filters.gender !== "all") params.append("gender", filters.gender);
    if (filters.scoreMin) params.append("scoreMin", filters.scoreMin);
    if (filters.scoreMax) params.append("scoreMax", filters.scoreMax);
    if (filters.rankMin) params.append("rankMin", filters.rankMin);
    if (filters.rankMax) params.append("rankMax", filters.rankMax);
    if (filters.dateFrom) params.append("dateFrom", filters.dateFrom);
    if (filters.dateTo) params.append("dateTo", filters.dateTo);
    if (filters.source !== "all") params.append("source", filters.source);
    return params;
}

// ─── Hooks ──────────────────────────────────────────────────────────────────

/** Paginated submission list with filters. */
export function useSubmissions(filters: SubmissionFilters, sorting: { field: string; order: string }, page: number, limit = 20) {
    return useQuery({
        queryKey: ["admin", "submissions", { filters, sorting, page, limit }],
        queryFn: async () => {
            const params = buildSubmissionParams(filters, sorting, page, limit);
            const res = await fetch(`/api/admin/submissions?${params}`);
            if (!res.ok) throw new Error("Failed to fetch submissions");
            return res.json() as Promise<{ submissions: Submission[]; pagination: Pagination }>;
        },
    });
}

/** Lightweight exam list for dropdowns. Shared cache key across all pages. */
export function useExamOptions() {
    return useQuery({
        queryKey: ["admin", "exam-options"],
        queryFn: async () => {
            const res = await fetch("/api/admin/exams?isActive=true&limit=1000");
            if (!res.ok) throw new Error("Failed to fetch exam options");
            const data = await res.json();
            return (data.exams || []).map((e: any) => ({ id: e.id, name: e.name, tier: e.tier, year: e.year })) as { id: number; name: string; tier?: string; year?: number }[];
        },
        staleTime: 5 * 60_000, // 5 min — exams rarely change
    });
}

/** Shift options for a specific exam. Enabled only when examId is set. */
export function useShiftOptions(examId: string) {
    return useQuery({
        queryKey: ["admin", "shift-options", examId],
        queryFn: async () => {
            const res = await fetch(`/api/admin/shifts?examId=${examId}&limit=1000`);
            if (!res.ok) throw new Error("Failed to fetch shift options");
            const data = await res.json();
            return (data.shifts || []).map((s: any) => ({ id: s.id, shiftCode: s.shiftCode })) as { id: number; shiftCode: string }[];
        },
        enabled: !!examId && examId !== "all",
    });
}

/** Delete a single submission. */
export function useDeleteSubmission() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (id: number) => {
            const res = await fetch(`/api/admin/submissions/${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Delete failed");
            return res.json();
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["admin", "submissions"] });
        },
    });
}

/** Bulk delete submissions. */
export function useBulkDeleteSubmissions() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (ids: number[]) => {
            const res = await fetch("/api/admin/submissions/bulk-delete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids }),
            });
            if (!res.ok) throw new Error("Bulk delete failed");
            return res.json();
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["admin", "submissions"] });
        },
    });
}
