"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { Search, Plus, ChevronUp, ChevronDown, ArrowUpDown, Copy, Pencil, Archive, ArchiveRestore, Eye, Trash2, CheckCircle2, XCircle, Loader2, AlertTriangle, Database, FileBarChart, Users, Activity, X, RefreshCw } from "lucide-react";
import { Dialog, StatCard } from "@/components/admin/ui";
import { useExams, useExamStats, useArchiveStatus, useArchiveExam, useRestoreExam, useDeleteExam, useDuplicateExam, useBulkExamAction, type Exam } from "@/hooks/admin/use-exams";

type ModalType = "archive" | "restore" | "bulk" | "result" | "deleteExam" | null;

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function ExamsPage() {
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    // Modal state
    const [modal, setModal] = useState<ModalType>(null);
    const [modalExam, setModalExam] = useState<Exam | null>(null);
    const [modalResult, setModalResult] = useState<{ success: boolean; message: string; details?: string } | null>(null);
    const [bulkAction, setBulkAction] = useState<"delete" | "activate" | "deactivate" | null>(null);

    // Filters & Sorting
    const [filters, setFilters] = useState({ search: "", agency: "all", year: "all", status: "all", isActive: "all" });
    const [sorting, setSorting] = useState({ field: "createdAt", order: "desc" });
    const selectCls = "h-9 px-3 border border-gray-200 rounded-lg bg-white text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400 transition-all cursor-pointer";

    // ── React Query Hooks ────────────────────────────────────────────────────

    const { data: examsData, isLoading: loading } = useExams(filters, sorting, page, limit);
    const exams = examsData?.exams || [];
    const pagination = examsData?.pagination || { total: 0, page: 1, limit: 10, totalPages: 1 };

    const { data: stats } = useExamStats();
    const examStats = stats || { total: 0, active: 0, archived: 0, totalSubs: 0 };

    const archiveCandidateIds = exams.filter(e => !e.isActive || e.status === "closed").map(e => e.id);
    const { data: archiveStatuses } = useArchiveStatus(archiveCandidateIds);

    const archiveExam = useArchiveExam();
    const restoreExam = useRestoreExam();
    const deleteExam = useDeleteExam();
    const duplicateExam = useDuplicateExam();
    const bulkExamAction = useBulkExamAction();

    const archivingId = archiveExam.isPending ? (archiveExam.variables as number) : null;
    const restoringId = restoreExam.isPending ? (restoreExam.variables as number) : null;

    // ── Handlers ─────────────────────────────────────────────────────────────

    const handleSort = (field: string) => setSorting(prev => ({ field, order: prev.field === field && prev.order === "asc" ? "desc" : "asc" }));

    const SortIcon = ({ field }: { field: string }) => sorting.field === field
        ? (sorting.order === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)
        : <ArrowUpDown className="w-3 h-3 text-gray-300" />;

    const handleSelectAll = (checked: boolean) => setSelectedIds(checked ? exams.map(e => e.id) : []);
    const handleSelectRow = (id: number, checked: boolean) => setSelectedIds(prev => checked ? [...prev, id] : prev.filter(i => i !== id));

    // ── Archive flow with modal ──────────────────────────────────────────────

    const openArchive = (exam: Exam) => { setModalExam(exam); setModal("archive"); };
    const openRestore = (exam: Exam) => { setModalExam(exam); setModal("restore"); };

    const confirmArchive = () => {
        if (!modalExam) return;
        setModal(null);
        archiveExam.mutate(modalExam.id, {
            onSuccess: (data: any) => {
                setModalResult({ success: true, message: "Exam archived successfully!", details: `${data.archive?.submissionsArchived?.toLocaleString()} submissions → ${data.archive?.fileSizeMB} MB SQLite file` });
                setModal("result");
            },
            onError: (err: any) => { setModalResult({ success: false, message: "Archive failed", details: err.message }); setModal("result"); },
        });
    };

    const confirmRestore = () => {
        if (!modalExam) return;
        setModal(null);
        restoreExam.mutate(modalExam.id, {
            onSuccess: (data: any) => {
                setModalResult({ success: true, message: "Exam restored successfully!", details: `${data.submissionsRestored?.toLocaleString()} submissions re-imported to PostgreSQL` });
                setModal("result");
            },
            onError: (err: any) => { setModalResult({ success: false, message: "Restore failed", details: err.message }); setModal("result"); },
        });
    };

    // ── Bulk actions with modal ──────────────────────────────────────────────

    const openBulkAction = (action: "delete" | "activate" | "deactivate") => { setBulkAction(action); setModal("bulk"); };

    const confirmBulkAction = () => {
        if (!bulkAction) return;
        setModal(null);
        bulkExamAction.mutate({ ids: selectedIds, action: bulkAction }, {
            onSuccess: () => {
                setModalResult({ success: true, message: `${bulkAction === "delete" ? "Deleted" : bulkAction === "activate" ? "Activated" : "Deactivated"} ${selectedIds.length} exam(s)` });
                setSelectedIds([]);
                setModal("result");
            },
            onError: () => { setModalResult({ success: false, message: "Bulk action failed" }); setModal("result"); },
        });
    };

    const handleDuplicate = (id: number) => {
        duplicateExam.mutate(id, {
            onSuccess: () => { setModalResult({ success: true, message: "Exam duplicated successfully!" }); setModal("result"); },
            onError: () => { setModalResult({ success: false, message: "Duplicate request failed" }); setModal("result"); },
        });
    };

    const [deleteBreakdown, setDeleteBreakdown] = useState<{ submissions: number; shifts: number; cutoffs: number } | null>(null);

    const openDeleteExam = (exam: Exam) => {
        setModalExam(exam);
        setDeleteBreakdown(null);
        setModal("deleteExam");
    };

    const confirmDeleteExam = async () => {
        if (!modalExam) return;
        const examName = modalExam.name;
        const examId = modalExam.id;
        setModal(null);
        try {
            const res = await fetch(`/api/admin/exams/${examId}`, { method: "DELETE" });
            let data: any = {};
            try { data = await res.json(); } catch { data = { error: `Server returned ${res.status}` }; }
            if (res.ok && data.success) {
                const d = data.deleted;
                const details = d ? `Removed ${d.submissions.toLocaleString()} submissions, ${d.shifts} shifts, ${d.cutoffs} cutoffs` : undefined;
                setModalResult({ success: true, message: `"${examName}" deleted successfully`, details });
                deleteExam.mutate({ id: examId }); // trigger cache invalidation
                setModal("result");
            } else if (data.blocked && data.breakdown) {
                setDeleteBreakdown(data.breakdown);
                setModal("deleteExam");
            } else {
                setModalResult({ success: false, message: `Delete failed (${res.status})`, details: data.error });
                setModal("result");
            }
        } catch (err: any) {
            setModalResult({ success: false, message: "Delete request failed", details: err.message });
            setModal("result");
        }
    };

    const confirmForceDelete = () => {
        if (!modalExam) return;
        const examName = modalExam.name;
        setModal(null);
        deleteExam.mutate({ id: modalExam.id, force: true }, {
            onSuccess: (data: any) => {
                const d = data.deleted;
                const details = d ? `Permanently removed: ${d.submissions.toLocaleString()} submissions, ${d.shifts} shifts, ${d.cutoffs} cutoffs` : undefined;
                setModalResult({ success: true, message: `"${examName}" force-deleted`, details });
                setDeleteBreakdown(null);
                setModal("result");
            },
            onError: (err: any) => {
                setModalResult({ success: false, message: "Force delete request failed", details: err.message });
                setDeleteBreakdown(null);
                setModal("result");
            },
        });
    };

    // ── Phase & status helpers ───────────────────────────────────────────────

    const phaseColors: Record<string, string> = {
        collecting: "bg-blue-50 text-blue-600 border-blue-200",
        analyzing: "bg-violet-50 text-violet-600 border-violet-200",
        normalizing: "bg-amber-50 text-amber-600 border-amber-200",
        publishing: "bg-emerald-50 text-emerald-600 border-emerald-200",
        completed: "bg-green-50 text-green-600 border-green-200",
    };

    const statusConfig: Record<string, { dot: string; bg: string }> = {
        active: { dot: "bg-emerald-500", bg: "bg-emerald-50 text-emerald-700 border-emerald-200" },
        upcoming: { dot: "bg-amber-500", bg: "bg-amber-50 text-amber-700 border-amber-200" },
        closed: { dot: "bg-gray-400", bg: "bg-gray-100 text-gray-600 border-gray-200" },
    };

    // ── Render ───────────────────────────────────────────────────────────────

    return (
        <div className="space-y-5 max-w-[1600px] mx-auto pb-10">
            {/* ── Header ── */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Exam Management</h1>
                    <p className="text-gray-500 font-medium mt-1">Create, manage, archive, and organize all examinations</p>
                </div>
                <Link href="/admin/exams/create" className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-xl font-bold text-sm hover:bg-gray-800 transition-colors shadow-lg shadow-gray-900/20">
                    <Plus className="w-4 h-4" /> Create Exam
                </Link>
            </div>

            {/* ── Summary Cards ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard icon={FileBarChart} label="Total Exams" value={examStats.total} color="bg-violet-50 text-violet-600" />
                <StatCard icon={Activity} label="Active" value={examStats.active} color="bg-emerald-50 text-emerald-600" />
                <StatCard icon={Archive} label="Archived / Closed" value={examStats.archived} color="bg-amber-50 text-amber-600" />
                <StatCard icon={Users} label="Total Submissions" value={examStats.totalSubs.toLocaleString()} color="bg-blue-50 text-blue-600" />
            </div>

            {/* ── Toolbar ── */}
            <div className="bg-white rounded-xl border border-gray-100 p-3 flex flex-col lg:flex-row gap-3 justify-between items-center">
                <div className="flex flex-wrap gap-2 w-full lg:w-auto">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                        <input type="text" placeholder="Search exams…" className="h-9 pl-9 pr-4 border border-gray-200 rounded-lg bg-white text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400 w-full sm:w-56 transition-all"
                            value={filters.search} onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))} />
                    </div>
                    <select className={selectCls} value={filters.agency} onChange={e => setFilters(prev => ({ ...prev, agency: e.target.value }))}>
                        <option value="all">All Agencies</option>
                        <option value="SSC">SSC</option><option value="RRB">RRB</option><option value="IBPS">IBPS</option><option value="NTA">NTA</option>
                    </select>
                    <select className={selectCls} value={filters.status} onChange={e => setFilters(prev => ({ ...prev, status: e.target.value }))}>
                        <option value="all">All Statuses</option>
                        <option value="upcoming">Upcoming</option><option value="active">Active</option><option value="closed">Closed</option>
                    </select>
                    <select className={selectCls} value={filters.year} onChange={e => setFilters(prev => ({ ...prev, year: e.target.value }))}>
                        <option value="all">All Years</option>
                        {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <select className={selectCls} value={filters.isActive} onChange={e => setFilters(prev => ({ ...prev, isActive: e.target.value }))}>
                        <option value="all">All</option><option value="true">Active Only</option><option value="false">Deactivated</option>
                    </select>
                </div>

                {selectedIds.length > 0 && (
                    <div className="flex items-center gap-1.5 bg-gray-900 text-white pl-4 pr-2 py-1.5 rounded-xl text-xs font-bold shrink-0">
                        <span>{selectedIds.length} selected</span>
                        <div className="h-4 w-px bg-gray-700 mx-1" />
                        <button onClick={() => openBulkAction("activate")} className="p-1 hover:text-green-400 transition-colors" title="Activate"><CheckCircle2 className="w-4 h-4" /></button>
                        <button onClick={() => openBulkAction("deactivate")} className="p-1 hover:text-yellow-400 transition-colors" title="Deactivate"><XCircle className="w-4 h-4" /></button>
                        <button onClick={() => openBulkAction("delete")} className="p-1 hover:text-red-400 transition-colors" title="Delete"><Trash2 className="w-4 h-4" /></button>
                        <button onClick={() => setSelectedIds([])} className="p-1 hover:text-gray-400 transition-colors ml-1" title="Clear"><X className="w-3.5 h-3.5" /></button>
                    </div>
                )}
            </div>

            {/* ── Table ── */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50/80 border-b border-gray-100">
                            <tr>
                                <th className="p-3 w-10">
                                    <input type="checkbox" className="w-3.5 h-3.5 rounded border-gray-300 text-violet-500 focus:ring-violet-300"
                                        checked={selectedIds.length === exams.length && exams.length > 0} onChange={e => handleSelectAll(e.target.checked)} />
                                </th>
                                <th className="p-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider cursor-pointer select-none" onClick={() => handleSort("name")}>
                                    <span className="flex items-center gap-1">Exam <SortIcon field="name" /></span>
                                </th>
                                <th className="p-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Agency</th>
                                <th className="p-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider cursor-pointer select-none" onClick={() => handleSort("year")}>
                                    <span className="flex items-center gap-1">Year <SortIcon field="year" /></span>
                                </th>
                                <th className="p-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="p-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Phase</th>
                                <th className="p-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-center cursor-pointer select-none" onClick={() => handleSort("totalSubmissions")}>
                                    <span className="flex items-center justify-center gap-1">Subs <SortIcon field="totalSubmissions" /></span>
                                </th>
                                <th className="p-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-center">Shifts</th>
                                <th className="p-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right cursor-pointer select-none" onClick={() => handleSort("updatedAt")}>
                                    <span className="flex items-center justify-end gap-1">Updated <SortIcon field="updatedAt" /></span>
                                </th>
                                <th className="p-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? Array.from({ length: 5 }).map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    <td className="p-3"><div className="h-3.5 w-3.5 bg-gray-200 rounded" /></td>
                                    <td className="p-3"><div className="h-4 w-44 bg-gray-200 rounded" /></td>
                                    <td className="p-3"><div className="h-5 w-12 bg-gray-200 rounded" /></td>
                                    <td className="p-3"><div className="h-4 w-10 bg-gray-200 rounded" /></td>
                                    <td className="p-3"><div className="h-5 w-16 bg-gray-200 rounded-full" /></td>
                                    <td className="p-3"><div className="h-5 w-16 bg-gray-200 rounded-full" /></td>
                                    <td className="p-3"><div className="h-4 w-10 bg-gray-200 rounded mx-auto" /></td>
                                    <td className="p-3"><div className="h-4 w-8 bg-gray-200 rounded mx-auto" /></td>
                                    <td className="p-3"><div className="h-4 w-16 bg-gray-200 rounded ml-auto" /></td>
                                    <td className="p-3"><div className="h-6 w-20 bg-gray-200 rounded ml-auto" /></td>
                                </tr>
                            )) : exams.length === 0 ? (
                                <tr><td colSpan={10} className="p-16 text-center">
                                    <Database className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                                    <p className="text-sm font-semibold text-gray-500">No exams found</p>
                                    <p className="text-xs text-gray-400 mt-1">Try adjusting your filters or create a new exam</p>
                                </td></tr>
                            ) : exams.map(exam => {
                                const sc = statusConfig[exam.status] || statusConfig.closed;
                                const archInfo = archiveStatuses?.[exam.id];
                                const isProcessing = archivingId === exam.id || restoringId === exam.id;

                                return (
                                    <tr key={exam.id} className="hover:bg-gray-50/60 transition-colors group">
                                        <td className="p-3">
                                            <input type="checkbox" className="w-3.5 h-3.5 rounded border-gray-300 text-violet-500 focus:ring-violet-300"
                                                checked={selectedIds.includes(exam.id)} onChange={e => handleSelectRow(exam.id, e.target.checked)} />
                                        </td>
                                        <td className="p-3">
                                            <Link href={`/admin/exams/${exam.id}`} className={cn("text-sm font-bold hover:underline block", !exam.isActive ? "text-gray-400" : "text-gray-900 hover:text-violet-600")}>
                                                {exam.name}{exam.tier ? ` ${exam.tier}` : ""}
                                            </Link>
                                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                                <span className="text-[10px] text-gray-400 font-mono">/{exam.slug}</span>
                                                {!exam.isActive && <span className="text-[9px] uppercase font-extrabold bg-red-50 text-red-500 px-1 py-px rounded border border-red-200">Inactive</span>}
                                                {archInfo?.exists && (
                                                    <span className="text-[9px] uppercase font-extrabold bg-amber-50 text-amber-600 px-1 py-px rounded border border-amber-200 inline-flex items-center gap-0.5">
                                                        <Archive className="w-2.5 h-2.5" /> {archInfo.fileSizeMB} MB
                                                    </span>
                                                )}
                                                {isProcessing && <Loader2 className="w-3 h-3 text-violet-500 animate-spin" />}
                                            </div>
                                        </td>
                                        <td className="p-3">
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200">{exam.agency}</span>
                                        </td>
                                        <td className="p-3 text-xs font-semibold text-gray-600">{exam.year}</td>
                                        <td className="p-3">
                                            <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border", sc.bg)}>
                                                <span className={cn("w-1.5 h-1.5 rounded-full", sc.dot)} />
                                                {exam.status}
                                            </span>
                                        </td>
                                        <td className="p-3">
                                            {exam.analysisPhase && (
                                                <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", phaseColors[exam.analysisPhase] || "bg-gray-50 text-gray-500 border-gray-200")}>
                                                    {exam.analysisPhase}
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-3 text-center">
                                            <span className="text-xs font-bold text-gray-700">{(exam.totalSubmissions || 0).toLocaleString()}</span>
                                        </td>
                                        <td className="p-3 text-center">
                                            <span className="text-xs font-bold text-gray-700">{exam.totalShifts || 0}</span>
                                        </td>
                                        <td className="p-3 text-right">
                                            {exam.updatedAt && (
                                                <span className="text-[10px] text-gray-400 font-medium">{formatDistanceToNow(new Date(exam.updatedAt), { addSuffix: true })}</span>
                                            )}
                                        </td>
                                        <td className="p-3 text-right">
                                            <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {/* Archive button — only for closed/inactive with submissions */}
                                                {(!exam.isActive || exam.status === "closed") && !archInfo?.exists && (exam.totalSubmissions || 0) > 0 && (
                                                    <button onClick={() => openArchive(exam)} disabled={isProcessing}
                                                        className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors disabled:opacity-30" title="Archive to SQLite">
                                                        <Archive className="w-4 h-4" />
                                                    </button>
                                                )}
                                                {/* Restore + View buttons — only for archived */}
                                                {archInfo?.exists && (<>
                                                    <button onClick={() => openRestore(exam)} disabled={isProcessing}
                                                        className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-30" title="Restore from archive">
                                                        <ArchiveRestore className="w-4 h-4" />
                                                    </button>
                                                    <a href={`/api/archive/${exam.slug}?type=summary`} target="_blank"
                                                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="View archive data">
                                                        <Eye className="w-4 h-4" />
                                                    </a>
                                                </>)}
                                                <button onClick={() => handleDuplicate(exam.id)}
                                                    className="p-1.5 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors" title="Duplicate">
                                                    <Copy className="w-4 h-4" />
                                                </button>
                                                <Link href={`/admin/exams/${exam.id}`}
                                                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                                                    <Pencil className="w-4 h-4" />
                                                </Link>
                                                <button onClick={() => openDeleteExam(exam)}
                                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* ── Pagination ── */}
                <div className="p-3 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-50/50">
                    <div className="flex items-center gap-3 text-xs text-gray-500 font-medium">
                        <span>Rows:</span>
                        <select value={limit} onChange={e => { setLimit(Number(e.target.value)); setPage(1); }}
                            className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-violet-200">
                            <option value="10">10</option><option value="20">20</option><option value="50">50</option>
                        </select>
                        <span className="hidden sm:inline text-gray-400">
                            {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                            className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-700 hover:border-gray-400 disabled:opacity-40 transition-all">Previous</button>
                        <span className="px-3 text-xs font-bold text-gray-900">{pagination.page} / {pagination.totalPages || 1}</span>
                        <button disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}
                            className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-700 hover:border-gray-400 disabled:opacity-40 transition-all">Next</button>
                    </div>
                </div>
            </div>

            {/* ═══════════ MODALS ═══════════ */}

            {/* Archive Confirmation */}
            <Dialog open={modal === "archive"} onClose={() => setModal(null)}>
                <div className="p-6">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-4">
                        <Archive className="w-6 h-6 text-amber-600" />
                    </div>
                    <h3 className="text-lg font-black text-gray-900 text-center">Archive Exam</h3>
                    <p className="text-sm text-gray-500 text-center mt-1">{modalExam?.name}</p>

                    <div className="mt-5 space-y-3">
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                            <div className="flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                                <div className="text-xs text-amber-800">
                                    <p className="font-bold">This action will:</p>
                                    <ul className="mt-1 space-y-0.5 list-disc list-inside text-amber-700">
                                        <li>Export all <strong>{(modalExam?.totalSubmissions || 0).toLocaleString()}</strong> submissions to a SQLite file</li>
                                        <li><strong>Delete</strong> submissions from PostgreSQL</li>
                                        <li>Mark the exam as closed & inactive</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                        <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                            <div className="text-xs text-green-800">
                                <p className="font-bold">What stays in PostgreSQL:</p>
                                <p className="text-green-700 mt-0.5">Exam metadata, shifts, cutoffs, analytics — all lightweight data remains</p>
                            </div>
                        </div>
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                            <div className="text-xs text-blue-800">
                                <p className="font-bold">Reversible:</p>
                                <p className="text-blue-700 mt-0.5">You can restore the data anytime from the SQLite archive</p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 flex gap-3">
                        <button onClick={() => setModal(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
                        <button onClick={confirmArchive} className="flex-1 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-bold hover:bg-amber-600 transition-colors flex items-center justify-center gap-2">
                            <Archive className="w-4 h-4" /> Archive Now
                        </button>
                    </div>
                </div>
            </Dialog>

            {/* Restore Confirmation */}
            <Dialog open={modal === "restore"} onClose={() => setModal(null)}>
                <div className="p-6">
                    <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-4">
                        <ArchiveRestore className="w-6 h-6 text-green-600" />
                    </div>
                    <h3 className="text-lg font-black text-gray-900 text-center">Restore Exam</h3>
                    <p className="text-sm text-gray-500 text-center mt-1">{modalExam?.name}</p>

                    <div className="mt-5 space-y-3">
                        <div className="bg-gray-50 rounded-xl p-3">
                            <div className="flex justify-between text-xs">
                                <span className="text-gray-500">Archive size</span>
                                <span className="font-bold text-gray-900">{archiveStatuses?.[modalExam?.id || 0]?.fileSizeMB || "?"} MB</span>
                            </div>
                            <div className="flex justify-between text-xs mt-2">
                                <span className="text-gray-500">Submissions</span>
                                <span className="font-bold text-gray-900">{(archiveStatuses?.[modalExam?.id || 0]?.submissionCount || 0).toLocaleString()}</span>
                            </div>
                        </div>
                        <div className="text-xs text-gray-500 text-center">
                            All submissions will be re-imported to PostgreSQL. The archive file will be deleted after successful restore.
                        </div>
                    </div>

                    <div className="mt-6 flex gap-3">
                        <button onClick={() => setModal(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
                        <button onClick={confirmRestore} className="flex-1 py-2.5 bg-green-500 text-white rounded-xl text-sm font-bold hover:bg-green-600 transition-colors flex items-center justify-center gap-2">
                            <ArchiveRestore className="w-4 h-4" /> Restore Now
                        </button>
                    </div>
                </div>
            </Dialog>

            {/* Bulk Action Confirmation */}
            <Dialog open={modal === "bulk"} onClose={() => setModal(null)}>
                <div className="p-6">
                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4",
                        bulkAction === "delete" ? "bg-red-50" : bulkAction === "activate" ? "bg-green-50" : "bg-amber-50")}>
                        {bulkAction === "delete" ? <Trash2 className="w-6 h-6 text-red-600" /> :
                            bulkAction === "activate" ? <CheckCircle2 className="w-6 h-6 text-green-600" /> :
                                <XCircle className="w-6 h-6 text-amber-600" />}
                    </div>
                    <h3 className="text-lg font-black text-gray-900 text-center capitalize">{bulkAction} {selectedIds.length} Exam(s)</h3>
                    <p className="text-sm text-gray-500 text-center mt-2">
                        {bulkAction === "delete" && filters.isActive === "false"
                            ? "⚠️ This will PERMANENTLY DELETE these exams and all associated data."
                            : `Are you sure you want to ${bulkAction} the selected exams?`}
                    </p>
                    <div className="mt-6 flex gap-3">
                        <button onClick={() => setModal(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
                        <button onClick={confirmBulkAction} className={cn("flex-1 py-2.5 text-white rounded-xl text-sm font-bold transition-colors",
                            bulkAction === "delete" ? "bg-red-500 hover:bg-red-600" : bulkAction === "activate" ? "bg-green-500 hover:bg-green-600" : "bg-amber-500 hover:bg-amber-600")}>
                            Confirm
                        </button>
                    </div>
                </div>
            </Dialog>

            {/* Delete Exam Confirmation */}
            <Dialog open={modal === "deleteExam"} onClose={() => { setModal(null); setDeleteBreakdown(null); }}>
                <div className="p-6">
                    <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
                        <Trash2 className="w-6 h-6 text-red-600" />
                    </div>
                    <h3 className="text-lg font-black text-gray-900 text-center">Delete Exam</h3>
                    <p className="text-sm text-gray-500 text-center mt-1">{modalExam?.name}</p>

                    {!deleteBreakdown ? (
                        /* ── Initial State: simple warning ── */
                        <div className="mt-5">
                            <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                                <div className="flex items-start gap-2">
                                    <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                                    <div className="text-xs text-red-800">
                                        <p className="font-bold">This action is permanent.</p>
                                        <p className="text-red-700 mt-0.5">The exam, shifts, cutoffs, and analytics will be permanently deleted.</p>
                                        {(modalExam?.totalSubmissions || 0) > 0 && (
                                            <p className="text-red-700 mt-1">This exam has <strong>{(modalExam?.totalSubmissions || 0).toLocaleString()}</strong> submissions — you will be asked to confirm.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="mt-6 flex gap-3">
                                <button onClick={() => setModal(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
                                <button onClick={confirmDeleteExam} className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 transition-colors flex items-center justify-center gap-2">
                                    <Trash2 className="w-4 h-4" /> Delete
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* ── Breakdown State: exam has submissions, show what will be destroyed ── */
                        <div className="mt-5 space-y-3">
                            <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                                <div className="flex items-start gap-2">
                                    <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                                    <div className="text-xs text-red-800 font-bold">
                                        This exam has active data. Force deleting will PERMANENTLY destroy:
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gray-50 rounded-xl divide-y divide-gray-200">
                                <div className="flex justify-between p-3">
                                    <div className="flex items-center gap-2 text-xs text-gray-600"><Users className="w-3.5 h-3.5" /> Student Submissions</div>
                                    <span className="text-xs font-black text-red-600">{deleteBreakdown.submissions.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between p-3">
                                    <div className="flex items-center gap-2 text-xs text-gray-600"><Activity className="w-3.5 h-3.5" /> Shifts</div>
                                    <span className="text-xs font-black text-gray-900">{deleteBreakdown.shifts}</span>
                                </div>
                                <div className="flex justify-between p-3">
                                    <div className="flex items-center gap-2 text-xs text-gray-600"><FileBarChart className="w-3.5 h-3.5" /> Cutoffs</div>
                                    <span className="text-xs font-black text-gray-900">{deleteBreakdown.cutoffs}</span>
                                </div>
                            </div>

                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                                <div className="text-xs text-amber-800">
                                    <p className="font-bold">💡 Recommended: Archive instead</p>
                                    <p className="text-amber-700 mt-0.5">Archiving preserves submissions in a SQLite file and frees PostgreSQL storage. You can restore later.</p>
                                    <button
                                        onClick={() => { setModal(null); setDeleteBreakdown(null); if (modalExam) openArchive(modalExam); }}
                                        className="mt-2 w-full py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                                    >
                                        <Archive className="w-3.5 h-3.5" /> Archive Instead
                                    </button>
                                </div>
                            </div>

                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                                <div className="text-xs text-blue-800">
                                    <p className="font-bold">📝 This action will be logged</p>
                                    <p className="text-blue-700 mt-0.5">Force deletions are recorded in System Logs with full details for admin audit.</p>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-1">
                                <button onClick={() => { setModal(null); setDeleteBreakdown(null); }} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
                                <button onClick={confirmForceDelete} className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-colors flex items-center justify-center gap-2">
                                    <Trash2 className="w-4 h-4" /> Force Delete
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </Dialog>

            {/* Result Modal */}
            <Dialog open={modal === "result"} onClose={() => { setModal(null); setModalResult(null); }}>
                <div className="p-6 text-center">
                    <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4", modalResult?.success ? "bg-green-50" : "bg-red-50")}>
                        {modalResult?.success ? <CheckCircle2 className="w-7 h-7 text-green-600" /> : <XCircle className="w-7 h-7 text-red-600" />}
                    </div>
                    <h3 className="text-lg font-black text-gray-900">{modalResult?.message}</h3>
                    {modalResult?.details && <p className="text-sm text-gray-500 mt-2">{modalResult.details}</p>}
                    <button onClick={() => { setModal(null); setModalResult(null); }}
                        className="mt-6 w-full py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-colors">Done</button>
                </div>
            </Dialog>
        </div>
    );
}
