"use client";

import { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import {
    AlertTriangle, Search, RefreshCw, Download, CheckCircle,
    Eye, X, Clock, FileText, AlertOctagon, ChevronDown, Play, Pause, Radio,
    CheckCheck, Bell, BellOff, Copy, Layers, Hash
} from "lucide-react";
import {
    useLogs, useLogComponents, useErrors, useErrorDetail,
    useUpdateErrorStatus, useBulkErrorAction,
    LogEntry, ErrorGroup
} from "@/hooks/admin/use-logs";

/* ─── Badge Components ─── */
function LevelBadge({ level }: { level: string }) {
    const cfg: Record<string, { bg: string; dot: string }> = {
        DEBUG: { bg: "bg-gray-100 text-gray-600", dot: "bg-gray-400" },
        INFO: { bg: "bg-sky-50 text-sky-700", dot: "bg-sky-400" },
        WARN: { bg: "bg-amber-50 text-amber-700", dot: "bg-amber-400" },
        ERROR: { bg: "bg-red-50 text-red-700", dot: "bg-red-500" },
    };
    const c = cfg[level] || cfg.DEBUG;
    return (
        <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold tracking-wide", c.bg)}>
            <span className={cn("w-1.5 h-1.5 rounded-full", c.dot)} />
            {level}
        </span>
    );
}

function StatusBadge({ status }: { status: string }) {
    const cfg: Record<string, string> = {
        new: "bg-red-50 text-red-700 border-red-200",
        acknowledged: "bg-amber-50 text-amber-700 border-amber-200",
        resolved: "bg-emerald-50 text-emerald-700 border-emerald-200",
        ignored: "bg-gray-50 text-gray-500 border-gray-200",
    };
    return (
        <span className={cn("px-2 py-0.5 rounded-md text-[11px] font-semibold border", cfg[status] || cfg.new)}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
    );
}

function SeverityBadge({ severity }: { severity: string }) {
    const cfg: Record<string, { bg: string; icon: boolean }> = {
        critical: { bg: "bg-red-600 text-white", icon: true },
        high: { bg: "bg-orange-100 text-orange-800", icon: false },
        medium: { bg: "bg-blue-100 text-blue-800", icon: false },
        low: { bg: "bg-gray-100 text-gray-600", icon: false },
    };
    const c = cfg[severity] || cfg.medium;
    return (
        <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold", c.bg)}>
            {c.icon && <AlertOctagon className="w-3 h-3" />}
            {severity.toUpperCase()}
        </span>
    );
}

/* ─── Main Page ─── */
export default function SystemMonitoringPage() {
    const [tab, setTab] = useState<"logs" | "errors">("logs");

    /* ── Logs state ── */
    const [logsFilters, setLogsFilters] = useState({ level: "", component: "", search: "", startDate: "", endDate: "" });
    const [logSearchInput, setLogSearchInput] = useState("");
    const [isLive, setIsLive] = useState(false);
    const [expandedLog, setExpandedLog] = useState<number | null>(null);
    const [logsPage, setLogsPage] = useState(1);
    const logSearchTimer = useRef<NodeJS.Timeout | null>(null);

    /* ── Errors state ── */
    const [errorsFilters, setErrorsFilters] = useState({ status: "all", severity: "all", component: "", search: "" });
    const [errorSearchInput, setErrorSearchInput] = useState("");
    const [selectedErrorId, setSelectedErrorId] = useState<number | null>(null);
    const [errorsPage, setErrorsPage] = useState(1);
    const [selectedErrors, setSelectedErrors] = useState<Set<number>>(new Set());
    const errorSearchTimer = useRef<NodeJS.Timeout | null>(null);

    /* ── React Query Hooks ── */
    const { data: logsData, isLoading: logsLoading, refetch: refetchLogs } = useLogs(logsFilters, logsPage, isLive);
    const logs = logsData?.logs || [];
    const logsPagination = logsData?.pagination || { total: 0, page: 1, limit: 50, totalPages: 1 };

    const { data: componentsRaw } = useLogComponents();
    const components = componentsRaw || [];

    const { data: errorsData, isLoading: errorsLoading, refetch: refetchErrors } = useErrors(errorsFilters, errorsPage);
    const errors = errorsData?.data || [];
    const errorsPagination = errorsData?.meta || { total: 0, page: 1, limit: 20, totalPages: 1 };

    const { data: selectedError } = useErrorDetail(selectedErrorId);

    // Mutations
    const updateErrorStatus = useUpdateErrorStatus();
    const bulkErrorAction = useBulkErrorAction();

    /* ── Debounced search for logs ── */
    useEffect(() => {
        if (logSearchTimer.current) clearTimeout(logSearchTimer.current);
        logSearchTimer.current = setTimeout(() => {
            setLogsFilters(p => ({ ...p, search: logSearchInput }));
            setLogsPage(1);
        }, 500);
        return () => { if (logSearchTimer.current) clearTimeout(logSearchTimer.current); };
    }, [logSearchInput]);

    /* ── Debounced search for errors ── */
    useEffect(() => {
        if (errorSearchTimer.current) clearTimeout(errorSearchTimer.current);
        errorSearchTimer.current = setTimeout(() => {
            setErrorsFilters(p => ({ ...p, search: errorSearchInput }));
            setErrorsPage(1);
        }, 500);
        return () => { if (errorSearchTimer.current) clearTimeout(errorSearchTimer.current); };
    }, [errorSearchInput]);

    /* ── Derived Stats ── */
    // Note: These are now derived from the current page of data, consistent with previous implementation
    const errorStats = {
        total: errorsPagination.total || errors.length,
        active: errors.filter((e: ErrorGroup) => e.status === "new").length,
        critical: errors.filter((e: ErrorGroup) => e.severity === "critical").length,
        resolved: errors.filter((e: ErrorGroup) => e.status === "resolved").length,
    };

    /* ── Error actions ── */
    const handleUpdateErrorStatus = (id: number, status: string) => {
        updateErrorStatus.mutate({ id, status });
    };

    const handleBulkAction = (status: string) => {
        if (selectedErrors.size === 0) return;
        bulkErrorAction.mutate({ ids: Array.from(selectedErrors), status }, {
            onSuccess: () => setSelectedErrors(new Set()),
        });
    };

    const toggleSelectError = (id: number) => {
        setSelectedErrors(prev => {
            const n = new Set(prev);
            n.has(id) ? n.delete(id) : n.add(id);
            return n;
        });
    };

    const toggleSelectAll = () => {
        if (selectedErrors.size === errors.length) setSelectedErrors(new Set());
        else setSelectedErrors(new Set(errors.map(e => e.id)));
    };

    const handleExport = (fmt: "json" | "csv") => {
        const params = new URLSearchParams({
            level: logsFilters.level,
            component: logsFilters.component,
            search: logsFilters.search,
            startDate: logsFilters.startDate,
            endDate: logsFilters.endDate,
            format: fmt
        });
        window.open(`/api/admin/logs/export?${params}`, "_blank");
    };

    const copyErrorToClipboard = (err: ErrorGroup) => {
        const text = `[${err.severity.toUpperCase()}] ${err.message}\n\nComponent: ${err.component}\nOccurrences: ${err.occurrenceCount}\nFirst Seen: ${err.firstSeen}\nLast Seen: ${err.lastSeen}\n\n--- Stack Trace ---\n${err.stackTrace || "N/A"}`;
        navigator.clipboard.writeText(text);
    };

    const isLoading = tab === "logs" ? logsLoading : errorsLoading;

    return (
        <div className="space-y-5 max-w-[1600px] mx-auto pb-20">

            {/* ── Header ── */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">System Monitoring</h1>
                    <p className="text-gray-500 text-sm mt-1">Unified view of application logs, errors, and system health.</p>
                </div>
                <div className="flex items-center gap-2">
                    {tab === "logs" && (
                        <>
                            <button onClick={() => setIsLive(!isLive)}
                                className={cn("h-9 px-3 text-sm font-medium rounded-lg transition-all flex items-center gap-2 border",
                                    isLive ? "bg-red-50 text-red-700 border-red-200 hover:bg-red-100" : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                )}>
                                {isLive ? <><Pause className="w-3.5 h-3.5" /> Pause</> : <><Play className="w-3.5 h-3.5" /> Live</>}
                            </button>
                            <div className="w-px h-6 bg-gray-200" />
                            <button onClick={() => handleExport("csv")} className="h-9 px-3 bg-white border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50 flex items-center gap-1.5">
                                <Download className="w-3.5 h-3.5" /> CSV
                            </button>
                            <button onClick={() => handleExport("json")} className="h-9 px-3 bg-white border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50 flex items-center gap-1.5">
                                <Download className="w-3.5 h-3.5" /> JSON
                            </button>
                        </>
                    )}
                    <button onClick={() => tab === "logs" ? refetchLogs() : refetchErrors()}
                        className="h-9 w-9 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                        <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
                    </button>
                </div>
            </div>

            {/* ── Tab bar + Quick stats ── */}
            <div className="flex items-center gap-6 border-b border-gray-200">
                <button onClick={() => setTab("logs")}
                    className={cn("flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-colors",
                        tab === "logs" ? "border-gray-900 text-gray-900" : "border-transparent text-gray-500 hover:text-gray-700"
                    )}>
                    <FileText className="w-4 h-4" />
                    Logs
                    {isLive && <Radio className="w-3 h-3 text-red-500 animate-pulse" />}
                    <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-md font-mono">{logsPagination.total || "—"}</span>
                </button>
                <button onClick={() => setTab("errors")}
                    className={cn("flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-colors",
                        tab === "errors" ? "border-gray-900 text-gray-900" : "border-transparent text-gray-500 hover:text-gray-700"
                    )}>
                    <AlertTriangle className="w-4 h-4" />
                    Errors
                    {errorStats.active > 0 && (
                        <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded-full font-bold min-w-[20px] text-center">{errorStats.active}</span>
                    )}
                </button>
            </div>

            {/* ── Stats row (errors tab) ── */}
            {tab === "errors" && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                        { label: "Active", value: errorStats.active, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50" },
                        { label: "Total", value: errorStats.total, icon: Layers, color: "text-blue-600", bg: "bg-blue-50" },
                        { label: "Critical", value: errorStats.critical, icon: AlertOctagon, color: "text-orange-600", bg: "bg-orange-50" },
                        { label: "Resolved", value: errorStats.resolved, icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50" },
                    ].map((s) => (
                        <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
                            <div className={cn("p-2 rounded-lg", s.bg)}>
                                <s.icon className={cn("w-4 h-4", s.color)} />
                            </div>
                            <div>
                                <p className="text-[11px] text-gray-500 font-medium uppercase tracking-wider">{s.label}</p>
                                <p className="text-xl font-bold text-gray-900 leading-none mt-0.5">{s.value}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Filters ── */}
            <div className="bg-white rounded-xl border border-gray-100 p-3">
                {tab === "logs" ? (
                    <div className="flex flex-wrap gap-2 items-center">
                        <div className="flex items-center rounded-lg border border-gray-200 overflow-hidden">
                            {["", "DEBUG", "INFO", "WARN", "ERROR"].map((lv) => (
                                <button key={lv} onClick={() => { setLogsFilters(p => ({ ...p, level: lv })); setLogsPage(1); }}
                                    className={cn("px-3 py-1.5 text-[11px] font-semibold transition-colors border-r border-gray-200 last:border-r-0",
                                        logsFilters.level === lv ? "bg-gray-900 text-white" : "bg-white text-gray-600 hover:bg-gray-50"
                                    )}>
                                    {lv || "ALL"}
                                </button>
                            ))}
                        </div>
                        <select className="h-8 px-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-gray-300"
                            value={logsFilters.component} onChange={(e) => { setLogsFilters(p => ({ ...p, component: e.target.value })); setLogsPage(1); }}>
                            <option value="">All Components</option>
                            {components.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <div className="relative flex-1 min-w-[180px]">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                            <input type="text" placeholder="Search messages..."
                                className="w-full h-8 pl-8 pr-3 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-gray-300"
                                value={logSearchInput} onChange={(e) => setLogSearchInput(e.target.value)} />
                        </div>
                        <input type="datetime-local" className="h-8 px-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none"
                            value={logsFilters.startDate} onChange={(e) => setLogsFilters(p => ({ ...p, startDate: e.target.value }))} />
                        <span className="text-gray-400 text-xs">to</span>
                        <input type="datetime-local" className="h-8 px-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none"
                            value={logsFilters.endDate} onChange={(e) => setLogsFilters(p => ({ ...p, endDate: e.target.value }))} />
                    </div>
                ) : (
                    <div className="flex flex-wrap gap-2 items-center">
                        <div className="relative flex-1 min-w-[180px]">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                            <input type="text" placeholder="Search errors..."
                                className="w-full h-8 pl-8 pr-3 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-gray-300"
                                value={errorSearchInput} onChange={(e) => setErrorSearchInput(e.target.value)} />
                        </div>
                        {["all", "new", "acknowledged", "resolved"].map(s => (
                            <button key={s} onClick={() => { setErrorsFilters(p => ({ ...p, status: s })); setErrorsPage(1); }}
                                className={cn("px-3 py-1.5 text-[11px] font-semibold rounded-lg transition-colors border",
                                    errorsFilters.status === s ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                                )}>
                                {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
                            </button>
                        ))}
                        <select className="h-8 px-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none"
                            value={errorsFilters.severity} onChange={(e) => { setErrorsFilters(p => ({ ...p, severity: e.target.value })); setErrorsPage(1); }}>
                            <option value="all">All Severities</option>
                            <option value="critical">Critical</option>
                            <option value="high">High</option>
                            <option value="medium">Medium</option>
                            <option value="low">Low</option>
                        </select>
                    </div>
                )}
            </div>

            {/* ── Bulk actions bar (errors) ── */}
            {tab === "errors" && selectedErrors.size > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 flex items-center justify-between">
                    <span className="text-sm font-medium text-blue-700">
                        {selectedErrors.size} error{selectedErrors.size > 1 ? "s" : ""} selected
                    </span>
                    <div className="flex items-center gap-2">
                        <button onClick={() => handleBulkAction("acknowledged")} disabled={bulkErrorAction.isPending}
                            className="h-8 px-3 bg-amber-500 text-white text-xs font-medium rounded-lg hover:bg-amber-600 disabled:opacity-50 flex items-center gap-1.5">
                            <Bell className="w-3.5 h-3.5" /> Acknowledge
                        </button>
                        <button onClick={() => handleBulkAction("resolved")} disabled={bulkErrorAction.isPending}
                            className="h-8 px-3 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1.5">
                            <CheckCheck className="w-3.5 h-3.5" /> Resolve All
                        </button>
                        <button onClick={() => handleBulkAction("ignored")} disabled={bulkErrorAction.isPending}
                            className="h-8 px-3 bg-gray-600 text-white text-xs font-medium rounded-lg hover:bg-gray-700 disabled:opacity-50 flex items-center gap-1.5">
                            <BellOff className="w-3.5 h-3.5" /> Ignore
                        </button>
                        <button onClick={() => setSelectedErrors(new Set())} className="h-8 px-3 text-blue-700 text-xs font-medium hover:bg-blue-100 rounded-lg">
                            Clear
                        </button>
                    </div>
                </div>
            )}

            {/* ── Data table ── */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-gray-100">
                                {tab === "logs" ? (
                                    <>
                                        <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-44">Time</th>
                                        <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-20">Level</th>
                                        <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-32">Component</th>
                                        <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Message</th>
                                        <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-10"></th>
                                    </>
                                ) : (
                                    <>
                                        <th className="px-4 py-3 w-10">
                                            <input type="checkbox" className="rounded"
                                                checked={selectedErrors.size === errors.length && errors.length > 0}
                                                onChange={toggleSelectAll} />
                                        </th>
                                        <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Error</th>
                                        <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-28">Status</th>
                                        <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-24">Severity</th>
                                        <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-28">Component</th>
                                        <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-16 text-center">Count</th>
                                        <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-32">Last Seen</th>
                                        <th className="px-4 py-3 w-24"></th>
                                    </>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {isLoading ? (
                                <tr><td colSpan={tab === "logs" ? 5 : 8} className="py-16 text-center">
                                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-gray-300" />
                                </td></tr>
                            ) : tab === "logs" ? (
                                logs.length === 0 ? (
                                    <tr><td colSpan={5} className="py-16 text-center text-gray-400 text-sm">No logs matching your filters.</td></tr>
                                ) : logs.map((log: LogEntry) => (
                                    <tr key={log.id} className="group">
                                        <td colSpan={5} className="p-0">
                                            <div onClick={() => log.details && setExpandedLog(expandedLog === log.id ? null : log.id)}
                                                className={cn("flex items-center gap-0 px-4 py-2.5 transition-colors",
                                                    log.details ? "cursor-pointer hover:bg-gray-50" : "",
                                                    log.level === "ERROR" ? "bg-red-50/30" : ""
                                                )}>
                                                <span className="w-44 flex-shrink-0 text-xs text-gray-500 font-mono flex items-center gap-1.5">
                                                    <Clock className="w-3 h-3 text-gray-300" />
                                                    {format(new Date(log.timestamp), "MMM dd HH:mm:ss")}
                                                </span>
                                                <span className="w-20 flex-shrink-0"><LevelBadge level={log.level} /></span>
                                                <span className="w-32 flex-shrink-0 text-[11px] font-mono text-gray-500 truncate">{log.component}</span>
                                                <span className="flex-1 text-sm text-gray-800 truncate pr-4">
                                                    {log.action && <span className="text-purple-600 font-medium mr-1.5">{log.action}</span>}
                                                    {log.message}
                                                </span>
                                                {log.details && (
                                                    <ChevronDown className={cn("w-4 h-4 text-gray-300 flex-shrink-0 transition-transform", expandedLog === log.id && "rotate-180")} />
                                                )}
                                            </div>
                                            {expandedLog === log.id && log.details && (
                                                <div className="mx-4 mb-3 bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
                                                    <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-200 bg-gray-100">
                                                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Details</span>
                                                        <div className="flex items-center gap-2 text-[10px] text-gray-400">
                                                            {log.requestId && <span className="flex items-center gap-1"><Hash className="w-3 h-3" />{log.requestId}</span>}
                                                            {log.ip && <span>{log.ip}</span>}
                                                            {log.userId && <span>user: {log.userId}</span>}
                                                        </div>
                                                    </div>
                                                    <pre className="p-3 text-[11px] text-gray-700 whitespace-pre-wrap break-all font-mono leading-relaxed">
                                                        {JSON.stringify(log.details, null, 2)}
                                                    </pre>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                errors.length === 0 ? (
                                    <tr><td colSpan={8} className="py-16 text-center text-gray-400 text-sm">No errors found.</td></tr>
                                ) : errors.map((error: ErrorGroup) => (
                                    <tr key={error.id} className={cn("group hover:bg-gray-50/50 transition-colors", selectedErrors.has(error.id) && "bg-blue-50/50")}>
                                        <td className="px-4 py-3">
                                            <input type="checkbox" className="rounded" checked={selectedErrors.has(error.id)}
                                                onChange={() => toggleSelectError(error.id)} />
                                        </td>
                                        <td className="px-4 py-3">
                                            <p className="text-sm font-medium text-gray-900 truncate max-w-sm" title={error.message}>{error.message}</p>
                                            <p className="text-[10px] text-gray-400 font-mono mt-0.5">#{error.id.toString().padStart(6, '0')}</p>
                                        </td>
                                        <td className="px-4 py-3"><StatusBadge status={error.status} /></td>
                                        <td className="px-4 py-3"><SeverityBadge severity={error.severity} /></td>
                                        <td className="px-4 py-3">
                                            <span className="text-[11px] font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">{error.component}</span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="text-sm font-bold text-gray-700">{error.occurrenceCount}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-xs text-gray-500">
                                                {error.lastSeen ? formatDistanceToNow(new Date(error.lastSeen), { addSuffix: true }) : "-"}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {error.status === "new" && (
                                                    <button onClick={() => handleUpdateErrorStatus(error.id, "acknowledged")} title="Acknowledge"
                                                        className="p-1 text-amber-600 hover:bg-amber-50 rounded"><Bell className="w-3.5 h-3.5" /></button>
                                                )}
                                                {error.status !== "resolved" && (
                                                    <button onClick={() => handleUpdateErrorStatus(error.id, "resolved")} title="Resolve"
                                                        className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"><CheckCircle className="w-3.5 h-3.5" /></button>
                                                )}
                                                <button onClick={() => setSelectedErrorId(error.id)} title="Details"
                                                    className="p-1 text-blue-600 hover:bg-blue-50 rounded"><Eye className="w-3.5 h-3.5" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {((tab === "logs" && (logsPagination.totalPages || 0) > 1) || (tab === "errors" && (errorsPagination.totalPages || 0) > 1)) && (
                    <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50/30">
                        <p className="text-xs text-gray-500 font-medium">
                            Page {tab === "logs" ? logsPagination.page : errorsPagination.page} of{" "}
                            {tab === "logs" ? logsPagination.totalPages : errorsPagination.totalPages}
                        </p>
                        <div className="flex gap-1.5">
                            <button disabled={tab === "logs" ? logsPage <= 1 : errorsPage <= 1}
                                onClick={() => tab === "logs" ? setLogsPage(p => p - 1) : setErrorsPage(p => p - 1)}
                                className="h-7 px-3 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 font-medium">
                                Previous
                            </button>
                            <button disabled={tab === "logs" ? logsPage >= logsPagination.totalPages : errorsPage >= errorsPagination.totalPages}
                                onClick={() => tab === "logs" ? setLogsPage(p => p + 1) : setErrorsPage(p => p + 1)}
                                className="h-7 px-3 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 font-medium">
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Error Detail Drawer ── */}
            {selectedError && (
                <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm" onClick={() => setSelectedErrorId(null)}>
                    <div className="bg-white w-full max-w-2xl h-full overflow-hidden shadow-2xl flex flex-col animate-in slide-in-from-right duration-200"
                        onClick={(e) => e.stopPropagation()}>

                        {/* Drawer Header */}
                        <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex-shrink-0">
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <StatusBadge status={selectedError.status} />
                                        <SeverityBadge severity={selectedError.severity} />
                                        <span className="text-[10px] text-gray-400 font-mono">#{selectedError.id}</span>
                                    </div>
                                    <h2 className="text-lg font-bold text-gray-900 leading-snug line-clamp-2">{selectedError.message}</h2>
                                </div>
                                <button onClick={() => setSelectedErrorId(null)}
                                    className="p-1.5 text-gray-400 hover:text-gray-900 rounded-lg hover:bg-gray-200/50 flex-shrink-0 ml-4">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Drawer Content */}
                        <div className="flex-1 overflow-y-auto p-5 space-y-5">

                            {/* Quick actions */}
                            <div className="flex flex-wrap gap-2">
                                {selectedError.status === "new" && (
                                    <button onClick={() => handleUpdateErrorStatus(selectedError.id, "acknowledged")}
                                        className="h-8 px-3 bg-amber-500 text-white text-xs font-medium rounded-lg hover:bg-amber-600 flex items-center gap-1.5">
                                        <Bell className="w-3.5 h-3.5" /> Acknowledge
                                    </button>
                                )}
                                {selectedError.status !== "resolved" && (
                                    <button onClick={() => handleUpdateErrorStatus(selectedError.id, "resolved")}
                                        className="h-8 px-3 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 flex items-center gap-1.5">
                                        <CheckCircle className="w-3.5 h-3.5" /> Resolve
                                    </button>
                                )}
                                <button onClick={() => handleUpdateErrorStatus(selectedError.id, "ignored")}
                                    className="h-8 px-3 bg-gray-100 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-200 flex items-center gap-1.5">
                                    <BellOff className="w-3.5 h-3.5" /> Mute
                                </button>
                                <button onClick={() => copyErrorToClipboard(selectedError)}
                                    className="h-8 px-3 bg-white border border-gray-200 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-50 flex items-center gap-1.5">
                                    <Copy className="w-3.5 h-3.5" /> Copy
                                </button>
                            </div>

                            {/* Context */}
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { label: "Component", value: selectedError.component, mono: true },
                                    { label: "Occurrences", value: selectedError.occurrenceCount.toLocaleString(), bold: true },
                                    { label: "First Seen", value: selectedError.firstSeen ? format(new Date(selectedError.firstSeen), "PP p") : "-" },
                                    { label: "Last Seen", value: selectedError.lastSeen ? format(new Date(selectedError.lastSeen), "PP p") : "-" },
                                ].map(item => (
                                    <div key={item.label} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                                        <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">{item.label}</p>
                                        <p className={cn("text-sm text-gray-900 mt-0.5", (item as any).mono && "font-mono", (item as any).bold && "font-bold text-lg")}>{item.value}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Stack Trace */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Stack Trace</h3>
                                    {selectedError.stackTrace && (
                                        <button onClick={() => navigator.clipboard.writeText(selectedError.stackTrace || "")}
                                            className="text-[10px] text-gray-400 hover:text-gray-600 flex items-center gap-1">
                                            <Copy className="w-3 h-3" /> Copy
                                        </button>
                                    )}
                                </div>
                                <div className="bg-slate-900 text-slate-300 p-4 rounded-xl font-mono text-[11px] overflow-x-auto leading-relaxed max-h-[300px] overflow-y-auto border border-slate-700">
                                    {selectedError.stackTrace || "No stack trace available."}
                                </div>
                            </div>

                            {/* Recent occurrences */}
                            {selectedError.instances && selectedError.instances.length > 0 && (
                                <div>
                                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Recent Occurrences</h3>
                                    <div className="space-y-1.5">
                                        {selectedError.instances.slice(0, 10).map((inst: any, i: number) => (
                                            <div key={i} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg border border-gray-100 text-xs">
                                                <span className="text-gray-600 font-mono">{inst.ip || "Unknown"}</span>
                                                <span className="text-gray-400">
                                                    {inst.timestamp ? format(new Date(inst.timestamp), "MMM d, HH:mm:ss") : "-"}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Metadata */}
                            {selectedError.metadata && Object.keys(selectedError.metadata).length > 0 && (
                                <div>
                                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Metadata</h3>
                                    <pre className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-[11px] text-gray-700 font-mono whitespace-pre-wrap break-all max-h-[200px] overflow-y-auto">
                                        {JSON.stringify(selectedError.metadata, null, 2)}
                                    </pre>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
