"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// ─── Interfaces ─────────────────────────────────────────────────────────────

export interface AuditLog {
    id: number;
    adminUser: { id: number; name: string; email: string } | null;
    entity: string;
    entityId: number | null;
    action: string;
    oldValues: Record<string, unknown> | null;
    newValues: Record<string, unknown> | null;
    ip: string | null;
    userAgent: string | null;
    timestamp: string;
}

export interface AuditLogFilters {
    adminUserId: string;
    entity: string;
    action: string;
    startDate: string;
    endDate: string;
}

export interface LeaderboardEntry {
    id: number;
    displayRank: number;
    name: string;
    rollNumber: string;
    category: string;
    gender: string;
    state: string | null;
    rawScore: number;
    normalizedScore: number | null;
    accuracy: number | null;
    overallPercentile: number | null;
    totalAttempted: number;
    totalCorrect: number;
    totalWrong: number;
    overallRank: number;
}

export interface LeaderboardStats {
    total: number;
    avgRawScore: number | string;
    avgNormScore: number | string | null;
    avgAccuracy: number | string | null;
    maxRawScore: number;
    minRawScore: number;
}

export interface LeaderboardFilters {
    examId: string;
    category: string;
    sort: string;
}

export interface Settings {
    orgName?: string;
    supportEmail?: string;
    maintenanceMode?: boolean;
    debugLogging?: boolean;
    // Exam defaults
    defaultPositive?: number;
    defaultNegative?: number;
    allowMultipleSubmissions?: boolean;
    enableDuplicateDetection?: boolean;
    autoCalculateRanks?: boolean;
    // Data pipeline
    maxRetries?: number;
    requestTimeout?: number;
    enableMockParser?: boolean;
    rankingMethod?: string;
    percentileMethod?: string;
    [key: string]: any;
}

// ─── Hooks ──────────────────────────────────────────────────────────────────

/** Audit Logs */
export function useAuditLogs(filters: AuditLogFilters, page: number, limit = 50) {
    return useQuery({
        queryKey: ["admin", "audit-logs", { filters, page, limit }],
        queryFn: async () => {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
                ...filters,
            });
            const res = await fetch(`/api/admin/audit-logs?${params}`);
            if (!res.ok) throw new Error("Failed to fetch audit logs");
            const data = await res.json();
            return {
                logs: (data.logs || []) as AuditLog[],
                pagination: data.pagination || {},
            };
        },
        placeholderData: (prev) => prev,
    });
}

/** Leaderboard */
export function useLeaderboard(filters: LeaderboardFilters, page: number, limit = 50) {
    return useQuery({
        queryKey: ["admin", "leaderboard", { filters, page, limit }],
        queryFn: async () => {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
                ...filters,
            });
            // The API is at /api/leaderboard (not /admin/...) based on existing code
            const res = await fetch(`/api/leaderboard?${params}`);
            if (!res.ok) throw new Error("Failed to fetch leaderboard");
            return res.json(); // Returns { leaderboard, pagination, stats, exams, currentExamId, currentExamName }
        },
        placeholderData: (prev) => prev,
    });
}

/** Settings - Get */
export function useSettings() {
    return useQuery({
        queryKey: ["admin", "settings"],
        queryFn: async () => {
            const res = await fetch("/api/admin/settings");
            if (!res.ok) throw new Error("Failed to fetch settings");
            const data = await res.json();
            return (data.settings || {}) as Settings;
        },
    });
}

/** Settings - Update */
export function useUpdateSettings() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (settings: Settings) => {
            const res = await fetch("/api/admin/settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ settings }),
            });
            if (!res.ok) throw new Error("Failed to update settings");
            return res.json();
        },
        onSuccess: (data) => {
            qc.setQueryData(["admin", "settings"], data.settings || data); // Optimistically update or set from response
            qc.invalidateQueries({ queryKey: ["admin", "settings"] });
        },
    });
}
