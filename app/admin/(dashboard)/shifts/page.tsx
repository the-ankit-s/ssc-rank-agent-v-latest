"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface Shift {
    id: number;
    shiftCode: string;
    date: string;
    startTime: string;
    endTime: string;
    examName: string;
    timeSlot: string;
    candidateCount: number;
    avgRawScore?: number;
    difficultyLabel?: string;
}

interface Pagination {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

interface ExamOption {
    id: number;
    name: string;
}

export default function ShiftsPage() {
    // State
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, limit: 10, totalPages: 1 });
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [exams, setExams] = useState<ExamOption[]>([]);

    // Filters & Sorting
    const [filters, setFilters] = useState({
        examId: "all",
        dateFrom: "",
        dateTo: "",
        timeSlot: "all",
        difficulty: "all"
    });
    const [sorting, setSorting] = useState({ field: "date", order: "desc" });

    // Fetch Exams for Filter
    useEffect(() => {
        fetch("/api/admin/exams?limit=100") // Fetch enough exams for dropdown
            .then(res => res.json())
            .then(data => {
                if (data.exams) setExams(data.exams);
            });
    }, []);

    // Fetch Shifts
    const fetchShifts = useCallback(async () => {
        setLoading(true);
        const params = new URLSearchParams({
            page: pagination.page.toString(),
            limit: pagination.limit.toString(),
            sort: sorting.field,
            order: sorting.order,
            ...filters
        });

        try {
            const res = await fetch(`/api/admin/shifts?${params}`);
            const data = await res.json();
            if (data.shifts) {
                setShifts(data.shifts);
                setPagination(prev => ({ ...prev, ...data.pagination }));
            }
        } catch (error) {
            console.error("Failed to fetch shifts", error);
        } finally {
            setLoading(false);
        }
    }, [pagination.page, pagination.limit, sorting, filters]);

    // Initial Fetch & Debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchShifts();
        }, 300);
        return () => clearTimeout(timer);
    }, [fetchShifts]);

    // Handlers
    const handleSort = (field: string) => {
        setSorting(prev => ({
            field,
            order: prev.field === field && prev.order === "asc" ? "desc" : "asc"
        }));
    };

    const handleSelectAll = (checked: boolean) => {
        setSelectedIds(checked ? shifts.map(s => s.id) : []);
    };

    const handleSelectRow = (id: number, checked: boolean) => {
        setSelectedIds(prev => checked ? [...prev, id] : prev.filter(i => i !== id));
    };

    const handleBulkAction = async (action: 'delete' | 'recalculate') => {
        if (!confirm(`Are you sure you want to ${action} ${selectedIds.length} shifts?`)) return;

        try {
            const endpoint = action === 'delete'
                ? "/api/admin/shifts/bulk-delete"
                : "/api/admin/shifts/bulk-recalculate";

            await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids: selectedIds })
            });
            fetchShifts();
            setSelectedIds([]);
        } catch (e) {
            alert("Bulk action failed");
        }
    };

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Shift Management</h1>
                    <p className="text-gray-500 font-medium mt-1">Manage exam timings, slots, and statistics.</p>
                </div>
                <Link
                    href="/admin/shifts/create"
                    className="btn-primary flex items-center gap-2"
                >
                    <span className="material-symbols-outlined text-xl">add_circle</span>
                    Create New Shift
                </Link>
            </div>

            {/* Toolbar */}
            <div className="card-base p-4 flex flex-col xl:flex-row gap-4 justify-between items-center bg-white">
                <div className="flex flex-wrap gap-2 w-full xl:w-auto items-center">
                    {/* Filters */}
                    <select
                        className="px-3 py-2 border-2 border-gray-200 rounded-xl focus:border-gray-900 outline-none bg-white text-sm font-bold text-gray-700 max-w-[200px]"
                        value={filters.examId}
                        onChange={(e) => setFilters(prev => ({ ...prev, examId: e.target.value }))}
                    >
                        <option value="all">All Exams</option>
                        {exams.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>

                    <div className="flex items-center gap-2 border-2 border-gray-200 rounded-xl px-2 py-1.5 focus-within:border-gray-900 bg-white">
                        <span className="text-xs text-gray-400 font-bold uppercase">From</span>
                        <input
                            type="date"
                            className="outline-none text-sm font-bold text-gray-700 w-32"
                            value={filters.dateFrom}
                            onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                        />
                    </div>
                    <div className="flex items-center gap-2 border-2 border-gray-200 rounded-xl px-2 py-1.5 focus-within:border-gray-900 bg-white">
                        <span className="text-xs text-gray-400 font-bold uppercase">To</span>
                        <input
                            type="date"
                            className="outline-none text-sm font-bold text-gray-700 w-32"
                            value={filters.dateTo}
                            onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                        />
                    </div>

                    <select
                        className="px-3 py-2 border-2 border-gray-200 rounded-xl focus:border-gray-900 outline-none bg-white text-sm font-bold text-gray-700"
                        value={filters.timeSlot}
                        onChange={(e) => setFilters(prev => ({ ...prev, timeSlot: e.target.value }))}
                    >
                        <option value="all">All Slots</option>
                        <option value="morning">Morning</option>
                        <option value="afternoon">Afternoon</option>
                        <option value="evening">Evening</option>
                    </select>
                </div>

                {/* Bulk Actions */}
                {selectedIds.length > 0 && (
                    <div className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-xl animate-in fade-in slide-in-from-bottom-2">
                        <span className="text-sm font-bold mr-2">{selectedIds.length} Selected</span>
                        <button onClick={() => handleBulkAction('recalculate')} className="p-1 hover:text-blue-400" title="Recalculate Stats"><span className="material-symbols-outlined">calculate</span></button>
                        <div className="h-4 w-px bg-gray-700 mx-1"></div>
                        <button onClick={() => handleBulkAction('delete')} className="p-1 hover:text-red-400" title="Delete"><span className="material-symbols-outlined">delete</span></button>
                    </div>
                )}
            </div>

            {/* Table */}
            <div className="card-base overflow-hidden p-0 bg-white">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-[#F3E8FF] border-b-2 border-gray-900">
                            <tr>
                                <th className="p-4 w-10 border-r-2 border-gray-900">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 rounded border-gray-900 text-[#A78BFA] focus:ring-[#A78BFA]"
                                        checked={selectedIds.length === shifts.length && shifts.length > 0}
                                        onChange={(e) => handleSelectAll(e.target.checked)}
                                    />
                                </th>
                                <th className="p-4 text-xs font-bold text-gray-900 uppercase tracking-wider cursor-pointer hover:bg-purple-100 border-r-2 border-gray-900" onClick={() => handleSort('shiftCode')}>
                                    <div className="flex items-center gap-1">Code {sorting.field === 'shiftCode' && <span className="material-symbols-outlined text-sm">{sorting.order === 'asc' ? 'arrow_upward' : 'arrow_downward'}</span>}</div>
                                </th>
                                <th className="p-4 text-xs font-bold text-gray-900 uppercase tracking-wider border-r-2 border-gray-900">Exam</th>
                                <th className="p-4 text-xs font-bold text-gray-900 uppercase tracking-wider cursor-pointer hover:bg-purple-100 border-r-2 border-gray-900" onClick={() => handleSort('date')}>
                                    <div className="flex items-center gap-1">Date & Time {sorting.field === 'date' && <span className="material-symbols-outlined text-sm">{sorting.order === 'asc' ? 'arrow_upward' : 'arrow_downward'}</span>}</div>
                                </th>
                                <th className="p-4 text-xs font-bold text-gray-900 uppercase tracking-wider text-center border-r-2 border-gray-900">Candidates</th>
                                <th className="p-4 text-xs font-bold text-gray-900 uppercase tracking-wider text-center border-r-2 border-gray-900">Avg Score</th>
                                <th className="p-4 text-xs font-bold text-gray-900 uppercase tracking-wider border-r-2 border-gray-900">Difficulty</th>
                                <th className="p-4 text-xs font-bold text-gray-900 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y-2 divide-gray-100">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="p-4 border-r border-gray-100"><div className="h-4 w-4 bg-gray-200 rounded"></div></td>
                                        <td className="p-4 border-r border-gray-100"><div className="h-5 w-24 bg-gray-200 rounded"></div></td>
                                        <td className="p-4 border-r border-gray-100"><div className="h-5 w-32 bg-gray-200 rounded"></div></td>
                                        <td className="p-4 border-r border-gray-100"><div className="h-10 w-32 bg-gray-200 rounded"></div></td>
                                        <td className="p-4 border-r border-gray-100"><div className="h-5 w-12 bg-gray-200 rounded mx-auto"></div></td>
                                        <td className="p-4 border-r border-gray-100"><div className="h-5 w-12 bg-gray-200 rounded mx-auto"></div></td>
                                        <td className="p-4 border-r border-gray-100"><div className="h-5 w-20 bg-gray-200 rounded"></div></td>
                                        <td className="p-4"><div className="h-8 w-8 bg-gray-200 rounded ml-auto"></div></td>
                                    </tr>
                                ))
                            ) : shifts.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="p-12 text-center text-gray-500 font-medium">
                                        <div className="flex flex-col items-center gap-2">
                                            <span className="material-symbols-outlined text-4xl text-gray-300">event_busy</span>
                                            <p>No shifts found matching your filters.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                shifts.map((shift) => (
                                    <tr key={shift.id} className="hover:bg-purple-50 transition-colors group">
                                        <td className="p-4 border-r border-gray-100">
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 rounded border-gray-300 text-[#A78BFA] focus:ring-[#A78BFA]"
                                                checked={selectedIds.includes(shift.id)}
                                                onChange={(e) => handleSelectRow(shift.id, e.target.checked)}
                                            />
                                        </td>
                                        <td className="p-4 border-r border-gray-100 font-mono font-bold text-gray-700">
                                            {shift.shiftCode}
                                        </td>
                                        <td className="p-4 border-r border-gray-100">
                                            <span className="text-sm font-bold text-gray-900">{shift.examName}</span>
                                        </td>
                                        <td className="p-4 border-r border-gray-100">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-gray-900">
                                                    {new Date(shift.date).toLocaleDateString()}
                                                </span>
                                                <span className="text-xs text-gray-500 font-medium uppercase">
                                                    {shift.startTime} - {shift.endTime} ({shift.timeSlot})
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-4 border-r border-gray-100 text-center font-bold text-gray-700">
                                            {shift.candidateCount || 0}
                                        </td>
                                        <td className="p-4 border-r border-gray-100 text-center font-bold text-gray-700">
                                            {shift.avgRawScore?.toFixed(2) || "-"}
                                        </td>
                                        <td className="p-4 border-r border-gray-100">
                                            <span className={cn("px-2 py-1 rounded text-xs font-bold uppercase",
                                                shift.difficultyLabel === 'difficult' ? "bg-red-100 text-red-700" :
                                                    shift.difficultyLabel === 'moderate' ? "bg-yellow-100 text-yellow-700" :
                                                        "bg-green-100 text-green-700"
                                            )}>
                                                {shift.difficultyLabel || "N/A"}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Link
                                                    href={`/admin/shifts/${shift.id}`}
                                                    className="p-1.5 text-gray-400 hover:text-[#7C3AED] hover:bg-[#F3E8FF] rounded-lg transition-colors"
                                                    title="View Details"
                                                >
                                                    <span className="material-symbols-outlined text-lg">visibility</span>
                                                </Link>
                                                <Link
                                                    href={`/admin/shifts/${shift.id}/edit`}
                                                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Edit"
                                                >
                                                    <span className="material-symbols-outlined text-lg">edit</span>
                                                </Link>
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
                        >
                            Previous
                        </button>
                        <span className="px-4 font-bold text-gray-900">Page {pagination.page}</span>
                        <button
                            disabled={pagination.page >= pagination.totalPages}
                            onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                            className="p-2 bg-white border-2 border-gray-200 rounded-lg hover:border-gray-900 disabled:opacity-50 disabled:hover:border-gray-200 transition-all font-bold text-gray-700"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
