"use client";

import { useQuery } from "@tanstack/react-query";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Shift {
    id: number;
    examId: number;
    shiftCode: string;
    date: string;
    shiftNumber: number;
    timeSlot: string;
    startTime: string;
    endTime: string;
    examName: string;
    totalMarks: number | null;
    candidateCount: number;
    avgScore: number;
    maxScore: number;
    avgAccuracy: number;
    meanScore: number | null;
    stdDev: number | null;
    difficultyLabel: string | null;
    difficultyIndex: number | null;
    normalizationFactor: number | null;
    sectionStats: Record<string, { avgScore: number; maxScore: number; avgAccuracy: number }> | null;
    statsUpdatedAt: string | null;
    // Alternate field names returned by some API responses
    avgRawScore?: number | null;
    medianRawScore?: number | null;
    maxRawScore?: number | null;
    minRawScore?: number | null;
}

export interface ShiftSummary {
    totalShifts: number;
    totalCandidates: number;
    examAvgScore: number | null;
    scoreRange: { min: number | null; max: number | null };
    avgStdDev: number | null;
    normFactorRange: { min: number | null; max: number | null };
    difficultyDistribution: { easy: number; moderate: number; hard: number };
    totalMarks: number | null;
}

export interface Pagination {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

/** Paginated shift list with summary for a given exam. Disabled when no exam is selected. */
export function useShifts(examId: string, sorting: { field: string; order: string }, page: number, limit = 50) {
    return useQuery({
        queryKey: ["admin", "shifts", { examId, sorting, page, limit }],
        queryFn: async () => {
            const params = new URLSearchParams({
                examId,
                page: page.toString(),
                limit: limit.toString(),
                sort: sorting.field,
                order: sorting.order,
            });
            const res = await fetch(`/api/admin/shifts?${params}`);
            if (!res.ok) throw new Error("Failed to fetch shifts");
            return res.json() as Promise<{ shifts: Shift[]; summary: ShiftSummary | null; pagination: Pagination }>;
        },
        enabled: !!examId,
    });
}
