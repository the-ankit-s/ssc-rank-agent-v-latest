"use client";

import { useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
    AlertTriangle, CheckCircle, XCircle, Clock, Filter, Search, Eye,
    MoreVertical, ExternalLink, RefreshCw, AlertOctagon, Activity, ChevronRight, X
} from "lucide-react";
import { format } from "date-fns";

// Types
interface ErrorGroup {
    id: number;
    message: string;
    component: string;
    status: "new" | "acknowledged" | "resolved" | "ignored";
    severity: "critical" | "high" | "medium" | "low";
    firstSeen: string;
    lastSeen: string;
    occurrenceCount: number;
    metadata?: any;
}

interface ErrorDetail extends ErrorGroup {
    instances: any[];
    stackTrace?: string;
}

// Components
function StatCard({ title, value, icon: Icon, color, trend }: any) {
    return (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-start justify-between">
            <div>
                <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
                <div className="text-2xl font-bold text-gray-900">{value}</div>
                {trend && <div className="text-xs text-green-600 font-medium mt-1">{trend}</div>}
            </div>
            <div className={cn("p-2 rounded-lg", color)}>
                <Icon className="w-5 h-5 text-white" />
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        new: "bg-red-50 text-red-700 border-red-100",
        acknowledged: "bg-yellow-50 text-yellow-700 border-yellow-100",
        resolved: "bg-green-50 text-green-700 border-green-100",
        ignored: "bg-gray-50 text-gray-600 border-gray-100",
    };
    return (
        <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-medium border", styles[status] || styles.new)}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
    );
}

function SeverityBadge({ severity }: { severity: string }) {
    const styles: Record<string, string> = {
        critical: "bg-red-100 text-red-800",
        high: "bg-orange-100 text-orange-800",
        medium: "bg-blue-100 text-blue-800",
        low: "bg-gray-100 text-gray-800",
    };
    return (
        <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold", styles[severity])}>
            {severity === "critical" && <AlertOctagon className="w-3 h-3" />}
            {severity.toUpperCase()}
        </span>
    );
}

export default function ErrorsPage() {
    const [data, setData] = useState<ErrorGroup[]>([]);
    const [stats, setStats] = useState({ total: 0, active: 0, critical: 0, resolved: 0 });
    const [loading, setLoading] = useState(true);
    const [selectedError, setSelectedError] = useState<ErrorDetail | null>(null);
    const [filters, setFilters] = useState({ status: "all", severity: "all", search: "" });
    const [page, setPage] = useState(1);
    const [meta, setMeta] = useState<any>({});

    const fetchErrors = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: "20",
                status: filters.status,
                severity: filters.severity,
                search: filters.search,
            });
            const res = await fetch(`/api/admin/errors?${params}`);
            const json = await res.json();
            setData(json.data || []);
            setMeta(json.meta || {});

            // Simple stats calculation from current page (ideally backend should provide summary stats)
            // For now, let's just count from data or rely on backend meta if enhanced later
            const active = (json.data || []).filter((e: any) => e.status === "new").length;
            setStats(prev => ({ ...prev, active })); // Partial update
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [page, filters]);

    useEffect(() => { fetchErrors(); }, [fetchErrors]);

    const handleFetchDetail = async (id: number) => {
        try {
            const res = await fetch(`/api/admin/errors/${id}`);
            const json = await res.json();
            setSelectedError(json);
        } catch (err) {
            console.error(err);
        }
    };

    const handleUpdateStatus = async (id: number, status: string) => {
        try {
            await fetch(`/api/admin/errors/${id}`, {
                method: "PATCH",
                body: JSON.stringify({ status }),
            });
            fetchErrors();
            if (selectedError?.id === id) {
                setSelectedError(prev => prev ? { ...prev, status: status as any } : null);
            }
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Error Monitoring</h1>
                    <p className="text-gray-500 mt-1">Track and resolve application exceptions.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={fetchErrors} className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                        <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard title="Active Errors" value={stats.active} icon={AlertTriangle} color="bg-red-500" />
                <StatCard title="Total (Page)" value={data.length} icon={Activity} color="bg-blue-500" />
                <StatCard title="Critical" value={data.filter(d => d.severity === "critical").length} icon={AlertOctagon} color="bg-orange-500" />
                <StatCard title="Resolved" value={data.filter(d => d.status === "resolved").length} icon={CheckCircle} color="bg-green-500" />
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-4 items-center justify-between">
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search errors..."
                            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            value={filters.search}
                            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                        />
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <select
                        className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none"
                        value={filters.status}
                        onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                    >
                        <option value="all">All Status</option>
                        <option value="new">New</option>
                        <option value="acknowledged">Acknowledged</option>
                        <option value="resolved">Resolved</option>
                        <option value="ignored">Ignored</option>
                    </select>
                    <select
                        className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none"
                        value={filters.severity}
                        onChange={(e) => setFilters(prev => ({ ...prev, severity: e.target.value }))}
                    >
                        <option value="all">All Severities</option>
                        <option value="critical">Critical</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                    </select>
                </div>
            </div>

            {/* Error Table */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                <th className="px-6 py-4">Error Message</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Severity</th>
                                <th className="px-6 py-4">Component</th>
                                <th className="px-6 py-4 text-center">Count</th>
                                <th className="px-6 py-4">Last Seen</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {data.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500 text-sm">
                                        No errors found matching your attributes.
                                    </td>
                                </tr>
                            ) : (
                                data.map((error) => (
                                    <tr key={error.id} className="hover:bg-gray-50/50 group transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="max-w-md">
                                                <p className="text-sm font-medium text-gray-900 truncate" title={error.message}>{error.message}</p>
                                                <p className="text-xs text-gray-500 font-mono mt-0.5 truncate">{error.id.toString().padStart(6, '0')}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <StatusBadge status={error.status} />
                                        </td>
                                        <td className="px-6 py-4">
                                            <SeverityBadge severity={error.severity} />
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-600">{error.component}</span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="text-sm font-semibold text-gray-700">{error.occurrenceCount}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-600 flex items-center gap-1.5">
                                                <Clock className="w-3.5 h-3.5 text-gray-400" />
                                                {error.lastSeen ? format(new Date(error.lastSeen), "MMM d, HH:mm") : "-"}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {error.status !== "resolved" && (
                                                    <button
                                                        onClick={() => handleUpdateStatus(error.id, "resolved")}
                                                        className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                                                        title="Resolve"
                                                    >
                                                        <CheckCircle className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleFetchDetail(error.id)}
                                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                                                    title="View Details"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {/* Pagination */}
                <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                    <p className="text-sm text-gray-500">
                        Page {meta.page} of {meta.totalPages || 1}
                    </p>
                    <div className="flex gap-2">
                        <button
                            disabled={page <= 1}
                            onClick={() => setPage(p => p - 1)}
                            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-50 transition-colors"
                        >
                            Previous
                        </button>
                        <button
                            disabled={page >= (meta.totalPages || 1)}
                            onClick={() => setPage(p => p + 1)}
                            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-50 transition-colors"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>

            {/* Detail Modal Overlay */}
            {selectedError && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-start justify-between">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <StatusBadge status={selectedError.status} />
                                    <SeverityBadge severity={selectedError.severity} />
                                    <span className="text-xs text-gray-500 font-mono">ID: {selectedError.id}</span>
                                </div>
                                <h2 className="text-xl font-bold text-gray-900 line-clamp-2">{selectedError.message}</h2>
                            </div>
                            <button
                                onClick={() => setSelectedError(null)}
                                className="p-2 text-gray-400 hover:text-gray-900 rounded-lg hover:bg-gray-200/50 transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-8">
                            {/* Actions Toolbar */}
                            <div className="flex items-center gap-3 pb-6 border-b border-gray-100">
                                <span className="text-sm text-gray-500 mr-auto">Actions:</span>
                                <button className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 shadow-sm shadow-green-200 transition-colors flex items-center gap-2" onClick={() => handleUpdateStatus(selectedError.id, "resolved")}>
                                    <CheckCircle className="w-4 h-4" /> Resolve
                                </button>
                                <button className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2" onClick={() => handleUpdateStatus(selectedError.id, "ignored")}>
                                    <XCircle className="w-4 h-4" /> Ignore
                                </button>
                                <button className="px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2">
                                    <ExternalLink className="w-4 h-4" /> Create Issue
                                </button>
                            </div>

                            {/* Stack Trace */}
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <Activity className="w-4 h-4 text-blue-500" /> Stack Trace
                                </h3>
                                <div className="bg-slate-900 text-slate-200 p-4 rounded-xl font-mono text-xs overflow-x-auto leading-relaxed border border-slate-700 shadow-inner">
                                    {selectedError.stackTrace || "No stack trace available."}
                                </div>
                            </div>

                            {/* Info Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Context</h4>
                                    <dl className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <dt className="text-gray-500">Component</dt>
                                            <dd className="font-mono text-gray-900">{selectedError.component}</dd>
                                        </div>
                                        <div className="flex justify-between">
                                            <dt className="text-gray-500">First Seen</dt>
                                            <dd className="text-gray-900">{selectedError.firstSeen ? format(new Date(selectedError.firstSeen), "PP p") : "-"}</dd>
                                        </div>
                                        <div className="flex justify-between">
                                            <dt className="text-gray-500">Last Seen</dt>
                                            <dd className="text-gray-900">{selectedError.lastSeen ? format(new Date(selectedError.lastSeen), "PP p") : "-"}</dd>
                                        </div>
                                        <div className="flex justify-between">
                                            <dt className="text-gray-500">Occurrences</dt>
                                            <dd className="font-bold text-gray-900">{selectedError.occurrenceCount}</dd>
                                        </div>
                                    </dl>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Recent Instances</h4>
                                    <div className="space-y-2">
                                        {(selectedError.instances || []).map((inst: any) => (
                                            <div key={inst.id} className="text-xs flex justify-between items-center border-b border-gray-200/50 pb-2 last:border-0 last:pb-0">
                                                <span className="font-mono text-gray-500">{inst.ip || "Unknown IP"}</span>
                                                <span className="text-gray-400">{inst.timestamp ? format(new Date(inst.timestamp), "HH:mm:ss") : "-"}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
