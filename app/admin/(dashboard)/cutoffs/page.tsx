"use client";
import { useState, useRef } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
    Scissors, Download, Upload, Sparkles, PlusCircle, Search, RefreshCw,
    ChevronLeft, ChevronRight, Pencil, Trash2, TrendingUp, TrendingDown,
    Minus, ArrowUpDown, BarChart3, Shield, ChevronUp, ChevronDown,
    CheckCircle2, XCircle, AlertTriangle, Eye, EyeOff,
} from "lucide-react";
import { useCutoffs, useDeleteCutoff, useBulkCutoffAction } from "@/hooks/admin/use-cutoffs";
import { useExamOptions } from "@/hooks/admin/use-submissions";

// ── Shared primitives (same pattern as analytics/leaderboard) ──
function Empty({ msg }: { msg: string }) {
    return (<div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
        <BarChart3 className="w-8 h-8 text-gray-200 mx-auto mb-2" /><p className="text-xs font-semibold text-gray-400">{msg}</p>
    </div>);
}

interface Cutoff {
    id: number; examId: number; examName: string; examYear: number;
    category: string; postCode: string; postName: string;
    expectedCutoff: number; safeScore: number; minimumScore: number;
    previousYearCutoff: number | null; confidenceLevel: "low" | "medium" | "high" | null;
    isPublished: boolean; updatedAt: string;
}

const confidenceCfg: Record<string, { bg: string; text: string; dot: string; Icon: any }> = {
    high: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", Icon: TrendingUp },
    medium: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500", Icon: Minus },
    low: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500", Icon: TrendingDown },
};

export default function CutoffsPage() {
    const [page, setPage] = useState(1);
    const [limit] = useState(20);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [filters, setFilters] = useState({ search: "", examId: "all", category: "all", confidence: "all" });
    const [sorting, setSorting] = useState({ field: "createdAt", order: "desc" });
    const [showImportModal, setShowImportModal] = useState(false);
    const [importFile, setImportFile] = useState<File | null>(null);
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState<{ imported: number; errors: any[] } | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    // React Query hooks
    const { data: cutoffsData, isLoading: loading, refetch: fetchCutoffs } = useCutoffs(filters, sorting, page, limit);
    const cutoffs = cutoffsData?.cutoffs || [];
    const pagination = cutoffsData?.pagination || { total: 0, page: 1, limit: 20, totalPages: 1 };

    const { data: exams } = useExamOptions();
    const deleteCutoff = useDeleteCutoff();
    const bulkCutoffAction = useBulkCutoffAction();

    const handleSort = (field: string) => {
        setSorting(prev => ({ field, order: prev.field === field && prev.order === "asc" ? "desc" : "asc" }));
    };
    const handleSelectAll = (checked: boolean) => setSelectedIds(checked ? cutoffs.map(c => c.id) : []);
    const handleSelectRow = (id: number, checked: boolean) => setSelectedIds(prev => checked ? [...prev, id] : prev.filter(i => i !== id));

    const handleBulkAction = (action: "delete" | "confidence_low" | "confidence_medium" | "confidence_high") => {
        if (!confirm(`Are you sure you want to perform this action on ${selectedIds.length} cutoffs?`)) return;
        bulkCutoffAction.mutate({ ids: selectedIds, action }, {
            onSuccess: () => setSelectedIds([]),
            onError: () => alert("Bulk action failed"),
        });
    };

    const handleDelete = (id: number) => {
        if (!confirm("Delete this cutoff permanently?")) return;
        deleteCutoff.mutate(id, { onError: () => alert("Delete failed") });
    };

    const handleExport = () => {
        const headers = ["exam_name", "exam_year", "category", "post_code", "post_name", "expected_cutoff", "safe_score", "minimum_score", "previous_year_cutoff", "confidence_level", "is_published"];
        const rows = cutoffs.map(c => [c.examName, c.examYear, c.category, c.postCode, c.postName, c.expectedCutoff, c.safeScore, c.minimumScore, c.previousYearCutoff || "", c.confidenceLevel || "low", c.isPublished].join(","));
        const blob = new Blob([[headers.join(","), ...rows].join("\n")], { type: "text/csv" });
        const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
        a.download = `cutoffs_export_${new Date().toISOString().split("T")[0]}.csv`; a.click();
    };

    const handleImport = async () => {
        if (!importFile || !filters.examId || filters.examId === "all") { alert("Please select an exam and a CSV file first."); return; }
        setImporting(true);
        try {
            const csvText = await importFile.text();
            const res = await fetch("/api/admin/cutoffs/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ csvText, examId: filters.examId }) });
            const data = await res.json();
            setImportResult(data); if (data.imported > 0) fetchCutoffs();
        } catch { alert("Import failed"); }
        finally { setImporting(false); }
    };

    const SortHeader = ({ field, label }: { field: string; label: string }) => (
        <th className="text-left py-3 pr-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none" onClick={() => handleSort(field)}>
            <span className="inline-flex items-center gap-1">{label}
                {sorting.field === field && (sorting.order === "asc" ? <ChevronUp className="w-3 h-3 text-indigo-500" /> : <ChevronDown className="w-3 h-3 text-indigo-500" />)}
            </span>
        </th>
    );

    const totalPages = pagination.totalPages;
    const showFrom = (pagination.page - 1) * pagination.limit + 1;
    const showTo = Math.min(pagination.page * pagination.limit, pagination.total);

    // Summary stats
    const publishedCount = cutoffs.filter(c => c.isPublished).length;
    const highConfCount = cutoffs.filter(c => c.confidenceLevel === "high").length;

    return (
        <div className="space-y-4 max-w-[1400px] mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <Scissors className="w-5 h-5 text-indigo-500" />
                        <h1 className="text-lg font-bold text-gray-900">Cutoff Management</h1>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 ml-7">Manage cutoff predictions for exams, categories, and posts</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => fetchCutoffs()} className="p-2 rounded-lg hover:bg-gray-100 transition-colors" title="Refresh">
                        <RefreshCw className={cn("w-4 h-4 text-gray-500", loading && "animate-spin")} />
                    </button>
                    <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                        <Download className="w-3.5 h-3.5" />Export
                    </button>
                    <button onClick={() => setShowImportModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                        <Upload className="w-3.5 h-3.5" />Import
                    </button>
                    <Link href="/admin/cutoffs/predictions" className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />Predictions
                    </Link>
                    <Link href="/admin/cutoffs/create" className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white rounded-lg text-xs font-semibold hover:bg-gray-800 transition-colors">
                        <PlusCircle className="w-3.5 h-3.5" />Add Cutoff
                    </Link>
                </div>
            </div>

            {/* Quick stats bar */}
            <div className="grid grid-cols-4 gap-3">
                <div className="bg-white rounded-xl border border-gray-100 p-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center"><BarChart3 className="w-4 h-4 text-indigo-600" /></div>
                    <div><p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Total</p><p className="text-base font-bold text-gray-900">{pagination.total.toLocaleString()}</p></div>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center"><Eye className="w-4 h-4 text-emerald-600" /></div>
                    <div><p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Published</p><p className="text-base font-bold text-gray-900">{publishedCount}</p></div>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center"><EyeOff className="w-4 h-4 text-amber-600" /></div>
                    <div><p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Unpublished</p><p className="text-base font-bold text-gray-900">{cutoffs.length - publishedCount}</p></div>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center"><Shield className="w-4 h-4 text-emerald-600" /></div>
                    <div><p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">High Confidence</p><p className="text-base font-bold text-gray-900">{highConfCount}</p></div>
                </div>
            </div>

            {/* Filters row */}
            <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input type="text" placeholder="Search posts…" value={filters.search}
                        onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
                        className="h-8 pl-8 pr-3 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-300 w-48" />
                </div>
                <select value={filters.examId} onChange={e => setFilters(prev => ({ ...prev, examId: e.target.value }))}
                    className="h-8 px-3 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-300 cursor-pointer">
                    <option value="all">All Exams</option>
                    {(() => {
                        const active = (exams || []).filter((e: any) => e.isActive !== false && e.status !== "closed");
                        const archived = (exams || []).filter((e: any) => e.isActive === false || e.status === "closed");
                        return (<>
                            {active.length > 0 && <optgroup label="Active">{active.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</optgroup>}
                            {archived.length > 0 && <optgroup label="Archived">{archived.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</optgroup>}
                        </>);
                    })()}
                </select>
                <select value={filters.category} onChange={e => setFilters(prev => ({ ...prev, category: e.target.value }))}
                    className="h-8 px-3 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-300 cursor-pointer">
                    <option value="all">All Categories</option>
                    {["GEN", "OBC", "SC", "ST", "EWS"].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select value={filters.confidence} onChange={e => setFilters(prev => ({ ...prev, confidence: e.target.value }))}
                    className="h-8 px-3 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-300 cursor-pointer">
                    <option value="all">All Confidence</option>
                    {["high", "medium", "low"].map(c => <option key={c} value={c} className="capitalize">{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>

                {/* Bulk actions */}
                {selectedIds.length > 0 && (
                    <div className="flex items-center gap-1 ml-auto bg-gray-900 text-white px-3 py-1.5 rounded-lg text-xs font-semibold">
                        <span className="mr-1">{selectedIds.length} selected</span>
                        <button onClick={() => handleBulkAction("confidence_high")} className="p-1 hover:text-emerald-400 transition-colors" title="Set High"><TrendingUp className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleBulkAction("confidence_medium")} className="p-1 hover:text-amber-400 transition-colors" title="Set Medium"><Minus className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleBulkAction("confidence_low")} className="p-1 hover:text-orange-400 transition-colors" title="Set Low"><TrendingDown className="w-3.5 h-3.5" /></button>
                        <div className="h-3.5 w-px bg-gray-600 mx-0.5" />
                        <button onClick={() => handleBulkAction("delete")} className="p-1 hover:text-red-400 transition-colors" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                )}
            </div>

            {/* Table */}
            {loading ? (
                <div className="bg-white rounded-xl border border-gray-100 p-16 flex flex-col items-center gap-3">
                    <RefreshCw className="w-6 h-6 text-gray-300 animate-spin" />
                    <p className="text-xs font-semibold text-gray-400">Loading cutoffs…</p>
                </div>
            ) : cutoffs.length === 0 ? (
                <Empty msg="No cutoffs found matching your filters." />
            ) : (
                <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50/50">
                                    <th className="py-3 px-3 w-10">
                                        <input type="checkbox" className="w-3.5 h-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                            checked={selectedIds.length === cutoffs.length && cutoffs.length > 0}
                                            onChange={e => handleSelectAll(e.target.checked)} />
                                    </th>
                                    <SortHeader field="examName" label="Exam" />
                                    <th className="text-left py-3 pr-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Category</th>
                                    <th className="text-left py-3 pr-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Post</th>
                                    <SortHeader field="expectedCutoff" label="Expected" />
                                    <SortHeader field="safeScore" label="Safe" />
                                    <th className="text-left py-3 pr-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Min</th>
                                    <th className="text-left py-3 pr-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Prev Year</th>
                                    <th className="text-left py-3 pr-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Confidence</th>
                                    <th className="text-center py-3 pr-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Published</th>
                                    <th className="text-right py-3 pr-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody>{cutoffs.map(c => {
                                const conf = confidenceCfg[c.confidenceLevel || "low"];
                                const ConfIcon = conf.Icon;
                                const diff = c.previousYearCutoff ? c.expectedCutoff - c.previousYearCutoff : null;
                                return (
                                    <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors group">
                                        <td className="py-2.5 px-3">
                                            <input type="checkbox" className="w-3.5 h-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                checked={selectedIds.includes(c.id)} onChange={e => handleSelectRow(c.id, e.target.checked)} />
                                        </td>
                                        <td className="py-2.5 pr-3">
                                            <span className="font-semibold text-gray-800 block">{c.examName}</span>
                                            {c.examYear && <span className="text-[10px] text-gray-400 font-mono">{c.examYear}</span>}
                                        </td>
                                        <td className="py-2.5 pr-3">
                                            <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-[10px] font-semibold">{c.category}</span>
                                        </td>
                                        <td className="py-2.5 pr-3">
                                            <span className="font-medium text-gray-800">{c.postName || "—"}</span>
                                            {c.postCode && <span className="text-[10px] text-gray-400 font-mono block">{c.postCode}</span>}
                                        </td>
                                        <td className="py-2.5 pr-3">
                                            <span className="font-bold text-indigo-700 text-sm">{c.expectedCutoff?.toFixed(1)}</span>
                                        </td>
                                        <td className="py-2.5 pr-3">
                                            <span className="font-bold text-emerald-600">{c.safeScore?.toFixed(1) || "—"}</span>
                                        </td>
                                        <td className="py-2.5 pr-3 text-gray-600">{c.minimumScore?.toFixed(1) || "—"}</td>
                                        <td className="py-2.5 pr-3">
                                            <span className="text-gray-500">{c.previousYearCutoff?.toFixed(1) || "—"}</span>
                                            {diff !== null && (
                                                <span className={cn("ml-1 text-[10px] font-bold", diff > 0 ? "text-red-500" : diff < 0 ? "text-emerald-500" : "text-gray-400")}>
                                                    {diff > 0 ? "↑" : diff < 0 ? "↓" : "="}{Math.abs(diff).toFixed(1)}
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-2.5 pr-3">
                                            <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold", conf.bg, conf.text)}>
                                                <span className={cn("w-1.5 h-1.5 rounded-full", conf.dot)} />
                                                {(c.confidenceLevel || "low").charAt(0).toUpperCase() + (c.confidenceLevel || "low").slice(1)}
                                            </span>
                                        </td>
                                        <td className="py-2.5 pr-3 text-center">
                                            {c.isPublished
                                                ? <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" />
                                                : <XCircle className="w-4 h-4 text-gray-300 mx-auto" />}
                                        </td>
                                        <td className="py-2.5 pr-3 text-right">
                                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Link href={`/admin/cutoffs/${c.id}/edit`}
                                                    className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Edit">
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </Link>
                                                <button onClick={() => handleDelete(c.id)}
                                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}</tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/30">
                            <div className="flex items-center gap-3 text-[11px] text-gray-400 font-semibold">
                                <span>Rows:</span>
                                <select value={limit} onChange={e => { /* limit fixed at 20 */ }}
                                    className="h-6 px-1.5 text-[10px] bg-white border border-gray-200 rounded focus:outline-none cursor-pointer">
                                    {[10, 20, 50].map(n => <option key={n} value={n}>{n}</option>)}
                                </select>
                                <span>Showing <b className="text-gray-700">{showFrom}–{showTo}</b> of <b className="text-gray-700">{pagination.total.toLocaleString()}</b></span>
                            </div>
                            <div className="flex items-center gap-1">
                                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                                    className={cn("p-1.5 rounded-lg transition-colors", page <= 1 ? "text-gray-300 cursor-not-allowed" : "text-gray-600 hover:bg-gray-100")}>
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                                    const p = start + i;
                                    if (p > totalPages) return null;
                                    return (
                                        <button key={p} onClick={() => setPage(p)}
                                            className={cn("w-7 h-7 rounded-lg text-[11px] font-bold transition-all",
                                                page === p ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-100")}>
                                            {p}
                                        </button>
                                    );
                                })}
                                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                                    className={cn("p-1.5 rounded-lg transition-colors", page >= totalPages ? "text-gray-300 cursor-not-allowed" : "text-gray-600 hover:bg-gray-100")}>
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Import CSV Modal */}
            {showImportModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => { setShowImportModal(false); setImportFile(null); setImportResult(null); }}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 border border-gray-200" onClick={e => e.stopPropagation()}>
                        <div className="p-5 border-b border-gray-100">
                            <div className="flex items-center gap-2">
                                <Upload className="w-4 h-4 text-indigo-500" />
                                <h2 className="text-sm font-bold text-gray-900">Import Cutoffs from CSV</h2>
                            </div>
                            <p className="text-[11px] text-gray-400 mt-1 ml-6">Required: <code className="bg-gray-100 px-1 rounded text-[10px]">category</code>, <code className="bg-gray-100 px-1 rounded text-[10px]">expected_cutoff</code></p>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Target Exam <span className="text-red-500">*</span></label>
                                <select value={filters.examId} onChange={e => setFilters(prev => ({ ...prev, examId: e.target.value }))}
                                    className="w-full h-9 px-3 text-xs font-medium bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-300">
                                    <option value="all">Select Exam…</option>
                                    {(() => {
                                        const active = (exams || []).filter((e: any) => e.isActive !== false && e.status !== "closed");
                                        const archived = (exams || []).filter((e: any) => e.isActive === false || e.status === "closed");
                                        return (<>
                                            {active.length > 0 && <optgroup label="Active">{active.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</optgroup>}
                                            {archived.length > 0 && <optgroup label="Archived">{archived.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</optgroup>}
                                        </>);
                                    })()}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1.5">CSV File <span className="text-red-500">*</span></label>
                                <input ref={fileRef} type="file" accept=".csv"
                                    onChange={e => { setImportFile(e.target.files?.[0] || null); setImportResult(null); }}
                                    className="w-full h-9 px-3 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-300 file:mr-3 file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 file:rounded file:px-2 file:py-1" />
                            </div>
                            {importResult && (
                                <div className={cn("p-3 rounded-lg border text-xs",
                                    importResult.errors.length > 0 ? "bg-amber-50 border-amber-200 text-amber-800" : "bg-emerald-50 border-emerald-200 text-emerald-800")}>
                                    <p className="font-bold">{importResult.imported} cutoffs imported successfully.</p>
                                    {importResult.errors.length > 0 && (
                                        <div className="mt-1.5">
                                            <p className="font-bold">{importResult.errors.length} errors:</p>
                                            <ul className="list-disc pl-4 mt-1 space-y-0.5">
                                                {importResult.errors.slice(0, 5).map((err: any, i: number) => <li key={i}>Row {err.row}: {err.error}</li>)}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="p-5 border-t border-gray-100 flex justify-end gap-2">
                            <button onClick={() => { setShowImportModal(false); setImportFile(null); setImportResult(null); }}
                                className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                                Cancel
                            </button>
                            <button onClick={handleImport} disabled={importing || !importFile || filters.examId === "all"}
                                className="px-4 py-2 text-xs font-semibold text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50">
                                {importing ? "Importing…" : "Import"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
