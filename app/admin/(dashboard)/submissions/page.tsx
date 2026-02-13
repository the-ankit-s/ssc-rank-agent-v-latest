"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { CategoryBadge } from "@/components/admin/tags";
import { ScoreIndicator } from "@/components/admin/submissions/score-indicator";
import { BulkActionsBar } from "@/components/admin/submissions/bulk-actions-bar";
import { SubmissionFiltersPanel, type SubmissionFilters } from "@/components/admin/submissions/submission-filters";
import { DeleteConfirmationModal } from "@/components/admin/submissions/delete-confirmation-modal";
import { maskRollNumber, calculatePercentile } from "@/lib/helpers/submission-helpers";
import { cn } from "@/lib/utils";
import { Users, FileText, Copy, ArrowUpDown, ArrowUp, ArrowDown, Eye, Pencil, Trash2, Inbox, ChevronLeft, ChevronRight } from "lucide-react";
import { useSubmissions, useExamOptions, useShiftOptions, useBulkDeleteSubmissions, useDeleteSubmission } from "@/hooks/admin/use-submissions";

export default function SubmissionsPage() {
    const [page, setPage] = useState(1);
    const [limit] = useState(20);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [filters, setFilters] = useState<SubmissionFilters>({
        search: "", examId: "all", shiftId: "all", category: [], gender: "all",
        scoreMin: "", scoreMax: "", rankMin: "", rankMax: "", dateFrom: "", dateTo: "", source: "all",
    });
    const [sorting, setSorting] = useState({ field: "createdAt", order: "desc" });
    const [deleteModal, setDeleteModal] = useState({
        isOpen: false, title: "", message: "", onConfirm: () => { }, isDeleting: false
    });

    // React Query hooks
    const { data: submissionsData, isLoading: loading } = useSubmissions(filters, sorting, page, limit);
    const submissions = submissionsData?.submissions || [];
    const pagination = submissionsData?.pagination || { total: 0, page: 1, limit: 20, totalPages: 1 };

    const { data: exams } = useExamOptions();
    const { data: shifts } = useShiftOptions(filters.examId);
    const bulkDelete = useBulkDeleteSubmissions();
    const deleteSubmission = useDeleteSubmission();

    const handleSort = (field: string) => {
        setSorting(prev => ({ field, order: prev.field === field && prev.order === "asc" ? "desc" : "asc" }));
    };

    const handleSelectAll = (checked: boolean) => { if (checked) setSelectedIds(submissions.map(s => s.id)); else setSelectedIds([]); };
    const handleSelectRow = (id: number, checked: boolean) => { if (checked) setSelectedIds(prev => [...prev, id]); else setSelectedIds(prev => prev.filter(i => i !== id)); };

    const handleBulkDelete = () => {
        setDeleteModal({
            isOpen: true, title: "Delete Submissions",
            message: `Are you sure you want to delete ${selectedIds.length} submission(s)? This action cannot be undone.`,
            onConfirm: () => {
                setDeleteModal(prev => ({ ...prev, isDeleting: true }));
                bulkDelete.mutate(selectedIds, {
                    onSuccess: () => { setSelectedIds([]); setDeleteModal(prev => ({ ...prev, isOpen: false, isDeleting: false })); },
                    onError: () => { alert("Failed to delete submissions"); setDeleteModal(prev => ({ ...prev, isDeleting: false })); },
                });
            },
            isDeleting: false
        });
    };

    const handleBulkExport = async () => {
        try {
            const res = await fetch("/api/admin/submissions/export", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: selectedIds }) });
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a"); a.href = url; a.download = `submissions-${Date.now()}.csv`;
            document.body.appendChild(a); a.click(); window.URL.revokeObjectURL(url); document.body.removeChild(a);
        } catch { alert("Failed to export submissions"); }
    };

    const handleBulkRecalculate = async () => {
        if (!confirm(`Recalculate ranks for ${selectedIds.length} submission(s)?`)) return;
        try {
            const res = await fetch("/api/admin/submissions/bulk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "recalculate", ids: selectedIds }) });
            if (res.ok) { bulkDelete.reset(); setSelectedIds([]); alert("Ranks recalculated!"); }
            else alert("Failed to recalculate ranks");
        } catch { alert("Failed to recalculate ranks"); }
    };

    const handleDeleteSubmission = (id: number, name: string) => {
        setDeleteModal({
            isOpen: true, title: "Delete Submission",
            message: `Delete submission for ${name}? This cannot be undone.`,
            onConfirm: () => {
                setDeleteModal(prev => ({ ...prev, isDeleting: true }));
                deleteSubmission.mutate(id, {
                    onSuccess: () => { setDeleteModal(prev => ({ ...prev, isOpen: false, isDeleting: false })); },
                    onError: () => { alert("Failed to delete"); setDeleteModal(prev => ({ ...prev, isDeleting: false })); },
                });
            },
            isDeleting: false
        });
    };

    const SortIcon = ({ field }: { field: string }) => {
        if (sorting.field !== field) return <ArrowUpDown className="w-3 h-3 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />;
        return sorting.order === "asc" ? <ArrowUp className="w-3 h-3 text-violet-500" /> : <ArrowDown className="w-3 h-3 text-violet-500" />;
    };

    return (
        <div className="space-y-5 max-w-[1800px] mx-auto pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900">Submissions</h1>
                    <p className="text-sm text-gray-400 font-medium mt-0.5">
                        Manage and review all exam submissions
                        {pagination.total > 0 && <span className="text-gray-500 ml-1">· {pagination.total.toLocaleString()} total</span>}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Link href="/admin/submissions/duplicates"
                        className="flex items-center gap-1.5 px-4 py-2.5 bg-white text-gray-700 font-bold rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all text-xs">
                        <Copy className="w-4 h-4" /> Duplicates
                    </Link>
                </div>
            </div>

            {/* Stats */}
            {pagination.total > 0 && !loading && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center"><Users className="w-4 h-4 text-blue-500" /></div>
                        <div><p className="text-lg font-black text-gray-900">{pagination.total.toLocaleString()}</p><p className="text-[10px] font-bold text-gray-400 uppercase">Total</p></div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center"><FileText className="w-4 h-4 text-violet-500" /></div>
                        <div><p className="text-lg font-black text-gray-900">{pagination.totalPages}</p><p className="text-[10px] font-bold text-gray-400 uppercase">Pages</p></div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center"><FileText className="w-4 h-4 text-emerald-500" /></div>
                        <div><p className="text-lg font-black text-gray-900">{(exams || []).length}</p><p className="text-[10px] font-bold text-gray-400 uppercase">Exams</p></div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center"><Users className="w-4 h-4 text-amber-500" /></div>
                        <div><p className="text-lg font-black text-gray-900">{selectedIds.length}</p><p className="text-[10px] font-bold text-gray-400 uppercase">Selected</p></div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <SubmissionFiltersPanel filters={filters} onFiltersChange={setFilters} exams={exams || []} shifts={shifts || []} />

            {/* Table */}
            <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50/80 border-b border-gray-100">
                            <tr>
                                <th className="p-3 pl-4 w-10">
                                    <input type="checkbox" className="w-3.5 h-3.5 rounded accent-violet-500 cursor-pointer"
                                        checked={selectedIds.length === submissions.length && submissions.length > 0}
                                        onChange={(e) => handleSelectAll(e.target.checked)} />
                                </th>
                                {[
                                    { key: "rollNumber", label: "Roll No" },
                                    { key: "name", label: "Name" },
                                    { key: null, label: "Exam" },
                                    { key: null, label: "Shift" },
                                    { key: null, label: "Category" },
                                    { key: "rawScore", label: "Raw Score" },
                                    { key: "normalizedScore", label: "Norm." },
                                    { key: "overallRank", label: "Rank" },
                                    { key: "categoryRank", label: "Cat. Rank" },
                                    { key: null, label: "Accuracy" },
                                    { key: "createdAt", label: "Submitted" },
                                ].map((col, i) => (
                                    <th key={i} className={cn("p-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider", col.key && "cursor-pointer hover:text-gray-600 group")}
                                        onClick={col.key ? () => handleSort(col.key!) : undefined}>
                                        <div className="flex items-center gap-1">
                                            {col.label}
                                            {col.key && <SortIcon field={col.key} />}
                                        </div>
                                    </th>
                                ))}
                                <th className="p-3 pr-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        {Array.from({ length: 13 }).map((_, j) => (
                                            <td key={j} className="p-3"><div className="h-4 bg-gray-100 rounded-lg w-full max-w-[80px]" /></td>
                                        ))}
                                    </tr>
                                ))
                            ) : submissions.length === 0 ? (
                                <tr>
                                    <td colSpan={13} className="p-16 text-center">
                                        <Inbox className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                                        <p className="font-bold text-gray-500 text-base">No submissions found</p>
                                        <p className="text-xs text-gray-400 mt-1">Try adjusting your filters or search criteria</p>
                                    </td>
                                </tr>
                            ) : (
                                submissions.map((submission) => {
                                    const percentile = submission.overallRank && submission.totalCandidates
                                        ? calculatePercentile(submission.overallRank, submission.totalCandidates)
                                        : null;
                                    return (
                                        <tr key={submission.id} className="hover:bg-violet-50/30 transition-colors group">
                                            <td className="p-3 pl-4">
                                                <input type="checkbox" className="w-3.5 h-3.5 rounded accent-violet-500 cursor-pointer"
                                                    checked={selectedIds.includes(submission.id)}
                                                    onChange={(e) => handleSelectRow(submission.id, e.target.checked)} />
                                            </td>
                                            <td className="p-3">
                                                <span className="font-mono text-xs font-medium text-gray-500">{maskRollNumber(submission.rollNumber)}</span>
                                            </td>
                                            <td className="p-3">
                                                <Link href={`/admin/submissions/${submission.id}`} className="font-bold text-sm text-gray-900 hover:text-violet-600 transition-colors">{submission.name}</Link>
                                            </td>
                                            <td className="p-3"><span className="text-xs font-medium text-gray-500 truncate max-w-[160px] block">{submission.examName}</span></td>
                                            <td className="p-3">
                                                <span className="inline-block px-2 py-0.5 bg-gray-50 text-gray-500 text-[10px] font-bold border border-gray-100 rounded-md">{submission.shiftCode}</span>
                                            </td>
                                            <td className="p-3"><CategoryBadge category={submission.category} /></td>
                                            <td className="p-3"><ScoreIndicator score={submission.rawScore} examTotal={submission.examTotal} size="sm" /></td>
                                            <td className="p-3">
                                                {submission.normalizedScore !== null ? <span className="font-bold text-sm text-gray-900">{submission.normalizedScore.toFixed(2)}</span> : <span className="text-gray-300 text-xs">—</span>}
                                            </td>
                                            <td className="p-3">
                                                {submission.overallRank ? (
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-sm text-gray-900">#{submission.overallRank}</span>
                                                        {percentile !== null && <span className="text-[10px] text-gray-400">{percentile}%ile</span>}
                                                    </div>
                                                ) : <span className="text-gray-300 text-xs">—</span>}
                                            </td>
                                            <td className="p-3">
                                                {submission.categoryRank ? <span className="font-bold text-sm text-gray-900">#{submission.categoryRank}</span> : <span className="text-gray-300 text-xs">—</span>}
                                            </td>
                                            <td className="p-3">
                                                {submission.accuracy !== null ? (
                                                    <div className="space-y-0.5">
                                                        <span className="text-xs font-bold text-gray-900">{submission.accuracy.toFixed(1)}%</span>
                                                        <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                            <div className={cn("h-full rounded-full transition-all",
                                                                submission.accuracy >= 75 ? "bg-emerald-400" : submission.accuracy >= 50 ? "bg-amber-400" : "bg-red-400"
                                                            )} style={{ width: `${submission.accuracy}%` }} />
                                                        </div>
                                                    </div>
                                                ) : <span className="text-gray-300 text-xs">—</span>}
                                            </td>
                                            <td className="p-3">
                                                <span className="text-[11px] text-gray-400">{formatDistanceToNow(new Date(submission.createdAt), { addSuffix: true })}</span>
                                            </td>
                                            <td className="p-3 pr-4 text-right">
                                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Link href={`/admin/submissions/${submission.id}`} className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="View">
                                                        <Eye className="w-3.5 h-3.5" />
                                                    </Link>
                                                    <Link href={`/admin/submissions/${submission.id}/edit`} className="p-1.5 text-gray-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors" title="Edit">
                                                        <Pencil className="w-3.5 h-3.5" />
                                                    </Link>
                                                    <button type="button" onClick={() => handleDeleteSubmission(submission.id, submission.name)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3 text-xs text-gray-400 font-medium">
                        <span>Rows:</span>
                        <select value={limit} onChange={(e) => { /* limit is fixed at 20 */ }}
                            className="bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 focus:border-violet-400 outline-none font-bold text-gray-700 text-xs">
                            <option value="10">10</option><option value="20">20</option><option value="50">50</option><option value="100">100</option>
                        </select>
                        <span className="hidden sm:inline text-gray-500">
                            {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total.toLocaleString()}
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                            className="px-3 py-1.5 bg-white text-gray-600 font-bold border border-gray-200 rounded-lg hover:border-violet-300 disabled:opacity-40 disabled:hover:border-gray-200 transition-all text-xs flex items-center gap-1">
                            <ChevronLeft className="w-3.5 h-3.5" /> Prev
                        </button>
                        <span className="px-3 py-1.5 font-bold text-gray-700 text-xs">{pagination.page} / {pagination.totalPages}</span>
                        <button disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}
                            className="px-3 py-1.5 bg-white text-gray-600 font-bold border border-gray-200 rounded-lg hover:border-violet-300 disabled:opacity-40 disabled:hover:border-gray-200 transition-all text-xs flex items-center gap-1">
                            Next <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            </div>

            <BulkActionsBar selectedCount={selectedIds.length} onDelete={handleBulkDelete} onExport={handleBulkExport} onRecalculate={handleBulkRecalculate} onClearSelection={() => setSelectedIds([])} />

            <DeleteConfirmationModal isOpen={deleteModal.isOpen} onClose={() => setDeleteModal(prev => ({ ...prev, isOpen: false }))} onConfirm={deleteModal.onConfirm} title={deleteModal.title} message={deleteModal.message} isDeleting={deleteModal.isDeleting} />
        </div>
    );
}
