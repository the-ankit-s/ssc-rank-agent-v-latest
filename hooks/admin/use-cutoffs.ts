"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Cutoff {
    id: number;
    examId: number;
    examName: string;
    examYear: number;
    category: string;
    postCode: string;
    postName: string;
    expectedCutoff: number;
    safeScore: number;
    minimumScore: number;
    previousYearCutoff: number | null;
    confidenceLevel: "low" | "medium" | "high" | null;
    isPublished: boolean;
    updatedAt: string;
}

export interface Pagination {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

interface CutoffFilters {
    search: string;
    examId: string;
    category: string;
    confidence: string;
}

// ─── Hooks ──────────────────────────────────────────────────────────────────

export function useCutoffs(filters: CutoffFilters, sorting: { field: string; order: string }, page: number, limit = 20) {
    return useQuery({
        queryKey: ["admin", "cutoffs", { filters, sorting, page, limit }],
        queryFn: async () => {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
                sort: sorting.field,
                order: sorting.order,
                ...filters,
            });
            const res = await fetch(`/api/admin/cutoffs?${params}`);
            if (!res.ok) throw new Error("Failed to fetch cutoffs");
            return res.json() as Promise<{ cutoffs: Cutoff[]; pagination: Pagination }>;
        },
    });
}

export function useDeleteCutoff() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (id: number) => {
            const res = await fetch(`/api/admin/cutoffs/${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Delete failed");
            return res.json();
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["admin", "cutoffs"] });
        },
    });
}

export function useBulkCutoffAction() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ ids, action }: { ids: number[]; action: "delete" | "confidence_low" | "confidence_medium" | "confidence_high" }) => {
            if (action === "delete") {
                const res = await fetch("/api/admin/cutoffs/bulk-delete", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ids }),
                });
                if (!res.ok) throw new Error("Bulk delete failed");
                return res.json();
            }
            const level = action.replace("confidence_", "");
            const res = await fetch("/api/admin/cutoffs/bulk-update", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids, data: { confidenceLevel: level } }),
            });
            if (!res.ok) throw new Error("Bulk update failed");
            return res.json();
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["admin", "cutoffs"] });
        },
    });
}

export function useImportCutoffs() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (formData: FormData) => {
            const res = await fetch("/api/admin/cutoffs/import", {
                method: "POST",
                body: formData,
            });
            if (!res.ok) throw new Error("Import failed");
            return res.json() as Promise<{ imported: number; errors: any[] }>;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["admin", "cutoffs"] });
        },
    });
}
