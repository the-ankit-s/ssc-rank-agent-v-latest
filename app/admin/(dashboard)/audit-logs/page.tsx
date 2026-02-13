"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { X, ChevronRight, User, FileText, Clock, MapPin, RefreshCw } from "lucide-react";
import { useAuditLogs, AuditLog } from "@/hooks/admin/use-admin";

interface DiffItem {
    key: string;
    oldValue: any;
    newValue: any;
    changed: boolean;
}

const actionColors: Record<string, string> = {
    create: "bg-green-50 text-green-700 border-green-200",
    update: "bg-blue-50 text-blue-700 border-blue-200",
    delete: "bg-red-50 text-red-700 border-red-200",
    login: "bg-purple-50 text-purple-700 border-purple-200",
    logout: "bg-gray-50 text-gray-700 border-gray-200",
};

export default function AuditLogsPage() {
    // State
    const [filters, setFilters] = useState({
        adminUserId: "",
        entity: "",
        action: "",
        startDate: "",
        endDate: "",
    });
    const [page, setPage] = useState(1);
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
    const [diffData, setDiffData] = useState<DiffItem[]>([]);

    // React Query
    const { data, isLoading, refetch } = useAuditLogs(filters, page);
    const logs = data?.logs || [];
    const pagination = data?.pagination || { page: 1, limit: 50, totalPages: 1, total: 0 };

    // Handlers
    const openDiffModal = (log: AuditLog) => {
        setSelectedLog(log);

        const oldVals = log.oldValues || {};
        const newVals = log.newValues || {};
        const allKeys = new Set([...Object.keys(oldVals), ...Object.keys(newVals)]);

        const diff: DiffItem[] = Array.from(allKeys).map((key) => ({
            key,
            oldValue: oldVals[key],
            newValue: newVals[key],
            changed: JSON.stringify(oldVals[key]) !== JSON.stringify(newVals[key]),
        }));

        setDiffData(diff);
    };

    const formatValue = (val: any) => {
        if (val === null || val === undefined) return <span className="text-gray-400 italic">null</span>;
        if (typeof val === "object") return <pre className="text-xs font-mono">{JSON.stringify(val, null, 2)}</pre>;
        if (typeof val === "boolean") return <span className={val ? "text-green-600" : "text-red-600 font-bold"}>{String(val)}</span>;
        return String(val);
    };

    const handleFilterChange = (key: string, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setPage(1); // Reset page on filter change
    };

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Audit Logs</h1>
                    <p className="text-gray-500 mt-1">Track all administrative actions and changes.</p>
                </div>
                <button
                    onClick={() => refetch()}
                    className="px-4 py-2 bg-white border border-gray-200 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all flex items-center gap-2"
                >
                    <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
                    Refresh
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-4">
                <select
                    className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    value={filters.entity}
                    onChange={(e) => handleFilterChange("entity", e.target.value)}
                >
                    <option value="">All Entities</option>
                    <option value="exam">Exam</option>
                    <option value="shift">Shift</option>
                    <option value="submission">Submission</option>
                    <option value="cutoff">Cutoff</option>
                    <option value="settings">Settings</option>
                    <option value="user">User</option>
                </select>
                <select
                    className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    value={filters.action}
                    onChange={(e) => handleFilterChange("action", e.target.value)}
                >
                    <option value="">All Actions</option>
                    <option value="create">Create</option>
                    <option value="update">Update</option>
                    <option value="delete">Delete</option>
                    <option value="login">Login</option>
                    <option value="logout">Logout</option>
                </select>
                <input
                    type="datetime-local"
                    className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    value={filters.startDate}
                    onChange={(e) => handleFilterChange("startDate", e.target.value)}
                />
                <input
                    type="datetime-local"
                    className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    value={filters.endDate}
                    onChange={(e) => handleFilterChange("endDate", e.target.value)}
                />
                <button
                    onClick={() => {
                        setFilters({ adminUserId: "", entity: "", action: "", startDate: "", endDate: "" });
                        setPage(1);
                    }}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors ml-auto"
                >
                    Clear Filters
                </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                <th className="px-6 py-4">Timestamp</th>
                                <th className="px-6 py-4">Admin User</th>
                                <th className="px-6 py-4">Action</th>
                                <th className="px-6 py-4">Entity</th>
                                <th className="px-6 py-4">Entity ID</th>
                                <th className="px-6 py-4">IP Address</th>
                                <th className="px-6 py-4 text-right">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-16 text-center text-gray-500">
                                        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-300 mb-2" />
                                        <p className="text-xs font-medium">Loading audit logs...</p>
                                    </td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-16 text-center text-gray-500 text-sm">
                                        No audit logs found matching your criteria.
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-gray-50/50 group transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                <Clock className="w-3.5 h-3.5 text-gray-400" />
                                                <span className="font-mono text-xs">{format(new Date(log.timestamp), "MMM d, HH:mm:ss")}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-[10px] font-bold">
                                                    {(log.adminUser?.name || "S").charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900">
                                                        {log.adminUser?.name || "System"}
                                                    </p>
                                                    {log.adminUser && (
                                                        <p className="text-[10px] text-gray-400">{log.adminUser.email}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span
                                                className={cn(
                                                    "px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wide",
                                                    actionColors[log.action] || actionColors.update
                                                )}
                                            >
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <FileText className="w-3.5 h-3.5 text-gray-400" />
                                                <span className="text-sm font-mono text-gray-700 capitalize">
                                                    {log.entity}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-xs font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                                {log.entityId || "-"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                                <MapPin className="w-3.5 h-3.5 text-gray-300" />
                                                {log.ip || "-"}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {log.action === "update" && (log.oldValues || log.newValues) && (
                                                <button
                                                    onClick={() => openDiffModal(log)}
                                                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-colors"
                                                >
                                                    View Diff
                                                    <ChevronRight className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/30">
                        <p className="text-xs text-gray-500 font-medium">
                            Page {pagination.page} of {pagination.totalPages}
                        </p>
                        <div className="flex gap-2">
                            <button
                                disabled={page <= 1}
                                onClick={() => setPage((p) => p - 1)}
                                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-white transition-colors font-medium text-gray-600"
                            >
                                Previous
                            </button>
                            <button
                                disabled={page >= pagination.totalPages}
                                onClick={() => setPage((p) => p + 1)}
                                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-white transition-colors font-medium text-gray-600"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Diff Modal */}
            {selectedLog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={() => setSelectedLog(null)}
                >
                    <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-start justify-between">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <span
                                        className={cn(
                                            "px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wide",
                                            actionColors[selectedLog.action]
                                        )}
                                    >
                                        {selectedLog.action}
                                    </span>
                                    <span className="text-xs text-gray-400 font-mono">
                                        ID: {selectedLog.id}
                                    </span>
                                </div>
                                <h2 className="text-xl font-bold text-gray-900">
                                    {selectedLog.entity} #{selectedLog.entityId} — Changes
                                </h2>
                                <p className="text-sm text-gray-500 mt-1">
                                    {format(new Date(selectedLog.timestamp), "PPpp")} by{" "}
                                    {selectedLog.adminUser?.name || "System"}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedLog(null)}
                                className="p-2 text-gray-400 hover:text-gray-900 rounded-lg hover:bg-gray-200/50 transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Diff View */}
                        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
                            <div className="grid grid-cols-2 gap-6">
                                {/* Old Values */}
                                <div>
                                    <h3 className="text-xs font-bold text-red-600 uppercase tracking-wider mb-3 flex items-center gap-2 border-b border-red-100 pb-2">
                                        <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                                        Old Values
                                    </h3>
                                    <div className="space-y-3">
                                        {diffData.map((item) => (
                                            <div
                                                key={item.key}
                                                className={cn(
                                                    "p-3 rounded-lg border text-sm transition-colors",
                                                    item.changed
                                                        ? "bg-red-50 border-red-200"
                                                        : "bg-white border-gray-200 opacity-60"
                                                )}
                                            >
                                                <p className="text-[10px] font-bold text-gray-500 uppercase mb-1 tracking-wider">
                                                    {item.key}
                                                </p>
                                                <div className="text-gray-900 break-all font-medium">
                                                    {formatValue(item.oldValue)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* New Values */}
                                <div>
                                    <h3 className="text-xs font-bold text-green-600 uppercase tracking-wider mb-3 flex items-center gap-2 border-b border-green-100 pb-2">
                                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                        New Values
                                    </h3>
                                    <div className="space-y-3">
                                        {diffData.map((item) => (
                                            <div
                                                key={item.key}
                                                className={cn(
                                                    "p-3 rounded-lg border text-sm transition-colors",
                                                    item.changed
                                                        ? "bg-green-50 border-green-200"
                                                        : "bg-white border-gray-200 opacity-60"
                                                )}
                                            >
                                                <p className="text-[10px] font-bold text-gray-500 uppercase mb-1 tracking-wider">
                                                    {item.key}
                                                </p>
                                                <div className="text-gray-900 break-all font-medium">
                                                    {formatValue(item.newValue)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-gray-100 bg-white flex justify-end gap-2">
                            <button
                                onClick={() => {
                                    const changes = diffData.filter((d) => d.changed);
                                    const text = changes
                                        .map(
                                            (c) =>
                                                `${c.key}: ${JSON.stringify(c.oldValue)} → ${JSON.stringify(c.newValue)}`
                                        )
                                        .join("\n");
                                    navigator.clipboard.writeText(text);
                                }}
                                className="px-4 py-2 bg-white border border-gray-200 text-gray-700 text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Copy Changes
                            </button>
                            <button
                                onClick={() => setSelectedLog(null)}
                                className="px-4 py-2 bg-gray-900 text-white text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-gray-800 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
