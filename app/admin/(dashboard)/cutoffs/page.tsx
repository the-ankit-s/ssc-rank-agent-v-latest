"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface Cutoff {
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

interface Exam { id: number; name: string; }

interface Pagination {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export default function CutoffsPage() {
    const [cutoffs, setCutoffs] = useState<Cutoff[]>([]);
    const [exams, setExams] = useState<Exam[]>([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, limit: 20, totalPages: 1 });
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [filters, setFilters] = useState({
        search: "",
        examId: "all",
        category: "all",
        confidence: "all",
    });
    const [sorting, setSorting] = useState({ field: "createdAt", order: "desc" });

    // Fetch exams for filter dropdown
    useEffect(() => {
        fetch("/api/admin/exams?limit=100")
            .then(r => r.json())
            .then(d => setExams(d.exams || []))
            .catch(console.error);
    }, []);

    const fetchCutoffs = useCallback(async () => {
        setLoading(true);
        const params = new URLSearchParams({
            page: pagination.page.toString(),
            limit: pagination.limit.toString(),
            sort: sorting.field,
            order: sorting.order,
            ...filters,
        });
        try {
            const res = await fetch(`/api/admin/cutoffs?${params}`);
            const data = await res.json();
            if (data.cutoffs) {
                setCutoffs(data.cutoffs);
                setPagination(prev => ({ ...prev, ...data.pagination }));
            }
        } catch (e) {
            console.error("Failed to fetch cutoffs", e);
        } finally {
            setLoading(false);
        }
    }, [pagination.page, pagination.limit, sorting, filters]);

    useEffect(() => {
        const timer = setTimeout(() => fetchCutoffs(), 300);
        return () => clearTimeout(timer);
    }, [fetchCutoffs]);

    // Handlers
    const handleSort = (field: string) => {
        setSorting(prev => ({
            field,
            order: prev.field === field && prev.order === "asc" ? "desc" : "asc",
        }));
    };

    const handleSelectAll = (checked: boolean) => {
        setSelectedIds(checked ? cutoffs.map(c => c.id) : []);
    };

    const handleSelectRow = (id: number, checked: boolean) => {
        setSelectedIds(prev => checked ? [...prev, id] : prev.filter(i => i !== id));
    };

    const handleBulkAction = async (action: "delete" | "confidence_low" | "confidence_medium" | "confidence_high") => {
        if (!confirm(`Are you sure you want to perform this action on ${selectedIds.length} cutoffs?`)) return;
        try {
            if (action === "delete") {
                await fetch("/api/admin/cutoffs/bulk-delete", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ids: selectedIds }),
                });
            } else {
                const level = action.replace("confidence_", "");
                await fetch("/api/admin/cutoffs/bulk-update", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ids: selectedIds, data: { confidenceLevel: level } }),
                });
            }
            fetchCutoffs();
            setSelectedIds([]);
        } catch {
            alert("Bulk action failed");
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Delete this cutoff permanently?")) return;
        try {
            await fetch(`/api/admin/cutoffs/${id}`, { method: "DELETE" });
            fetchCutoffs();
        } catch {
            alert("Delete failed");
        }
    };

    const confidenceColors: Record<string, string> = {
        high: "bg-emerald-100 text-emerald-700 border-emerald-200",
        medium: "bg-amber-100 text-amber-700 border-amber-200",
        low: "bg-red-100 text-red-700 border-red-200",
    };

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Cutoff Management</h1>
                    <p className="text-gray-500 font-medium mt-1">Manage cutoff predictions for exams, categories, and posts.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Link
                        href="/admin/cutoffs/predictions"
                        className="flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-gray-200 rounded-xl text-gray-700 font-bold hover:border-gray-900 transition-all text-sm"
                    >
                        <span className="material-symbols-outlined text-lg text-amber-500">auto_awesome</span>
                        AI Predictions
                    </Link>
                    <Link
                        href="/admin/cutoffs/create"
                        className="btn-primary flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined text-xl">add_circle</span>
                        Add Cutoff
                    </Link>
                </div>
            </div>

            {/* Toolbar */}
            <div className="card-base p-4 flex flex-col lg:flex-row gap-4 justify-between items-center bg-white">
                <div className="flex flex-wrap gap-2 w-full lg:w-auto">
                    {/* Search */}
                    <div className="relative group">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#A78BFA] transition-colors">search</span>
                        <input
                            type="text"
                            placeholder="Search by post name..."
                            className="pl-10 pr-4 py-2 border-2 border-gray-200 rounded-xl focus:border-gray-900 outline-none w-full sm:w-56 transition-all"
                            value={filters.search}
                            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                        />
                    </div>

                    {/* Exam Filter */}
                    <select
                        className="px-3 py-2 border-2 border-gray-200 rounded-xl focus:border-gray-900 outline-none bg-white text-sm font-bold text-gray-700"
                        value={filters.examId}
                        onChange={(e) => setFilters(prev => ({ ...prev, examId: e.target.value }))}
                    >
                        <option value="all">All Exams</option>
                        {exams.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>

                    {/* Category Filter */}
                    <select
                        className="px-3 py-2 border-2 border-gray-200 rounded-xl focus:border-gray-900 outline-none bg-white text-sm font-bold text-gray-700"
                        value={filters.category}
                        onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                    >
                        <option value="all">All Categories</option>
                        <option value="UR">UR</option>
                        <option value="OBC">OBC</option>
                        <option value="SC">SC</option>
                        <option value="ST">ST</option>
                        <option value="EWS">EWS</option>
                    </select>

                    {/* Confidence Filter */}
                    <select
                        className="px-3 py-2 border-2 border-gray-200 rounded-xl focus:border-gray-900 outline-none bg-white text-sm font-bold text-gray-700"
                        value={filters.confidence}
                        onChange={(e) => setFilters(prev => ({ ...prev, confidence: e.target.value }))}
                    >
                        <option value="all">All Confidence</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                    </select>
                </div>

                {/* Bulk Actions */}
                {selectedIds.length > 0 && (
                    <div className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-xl animate-in fade-in slide-in-from-bottom-2">
                        <span className="text-sm font-bold mr-2">{selectedIds.length} Selected</span>
                        <button onClick={() => handleBulkAction('confidence_high')} className="p-1 hover:text-green-400" title="Set High Confidence">
                            <span className="material-symbols-outlined text-sm">trending_up</span>
                        </button>
                        <button onClick={() => handleBulkAction('confidence_medium')} className="p-1 hover:text-yellow-400" title="Set Medium Confidence">
                            <span className="material-symbols-outlined text-sm">trending_flat</span>
                        </button>
                        <button onClick={() => handleBulkAction('confidence_low')} className="p-1 hover:text-orange-400" title="Set Low Confidence">
                            <span className="material-symbols-outlined text-sm">trending_down</span>
                        </button>
                        <div className="h-4 w-px bg-gray-700 mx-1"></div>
                        <button onClick={() => handleBulkAction('delete')} className="p-1 hover:text-red-400" title="Delete">
                            <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Table */}
            <div className="card-base overflow-hidden p-0 bg-white">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 border-b-2 border-gray-100">
                            <tr>
                                <th className="p-4 w-10">
                                    <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-[#A78BFA] focus:ring-[#A78BFA]"
                                        checked={selectedIds.length === cutoffs.length && cutoffs.length > 0}
                                        onChange={(e) => handleSelectAll(e.target.checked)} />
                                </th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Exam</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Category</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Post</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-900" onClick={() => handleSort('expectedCutoff')}>
                                    <div className="flex items-center gap-1">Expected {sorting.field === 'expectedCutoff' && <span className="material-symbols-outlined text-sm">{sorting.order === 'asc' ? 'arrow_upward' : 'arrow_downward'}</span>}</div>
                                </th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-900" onClick={() => handleSort('safeScore')}>
                                    <div className="flex items-center gap-1">Safe {sorting.field === 'safeScore' && <span className="material-symbols-outlined text-sm">{sorting.order === 'asc' ? 'arrow_upward' : 'arrow_downward'}</span>}</div>
                                </th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Min</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Prev Year</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Confidence</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="p-4"><div className="h-4 w-4 bg-gray-200 rounded"></div></td>
                                        <td className="p-4"><div className="h-5 w-32 bg-gray-200 rounded"></div></td>
                                        <td className="p-4"><div className="h-5 w-12 bg-gray-200 rounded"></div></td>
                                        <td className="p-4"><div className="h-5 w-20 bg-gray-200 rounded"></div></td>
                                        <td className="p-4"><div className="h-5 w-14 bg-gray-200 rounded"></div></td>
                                        <td className="p-4"><div className="h-5 w-14 bg-gray-200 rounded"></div></td>
                                        <td className="p-4"><div className="h-5 w-14 bg-gray-200 rounded"></div></td>
                                        <td className="p-4"><div className="h-5 w-14 bg-gray-200 rounded"></div></td>
                                        <td className="p-4"><div className="h-5 w-16 bg-gray-200 rounded-full"></div></td>
                                        <td className="p-4"><div className="h-8 w-8 bg-gray-200 rounded ml-auto"></div></td>
                                    </tr>
                                ))
                            ) : cutoffs.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="p-12 text-center text-gray-500 font-medium">
                                        No cutoffs found matching your filters.
                                    </td>
                                </tr>
                            ) : (
                                cutoffs.map((cutoff) => (
                                    <tr key={cutoff.id} className="hover:bg-gray-50 transition-colors group">
                                        <td className="p-4">
                                            <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-[#A78BFA] focus:ring-[#A78BFA]"
                                                checked={selectedIds.includes(cutoff.id)}
                                                onChange={(e) => handleSelectRow(cutoff.id, e.target.checked)} />
                                        </td>
                                        <td className="p-4">
                                            <span className="font-bold text-gray-900 block">{cutoff.examName}</span>
                                            {cutoff.examYear && <span className="text-xs text-gray-400 font-mono">{cutoff.examYear}</span>}
                                        </td>
                                        <td className="p-4">
                                            <span className="inline-block px-2 py-1 rounded text-xs font-bold bg-gray-100 text-gray-600 border border-gray-200">
                                                {cutoff.category}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <span className="font-medium text-gray-900">{cutoff.postName || "-"}</span>
                                            {cutoff.postCode && <span className="text-xs text-gray-400 font-mono block">{cutoff.postCode}</span>}
                                        </td>
                                        <td className="p-4">
                                            <span className="font-mono font-bold text-lg text-blue-600">{cutoff.expectedCutoff?.toFixed(1)}</span>
                                        </td>
                                        <td className="p-4">
                                            <span className="font-mono font-bold text-green-600">{cutoff.safeScore?.toFixed(1) || "-"}</span>
                                        </td>
                                        <td className="p-4">
                                            <span className="font-mono text-gray-600">{cutoff.minimumScore?.toFixed(1) || "-"}</span>
                                        </td>
                                        <td className="p-4">
                                            <span className="font-mono text-gray-500">{cutoff.previousYearCutoff?.toFixed(1) || "-"}</span>
                                        </td>
                                        <td className="p-4">
                                            <span className={cn(
                                                "inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold uppercase border",
                                                confidenceColors[cutoff.confidenceLevel || "low"]
                                            )}>
                                                <span className={cn("w-1.5 h-1.5 rounded-full",
                                                    cutoff.confidenceLevel === 'high' ? "bg-emerald-500" :
                                                        cutoff.confidenceLevel === 'medium' ? "bg-amber-500" : "bg-red-500"
                                                )}></span>
                                                {cutoff.confidenceLevel || "low"}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Link
                                                    href={`/admin/cutoffs/${cutoff.id}/edit`}
                                                    className="p-1.5 text-gray-400 hover:text-[#7C3AED] hover:bg-[#F3E8FF] rounded-lg transition-colors"
                                                    title="Edit"
                                                >
                                                    <span className="material-symbols-outlined text-lg">edit</span>
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(cutoff.id)}
                                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Delete"
                                                >
                                                    <span className="material-symbols-outlined text-lg">delete</span>
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
                <div className="p-4 border-t-2 border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-50">
                    <div className="flex items-center gap-4 text-sm text-gray-500 font-medium">
                        <span>Rows per page:</span>
                        <select
                            value={pagination.limit}
                            onChange={(e) => setPagination(prev => ({ ...prev, limit: Number(e.target.value), page: 1 }))}
                            className="bg-white border-2 border-gray-200 rounded-lg px-2 py-1 focus:border-gray-900 outline-none"
                        >
                            <option value="10">10</option>
                            <option value="20">20</option>
                            <option value="50">50</option>
                        </select>
                        <span className="hidden sm:inline">
                            Showing {(pagination.page - 1) * pagination.limit + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            disabled={pagination.page === 1}
                            onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                            className="p-2 bg-white border-2 border-gray-200 rounded-lg hover:border-gray-900 disabled:opacity-50 disabled:hover:border-gray-200 transition-all font-bold text-gray-700"
                        >Previous</button>
                        <span className="px-4 font-bold text-gray-900">Page {pagination.page}</span>
                        <button
                            disabled={pagination.page >= pagination.totalPages}
                            onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                            className="p-2 bg-white border-2 border-gray-200 rounded-lg hover:border-gray-900 disabled:opacity-50 disabled:hover:border-gray-200 transition-all font-bold text-gray-700"
                        >Next</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
