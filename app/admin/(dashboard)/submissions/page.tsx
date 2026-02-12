"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { CategoryBadge } from "@/components/admin/submissions/category-badge";
import { ScoreIndicator } from "@/components/admin/submissions/score-indicator";
import { BulkActionsBar } from "@/components/admin/submissions/bulk-actions-bar";
import { SubmissionFiltersPanel, type SubmissionFilters } from "@/components/admin/submissions/submission-filters";
import { DeleteConfirmationModal } from "@/components/admin/submissions/delete-confirmation-modal";
import { maskRollNumber, calculatePercentile } from "@/lib/helpers/submission-helpers";
import { cn } from "@/lib/utils";

interface Submission {
    id: number;
    rollNumber: string;
    name: string;
    examName: string;
    shiftCode: string;
    category: string;
    gender: string;
    rawScore: number;
    normalizedScore: number | null;
    overallRank: number | null;
    categoryRank: number | null;
    accuracy: number | null;
    totalCandidates: number;
    submittedAt: string;
    examTotalMarks: number;
}

interface Pagination {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export default function SubmissionsPage() {
    // State
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [exams, setExams] = useState<Array<{ id: number; name: string }>>([]);
    const [shifts, setShifts] = useState<Array<{ id: number; shiftCode: string }>>([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState<Pagination>({
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 1
    });
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [filters, setFilters] = useState<SubmissionFilters>({
        search: "",
        examId: "all",
        shiftId: "all",
        category: [],
        gender: "all",
        scoreMin: "",
        scoreMax: "",
        rankMin: "",
        rankMax: "",
        dateFrom: "",
        dateTo: "",
        source: "all",
    });
    const [sorting, setSorting] = useState({ field: "submittedAt", order: "desc" });
    const [deleteModal, setDeleteModal] = useState({
        isOpen: false,
        title: "",
        message: "",
        onConfirm: () => {},
        isDeleting: false
    });

    // Fetch exams for filter dropdown
    useEffect(() => {
        fetch("/api/admin/exams?isActive=true&limit=1000")
            .then((res) => res.json())
            .then((data) => {
                if (data.exams) {
                    setExams(data.exams.map((e: any) => ({ id: e.id, name: e.name })));
                }
            })
            .catch((err) => console.error("Failed to fetch exams:", err));
    }, []);

    // Fetch shifts when exam is selected
    useEffect(() => {
        if (filters.examId === "all") {
            setShifts([]);
            return;
        }

        fetch(`/api/admin/shifts?examId=${filters.examId}&limit=1000`)
            .then((res) => res.json())
            .then((data) => {
                if (data.shifts) {
                    setShifts(data.shifts.map((s: any) => ({ id: s.id, shiftCode: s.shiftCode })));
                }
            })
            .catch((err) => console.error("Failed to fetch shifts:", err));
    }, [filters.examId]);

    // Build query params from filters, sorting, and pagination
    const buildQueryParams = useCallback(() => {
        const params = new URLSearchParams({
            page: pagination.page.toString(),
            limit: pagination.limit.toString(),
            sort: sorting.field,
            order: sorting.order,
        });

        if (filters.search) params.append("search", filters.search);
        if (filters.examId !== "all") params.append("examId", filters.examId);
        if (filters.shiftId !== "all") params.append("shiftId", filters.shiftId);
        if (filters.category.length > 0) params.append("category", filters.category.join(","));
        if (filters.gender !== "all") params.append("gender", filters.gender);
        if (filters.scoreMin) params.append("scoreMin", filters.scoreMin);
        if (filters.scoreMax) params.append("scoreMax", filters.scoreMax);
        if (filters.rankMin) params.append("rankMin", filters.rankMin);
        if (filters.rankMax) params.append("rankMax", filters.rankMax);
        if (filters.dateFrom) params.append("dateFrom", filters.dateFrom);
        if (filters.dateTo) params.append("dateTo", filters.dateTo);
        if (filters.source !== "all") params.append("source", filters.source);

        return params;
    }, [pagination.page, pagination.limit, sorting, filters]);

    // Fetch submissions with debounced search
    const fetchSubmissions = useCallback(async () => {
        setLoading(true);
        try {
            const params = buildQueryParams();
            const res = await fetch(`/api/admin/submissions?${params}`);
            const data = await res.json();

            if (data.submissions) {
                setSubmissions(data.submissions);
                setPagination((prev) => ({ ...prev, ...data.pagination }));
            }
        } catch (error) {
            console.error("Failed to fetch submissions:", error);
        } finally {
            setLoading(false);
        }
    }, [buildQueryParams]);

    // Debounced fetch on filter/sort changes
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchSubmissions();
        }, 300);
        return () => clearTimeout(timer);
    }, [fetchSubmissions]);

    // Sorting handler
    const handleSort = (field: string) => {
        setSorting((prev) => ({
            field,
            order: prev.field === field && prev.order === "asc" ? "desc" : "asc",
        }));
    };

    // Selection handlers
    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedIds(submissions.map((s) => s.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectRow = (id: number, checked: boolean) => {
        if (checked) {
            setSelectedIds((prev) => [...prev, id]);
        } else {
            setSelectedIds((prev) => prev.filter((i) => i !== id));
        }
    };

    // Bulk actions
    const handleBulkDelete = () => {
        setDeleteModal({
            isOpen: true,
            title: "Delete Submissions",
            message: `Are you sure you want to delete ${selectedIds.length} submission(s)? This action cannot be undone.`,
            onConfirm: async () => {
                setDeleteModal((prev) => ({ ...prev, isDeleting: true }));
                try {
                    const res = await fetch("/api/admin/submissions/bulk-delete", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ ids: selectedIds }),
                    });

                    if (res.ok) {
                        await fetchSubmissions();
                        setSelectedIds([]);
                        setDeleteModal({ ...deleteModal, isOpen: false, isDeleting: false });
                    } else {
                        alert("Failed to delete submissions");
                        setDeleteModal((prev) => ({ ...prev, isDeleting: false }));
                    }
                } catch (error) {
                    console.error("Error deleting submissions:", error);
                    alert("Failed to delete submissions");
                    setDeleteModal((prev) => ({ ...prev, isDeleting: false }));
                }
            },
            isDeleting: false
        });
    };

    const handleBulkExport = async () => {
        try {
            const params = new URLSearchParams({ ids: selectedIds.join(",") });
            const res = await fetch(`/api/admin/submissions/export?${params}`);
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `submissions-${Date.now()}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error("Error exporting submissions:", error);
            alert("Failed to export submissions");
        }
    };

    const handleBulkRecalculate = async () => {
        if (!confirm(`Recalculate ranks for ${selectedIds.length} submission(s)? This may take a while.`)) {
            return;
        }

        try {
            const res = await fetch("/api/admin/submissions/recalculate-ranks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids: selectedIds }),
            });

            if (res.ok) {
                await fetchSubmissions();
                setSelectedIds([]);
                alert("Ranks recalculated successfully!");
            } else {
                alert("Failed to recalculate ranks");
            }
        } catch (error) {
            console.error("Error recalculating ranks:", error);
            alert("Failed to recalculate ranks");
        }
    };

    // Single submission delete
    const handleDeleteSubmission = (id: number, name: string) => {
        setDeleteModal({
            isOpen: true,
            title: "Delete Submission",
            message: `Are you sure you want to delete the submission for ${name}? This action cannot be undone.`,
            onConfirm: async () => {
                setDeleteModal((prev) => ({ ...prev, isDeleting: true }));
                try {
                    const res = await fetch(`/api/admin/submissions/${id}`, {
                        method: "DELETE",
                    });

                    if (res.ok) {
                        await fetchSubmissions();
                        setDeleteModal({ ...deleteModal, isOpen: false, isDeleting: false });
                    } else {
                        alert("Failed to delete submission");
                        setDeleteModal((prev) => ({ ...prev, isDeleting: false }));
                    }
                } catch (error) {
                    console.error("Error deleting submission:", error);
                    alert("Failed to delete submission");
                    setDeleteModal((prev) => ({ ...prev, isDeleting: false }));
                }
            },
            isDeleting: false
        });
    };

    const getSortIcon = (field: string) => {
        if (sorting.field !== field) {
            return <span className="material-symbols-outlined text-gray-400 text-sm opacity-0 group-hover:opacity-100">unfold_more</span>;
        }
        return (
            <span className="material-symbols-outlined text-sm">
                {sorting.order === "asc" ? "arrow_upward" : "arrow_downward"}
            </span>
        );
    };

    return (
        <div className="space-y-6 max-w-[1800px] mx-auto pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Submissions</h1>
                    <p className="text-gray-500 font-medium mt-1">
                        Manage and review all exam submissions
                    </p>
                </div>
                <div className="flex gap-3">
                    <Link
                        href="/admin/submissions/duplicates"
                        className="flex items-center gap-2 px-5 py-2.5 bg-white text-gray-900 font-bold rounded-xl border-2 border-gray-900 shadow-brutal hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all text-sm"
                    >
                        <span className="material-symbols-outlined text-xl">content_copy</span>
                        Duplicates
                    </Link>
                </div>
            </div>

            {/* Filters */}
            <SubmissionFiltersPanel
                filters={filters}
                onFiltersChange={setFilters}
                exams={exams}
                shifts={shifts}
            />

            {/* Table */}
            <div className="bg-white border-2 border-black shadow-brutal rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 border-b-2 border-gray-900">
                            <tr>
                                <th className="p-4 w-10">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 rounded border-2 border-black accent-black cursor-pointer"
                                        checked={selectedIds.length === submissions.length && submissions.length > 0}
                                        onChange={(e) => handleSelectAll(e.target.checked)}
                                    />
                                </th>
                                <th
                                    className="p-4 text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:text-gray-900 group"
                                    onClick={() => handleSort("rollNumber")}
                                >
                                    <div className="flex items-center gap-1">
                                        Roll Number
                                        {getSortIcon("rollNumber")}
                                    </div>
                                </th>
                                <th
                                    className="p-4 text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:text-gray-900 group"
                                    onClick={() => handleSort("name")}
                                >
                                    <div className="flex items-center gap-1">
                                        Name
                                        {getSortIcon("name")}
                                    </div>
                                </th>
                                <th className="p-4 text-xs font-bold text-gray-700 uppercase tracking-wider">
                                    Exam
                                </th>
                                <th className="p-4 text-xs font-bold text-gray-700 uppercase tracking-wider">
                                    Shift
                                </th>
                                <th className="p-4 text-xs font-bold text-gray-700 uppercase tracking-wider">
                                    Category
                                </th>
                                <th
                                    className="p-4 text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:text-gray-900 group"
                                    onClick={() => handleSort("rawScore")}
                                >
                                    <div className="flex items-center gap-1">
                                        Raw Score
                                        {getSortIcon("rawScore")}
                                    </div>
                                </th>
                                <th
                                    className="p-4 text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:text-gray-900 group"
                                    onClick={() => handleSort("normalizedScore")}
                                >
                                    <div className="flex items-center gap-1">
                                        Normalized
                                        {getSortIcon("normalizedScore")}
                                    </div>
                                </th>
                                <th
                                    className="p-4 text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:text-gray-900 group"
                                    onClick={() => handleSort("overallRank")}
                                >
                                    <div className="flex items-center gap-1">
                                        Overall Rank
                                        {getSortIcon("overallRank")}
                                    </div>
                                </th>
                                <th
                                    className="p-4 text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:text-gray-900 group"
                                    onClick={() => handleSort("categoryRank")}
                                >
                                    <div className="flex items-center gap-1">
                                        Category Rank
                                        {getSortIcon("categoryRank")}
                                    </div>
                                </th>
                                <th className="p-4 text-xs font-bold text-gray-700 uppercase tracking-wider">
                                    Accuracy
                                </th>
                                <th
                                    className="p-4 text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:text-gray-900 group"
                                    onClick={() => handleSort("submittedAt")}
                                >
                                    <div className="flex items-center gap-1">
                                        Submitted
                                        {getSortIcon("submittedAt")}
                                    </div>
                                </th>
                                <th className="p-4 text-xs font-bold text-gray-700 uppercase tracking-wider text-right">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="p-4"><div className="h-4 w-4 bg-gray-200 rounded"></div></td>
                                        <td className="p-4"><div className="h-5 w-32 bg-gray-200 rounded"></div></td>
                                        <td className="p-4"><div className="h-5 w-40 bg-gray-200 rounded"></div></td>
                                        <td className="p-4"><div className="h-5 w-48 bg-gray-200 rounded"></div></td>
                                        <td className="p-4"><div className="h-6 w-20 bg-gray-200 rounded"></div></td>
                                        <td className="p-4"><div className="h-6 w-16 bg-gray-200 rounded-full"></div></td>
                                        <td className="p-4"><div className="h-5 w-16 bg-gray-200 rounded"></div></td>
                                        <td className="p-4"><div className="h-5 w-16 bg-gray-200 rounded"></div></td>
                                        <td className="p-4"><div className="h-5 w-20 bg-gray-200 rounded"></div></td>
                                        <td className="p-4"><div className="h-5 w-20 bg-gray-200 rounded"></div></td>
                                        <td className="p-4"><div className="h-5 w-24 bg-gray-200 rounded"></div></td>
                                        <td className="p-4"><div className="h-5 w-24 bg-gray-200 rounded"></div></td>
                                        <td className="p-4"><div className="h-8 w-8 bg-gray-200 rounded ml-auto"></div></td>
                                    </tr>
                                ))
                            ) : submissions.length === 0 ? (
                                <tr>
                                    <td colSpan={13} className="p-12 text-center text-gray-500">
                                        <div className="flex flex-col items-center gap-3">
                                            <span className="material-symbols-outlined text-6xl text-gray-300">
                                                inbox
                                            </span>
                                            <p className="font-medium text-lg">No submissions found</p>
                                            <p className="text-sm text-gray-400">
                                                Try adjusting your filters or search criteria
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                submissions.map((submission) => {
                                    const percentile = submission.overallRank && submission.totalCandidates
                                        ? calculatePercentile(submission.overallRank, submission.totalCandidates)
                                        : null;

                                    return (
                                        <tr key={submission.id} className="hover:bg-gray-50 transition-colors group">
                                            <td className="p-4">
                                                <input
                                                    type="checkbox"
                                                    className="w-4 h-4 rounded border-2 border-black accent-black cursor-pointer"
                                                    checked={selectedIds.includes(submission.id)}
                                                    onChange={(e) => handleSelectRow(submission.id, e.target.checked)}
                                                />
                                            </td>
                                            <td className="p-4">
                                                <span className="font-mono text-sm font-medium text-gray-900">
                                                    {maskRollNumber(submission.rollNumber)}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <Link
                                                    href={`/admin/submissions/${submission.id}`}
                                                    className="font-bold text-gray-900 hover:text-blue-600 hover:underline"
                                                >
                                                    {submission.name}
                                                </Link>
                                            </td>
                                            <td className="p-4">
                                                <span className="text-sm font-medium text-gray-700">
                                                    {submission.examName}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <span className="inline-block px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-bold border border-gray-300 rounded-md">
                                                    {submission.shiftCode}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <CategoryBadge category={submission.category} />
                                            </td>
                                            <td className="p-4">
                                                <ScoreIndicator
                                                    score={submission.rawScore}
                                                    examTotal={submission.examTotalMarks || 200}
                                                    size="md"
                                                />
                                            </td>
                                            <td className="p-4">
                                                {submission.normalizedScore !== null ? (
                                                    <span className="font-bold text-gray-900">
                                                        {submission.normalizedScore.toFixed(2)}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400 text-sm">N/A</span>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                {submission.overallRank ? (
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-gray-900">
                                                            #{submission.overallRank}
                                                        </span>
                                                        {percentile !== null && (
                                                            <span className="text-xs text-gray-500">
                                                                {percentile}%ile
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 text-sm">—</span>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                {submission.categoryRank ? (
                                                    <span className="font-bold text-gray-900">
                                                        #{submission.categoryRank}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400 text-sm">—</span>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                {submission.accuracy !== null ? (
                                                    <div className="space-y-1">
                                                        <span className="text-sm font-bold text-gray-900">
                                                            {submission.accuracy.toFixed(1)}%
                                                        </span>
                                                        <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                                                            <div
                                                                className={cn(
                                                                    "h-full rounded-full transition-all",
                                                                    submission.accuracy >= 75
                                                                        ? "bg-green-500"
                                                                        : submission.accuracy >= 50
                                                                        ? "bg-yellow-500"
                                                                        : "bg-red-500"
                                                                )}
                                                                style={{ width: `${submission.accuracy}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 text-sm">N/A</span>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                <span className="text-sm text-gray-500">
                                                    {formatDistanceToNow(new Date(submission.submittedAt), {
                                                        addSuffix: true,
                                                    })}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Link
                                                        href={`/admin/submissions/${submission.id}`}
                                                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="View"
                                                    >
                                                        <span className="material-symbols-outlined text-lg">
                                                            visibility
                                                        </span>
                                                    </Link>
                                                    <Link
                                                        href={`/admin/submissions/${submission.id}/edit`}
                                                        className="p-1.5 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                                                        title="Edit"
                                                    >
                                                        <span className="material-symbols-outlined text-lg">
                                                            edit
                                                        </span>
                                                    </Link>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteSubmission(submission.id, submission.name)}
                                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Delete"
                                                    >
                                                        <span className="material-symbols-outlined text-lg">
                                                            delete
                                                        </span>
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
                <div className="p-4 border-t-2 border-gray-100 bg-gray-50 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4 text-sm text-gray-500 font-medium">
                        <span>Rows per page:</span>
                        <select
                            value={pagination.limit}
                            onChange={(e) =>
                                setPagination((prev) => ({ ...prev, limit: Number(e.target.value), page: 1 }))
                            }
                            className="bg-white border-2 border-gray-200 rounded-lg px-3 py-1.5 focus:border-black outline-none font-bold"
                        >
                            <option value="10">10</option>
                            <option value="20">20</option>
                            <option value="50">50</option>
                            <option value="100">100</option>
                        </select>
                        <span className="hidden sm:inline font-bold text-gray-700">
                            Showing {(pagination.page - 1) * pagination.limit + 1}-
                            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            disabled={pagination.page === 1}
                            onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                            className="px-4 py-2 bg-white text-gray-700 font-bold border-2 border-gray-200 rounded-lg hover:border-black disabled:opacity-50 disabled:hover:border-gray-200 transition-all"
                        >
                            Previous
                        </button>
                        <span className="px-4 py-2 font-bold text-gray-900">
                            Page {pagination.page} of {pagination.totalPages}
                        </span>
                        <button
                            disabled={pagination.page >= pagination.totalPages}
                            onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                            className="px-4 py-2 bg-white text-gray-700 font-bold border-2 border-gray-200 rounded-lg hover:border-black disabled:opacity-50 disabled:hover:border-gray-200 transition-all"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>

            {/* Bulk Actions Bar */}
            <BulkActionsBar
                selectedCount={selectedIds.length}
                onDelete={handleBulkDelete}
                onExport={handleBulkExport}
                onRecalculate={handleBulkRecalculate}
                onClearSelection={() => setSelectedIds([])}
            />

            {/* Delete Confirmation Modal */}
            <DeleteConfirmationModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal((prev) => ({ ...prev, isOpen: false }))}
                onConfirm={deleteModal.onConfirm}
                title={deleteModal.title}
                message={deleteModal.message}
                isDeleting={deleteModal.isDeleting}
            />
        </div>
    );
}
