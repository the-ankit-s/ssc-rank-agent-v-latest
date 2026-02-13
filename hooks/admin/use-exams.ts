"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Exam {
    id: number;
    name: string;
    slug: string;
    agency: string;
    year: number;
    tier?: string;
    status: string;
    isActive: boolean;
    totalSubmissions?: number;
    totalShifts?: number;
    analysisPhase?: string;
    updatedAt?: string;
    createdAt?: string;
}

export interface ExamDetail extends Exam {
    totalMarks: number;
    totalQuestions: number;
    duration: number;
    defaultPositive: number;
    defaultNegative: number;
    hasNormalization: boolean;
    hasSectionalTiming: boolean;
    isFeatured: boolean;
    sectionConfig: Record<string, any>;
    examStartDate: string | null;
    examEndDate: string | null;
    answerKeyUrl: string | null;
    officialWebsite: string | null;
    normalizationMethod?: string;
}

export interface Pagination {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface ArchiveInfo {
    exists: boolean;
    fileSizeMB?: string;
    submissionCount?: number;
    archivedAt?: string;
}

interface ExamFilters {
    search: string;
    agency: string;
    year: string;
    status: string;
    isActive: string;
}

interface Sorting {
    field: string;
    order: string;
}

// ─── Fetchers ───────────────────────────────────────────────────────────────

async function fetchExams(filters: ExamFilters, sorting: Sorting, page: number, limit: number) {
    const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sort: sorting.field,
        order: sorting.order,
        ...filters,
    });
    const res = await fetch(`/api/admin/exams?${params}`);
    if (!res.ok) throw new Error("Failed to fetch exams");
    return res.json() as Promise<{ exams: Exam[]; pagination: Pagination }>;
}

async function fetchExamStats() {
    const res = await fetch("/api/admin/exams?limit=200&isActive=all");
    if (!res.ok) throw new Error("Failed to fetch exam stats");
    const data = await res.json();
    const all: Exam[] = data.exams || [];
    return {
        total: all.length,
        active: all.filter((e) => e.isActive && e.status !== "closed").length,
        archived: all.filter((e) => !e.isActive || e.status === "closed").length,
        totalSubs: all.reduce((s, e) => s + (e.totalSubmissions || 0), 0),
    };
}

async function fetchExam(id: string) {
    const res = await fetch(`/api/admin/exams/${id}`);
    if (!res.ok) throw new Error("Failed to fetch exam");
    return res.json() as Promise<{ exam: ExamDetail; stats: { shifts: number; submissions: number } }>;
}

async function fetchArchiveStatus(id: number) {
    const res = await fetch(`/api/admin/exams/${id}/archive`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.archive as ArchiveInfo | null;
}

// ─── Hooks ──────────────────────────────────────────────────────────────────

export function useExams(filters: ExamFilters, sorting: Sorting, page: number, limit = 10) {
    return useQuery({
        queryKey: ["admin", "exams", { filters, sorting, page, limit }],
        queryFn: () => fetchExams(filters, sorting, page, limit),
    });
}

export function useExamStats(enabled = true) {
    return useQuery({
        queryKey: ["admin", "exam-stats"],
        queryFn: fetchExamStats,
        enabled,
    });
}

export function useExam(id: string) {
    return useQuery({
        queryKey: ["admin", "exams", id],
        queryFn: () => fetchExam(id),
        enabled: !!id,
    });
}

export function useArchiveStatus(ids: number[]) {
    return useQuery({
        queryKey: ["admin", "archive-status", ids],
        queryFn: async () => {
            const entries = await Promise.all(ids.map(async (id) => [id, await fetchArchiveStatus(id)] as const));
            return Object.fromEntries(entries) as Record<number, ArchiveInfo | null>;
        },
        enabled: ids.length > 0,
    });
}

export function useArchiveExam() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (id: number) => {
            const res = await fetch(`/api/admin/exams/${id}/archive`, { method: "POST" });
            if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || "Archive failed"); }
            return res.json();
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["admin", "exams"] });
            qc.invalidateQueries({ queryKey: ["admin", "exam-stats"] });
            qc.invalidateQueries({ queryKey: ["admin", "archive-status"] });
        },
    });
}

export function useRestoreExam() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (id: number) => {
            const res = await fetch(`/api/admin/exams/${id}/archive/restore`, { method: "POST" });
            if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || "Restore failed"); }
            return res.json();
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["admin", "exams"] });
            qc.invalidateQueries({ queryKey: ["admin", "exam-stats"] });
            qc.invalidateQueries({ queryKey: ["admin", "archive-status"] });
        },
    });
}

export function useDeleteExam() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, force }: { id: number; force?: boolean }) => {
            const url = force ? `/api/admin/exams/${id}?force=true` : `/api/admin/exams/${id}`;
            const res = await fetch(url, { method: "DELETE" });
            if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || "Delete failed"); }
            return res.json();
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["admin", "exams"] });
            qc.invalidateQueries({ queryKey: ["admin", "exam-stats"] });
        },
    });
}

export function useDuplicateExam() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (id: number) => {
            const res = await fetch(`/api/admin/exams/${id}/duplicate`, { method: "POST" });
            if (!res.ok) throw new Error("Duplicate failed");
            return res.json();
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["admin", "exams"] });
            qc.invalidateQueries({ queryKey: ["admin", "exam-stats"] });
        },
    });
}

export function useBulkExamAction() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ ids, action }: { ids: number[]; action: "delete" | "activate" | "deactivate" }) => {
            const res = await fetch("/api/admin/exams/bulk", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids, action }),
            });
            if (!res.ok) throw new Error("Bulk action failed");
            return res.json();
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["admin", "exams"] });
            qc.invalidateQueries({ queryKey: ["admin", "exam-stats"] });
        },
    });
}

export function useUpdateExam() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Record<string, any> }) => {
            const res = await fetch(`/api/admin/exams/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || "Update failed"); }
            return res.json();
        },
        onSuccess: (_d, vars) => {
            qc.invalidateQueries({ queryKey: ["admin", "exams", vars.id] });
            qc.invalidateQueries({ queryKey: ["admin", "exams"] });
        },
    });
}
