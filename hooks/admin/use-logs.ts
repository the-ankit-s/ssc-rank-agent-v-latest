"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface LogEntry {
    id: number;
    timestamp: string;
    level: "INFO" | "WARN" | "ERROR" | "DEBUG";
    component: string;
    action: string | null;
    message: string;
    details: any;
    userId: string | null;
    ip: string | null;
    requestId: string | null;
}

export interface ErrorGroup {
    id: number;
    message: string;
    component: string;
    status: "new" | "acknowledged" | "resolved" | "ignored";
    severity: "critical" | "high" | "medium" | "low";
    firstSeen: string;
    lastSeen: string;
    occurrenceCount: number;
    stackTrace?: string;
    metadata?: any;
    instances?: any[];
}

// ─── Hooks ──────────────────────────────────────────────────────────────────

/** Paginated log entries with live polling toggle. */
export function useLogs(
    filters: { level: string; component: string; search: string; startDate: string; endDate: string },
    page: number,
    isLive: boolean,
) {
    return useQuery({
        queryKey: ["admin", "logs", { filters, page }],
        queryFn: async () => {
            const params = new URLSearchParams({ page: page.toString(), limit: "50", ...filters });
            const res = await fetch(`/api/admin/logs?${params}`);
            if (!res.ok) throw new Error("Failed to fetch logs");
            return res.json() as Promise<{ logs: LogEntry[]; pagination: any }>;
        },
        refetchInterval: isLive ? 3000 : false,
    });
}

/** Distinct component names for dropdown filter. */
export function useLogComponents() {
    return useQuery({
        queryKey: ["admin", "log-components"],
        queryFn: async () => {
            const res = await fetch("/api/admin/logs/components");
            if (!res.ok) throw new Error("Failed to fetch components");
            const data = await res.json();
            return (data.components || []) as string[];
        },
        staleTime: 5 * 60_000,
    });
}

/** Paginated error groups. */
export function useErrors(
    filters: { status: string; severity: string; component: string; search: string },
    page: number,
) {
    return useQuery({
        queryKey: ["admin", "errors", { filters, page }],
        queryFn: async () => {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: "20",
                status: filters.status,
                severity: filters.severity,
                component: filters.component,
                search: filters.search,
            });
            const res = await fetch(`/api/admin/errors?${params}`);
            if (!res.ok) throw new Error("Failed to fetch errors");
            return res.json() as Promise<{ data: ErrorGroup[]; meta: any }>;
        },
    });
}

/** Single error detail with instances. */
export function useErrorDetail(id: number | null) {
    return useQuery({
        queryKey: ["admin", "errors", id],
        queryFn: async () => {
            const res = await fetch(`/api/admin/errors/${id}`);
            if (!res.ok) throw new Error("Failed to fetch error detail");
            return res.json() as Promise<ErrorGroup>;
        },
        enabled: !!id,
    });
}

/** Update error status (acknowledge, resolve, ignore). */
export function useUpdateErrorStatus() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, status }: { id: number; status: string }) => {
            const res = await fetch(`/api/admin/errors/${id}`, {
                method: "PATCH",
                body: JSON.stringify({ status }),
            });
            if (!res.ok) throw new Error("Update failed");
            return res.json();
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["admin", "errors"] });
        },
    });
}

/** Bulk update error statuses. */
export function useBulkErrorAction() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ ids, status }: { ids: number[]; status: string }) => {
            await Promise.all(
                ids.map((id) =>
                    fetch(`/api/admin/errors/${id}`, {
                        method: "PATCH",
                        body: JSON.stringify({ status }),
                    }),
                ),
            );
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["admin", "errors"] });
        },
    });
}
