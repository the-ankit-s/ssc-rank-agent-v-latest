"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface Exam {
    id: number;
    name: string;
    slug: string;
    agency: string;
    year: number;
    status: string;
    isActive: boolean;
    totalSubmissions?: number;
    totalShifts?: number;
    analysisPhase?: string;
    updatedAt?: string;
}

interface Pagination {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export default function ExamsPage() {
    // State
    const [exams, setExams] = useState<Exam[]>([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, limit: 10, totalPages: 1 });
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    // Filters & Sorting
    const [filters, setFilters] = useState({
        search: "",
        agency: "all",
        year: "all",
        status: "all",
        isActive: "true"
    });
    const [sorting, setSorting] = useState({ field: "createdAt", order: "desc" });

    const router = useRouter();

    // Fetch Exams
    const fetchExams = useCallback(async () => {
        setLoading(true);
        const params = new URLSearchParams({
            page: pagination.page.toString(),
            limit: pagination.limit.toString(),
            sort: sorting.field,
            order: sorting.order,
            ...filters
        });

        try {
            const res = await fetch(`/api/admin/exams?${params}`);
            const data = await res.json();
            if (data.exams) {
                setExams(data.exams);
                setPagination(prev => ({ ...prev, ...data.pagination }));
            }
        } catch (error) {
            console.error("Failed to fetch exams", error);
        } finally {
            setLoading(false);
        }
    }, [pagination.page, pagination.limit, sorting, filters]);

    // Initial Fetch & Debounce Search
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchExams();
        }, 300);
        return () => clearTimeout(timer);
    }, [fetchExams]);

    // Handlers
    const handleSort = (field: string) => {
        setSorting(prev => ({
            field,
            order: prev.field === field && prev.order === "asc" ? "desc" : "asc"
        }));
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedIds(exams.map(e => e.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectRow = (id: number, checked: boolean) => {
        if (checked) {
            setSelectedIds(prev => [...prev, id]);
        } else {
            setSelectedIds(prev => prev.filter(i => i !== id));
        }
    };

    const handleBulkAction = async (action: 'delete' | 'activate' | 'deactivate') => {
        const isHardDelete = action === 'delete' && filters.isActive === 'false';
        const confirmMessage = isHardDelete
            ? `⚠️ WARNING: Are you sure you want to PERMANENTLY DELETE ${selectedIds.length} exams? This cannot be undone.`
            : `Are you sure you want to ${action} ${selectedIds.length} exams?`;

        if (!confirm(confirmMessage)) return;

        try {
            if (action === 'delete') {
                await fetch("/api/admin/exams/bulk-delete", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ids: selectedIds, hard: isHardDelete })
                });
            } else {
                const isActive = action === 'activate';
                await fetch("/api/admin/exams/bulk-update", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ids: selectedIds, data: { isActive } })
                });
            }
            fetchExams();
            setSelectedIds([]);
        } catch (e) {
            alert("Bulk action failed");
        }
    };

    const handleDuplicate = async (id: number) => {
        try {
            const res = await fetch(`/api/admin/exams/${id}/duplicate`, { method: "POST" });
            if (res.ok) fetchExams();
            else alert("Failed to duplicate");
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Exam Management</h1>
                    <p className="text-gray-500 font-medium mt-1">Manage, filter, and organize all examinations.</p>
                </div>
                <Link
                    href="/admin/exams/create"
                    className="btn-primary flex items-center gap-2"
                >
                    <span className="material-symbols-outlined text-xl">add_circle</span>
                    Create New Exam
                </Link>
            </div>

            {/* Toolbar */}
            <div className="card-base p-4 flex flex-col lg:flex-row gap-4 justify-between items-center bg-white">
                <div className="flex flex-wrap gap-2 w-full lg:w-auto">
                    {/* Search */}
                    <div className="relative group">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#A78BFA] transition-colors">search</span>
                        <input
                            type="text"
                            placeholder="Search exams..."
                            className="pl-10 pr-4 py-2 border-2 border-gray-200 rounded-xl focus:border-gray-900 outline-none w-full sm:w-64 transition-all"
                            value={filters.search}
                            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                        />
                    </div>

                    {/* Filters */}
                    <select
                        className="px-3 py-2 border-2 border-gray-200 rounded-xl focus:border-gray-900 outline-none bg-white text-sm font-bold text-gray-700"
                        value={filters.agency}
                        onChange={(e) => setFilters(prev => ({ ...prev, agency: e.target.value }))}
                    >
                        <option value="all">All Agencies</option>
                        <option value="SSC">SSC</option>
                        <option value="RRB">RRB</option>
                        <option value="IBPS">IBPS</option>
                        <option value="NTA">NTA</option>
                    </select>

                    <select
                        className="px-3 py-2 border-2 border-gray-200 rounded-xl focus:border-gray-900 outline-none bg-white text-sm font-bold text-gray-700"
                        value={filters.status}
                        onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                    >
                        <option value="all">All Statuses</option>
                        <option value="upcoming">Upcoming</option>
                        <option value="active">Active</option>
                        <option value="closed">Closed</option>
                    </select>

                    <select
                        className="px-3 py-2 border-2 border-gray-200 rounded-xl focus:border-gray-900 outline-none bg-white text-sm font-bold text-gray-700"
                        value={filters.year}
                        onChange={(e) => setFilters(prev => ({ ...prev, year: e.target.value }))}
                    >
                        <option value="all">All Years</option>
                        {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>



                    <select
                        className="px-3 py-2 border-2 border-gray-200 rounded-xl focus:border-gray-900 outline-none bg-white text-sm font-bold text-gray-700"
                        value={filters.isActive}
                        onChange={(e) => setFilters(prev => ({ ...prev, isActive: e.target.value }))}
                    >
                        <option value="true">Active Only</option>
                        <option value="false">Deactivated</option>
                        <option value="all">Show All</option>
                    </select>
                </div>

                {/* Bulk Actions */}
                {selectedIds.length > 0 && (
                    <div className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-xl animate-in fade-in slide-in-from-bottom-2">
                        <span className="text-sm font-bold mr-2">{selectedIds.length} Selected</span>
                        <button onClick={() => handleBulkAction('activate')} className="p-1 hover:text-green-400" title="Activate"><span className="material-symbols-outlined">check_circle</span></button>
                        <button onClick={() => handleBulkAction('deactivate')} className="p-1 hover:text-yellow-400" title="Deactivate"><span className="material-symbols-outlined">block</span></button>
                        <div className="h-4 w-px bg-gray-700 mx-1"></div>
                        <button onClick={() => handleBulkAction('delete')} className="p-1 hover:text-red-400" title="Delete"><span className="material-symbols-outlined">delete</span></button>
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
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 rounded border-gray-300 text-[#A78BFA] focus:ring-[#A78BFA]"
                                        checked={selectedIds.length === exams.length && exams.length > 0}
                                        onChange={(e) => handleSelectAll(e.target.checked)}
                                    />
                                </th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-900 group" onClick={() => handleSort('name')}>
                                    <div className="flex items-center gap-1">Name {sorting.field === 'name' && <span className="material-symbols-outlined text-sm">{sorting.order === 'asc' ? 'arrow_upward' : 'arrow_downward'}</span>}</div>
                                </th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Agency</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-900" onClick={() => handleSort('year')}>
                                    <div className="flex items-center gap-1">Year {sorting.field === 'year' && <span className="material-symbols-outlined text-sm">{sorting.order === 'asc' ? 'arrow_upward' : 'arrow_downward'}</span>}</div>
                                </th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Subs</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Shifts</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="p-4"><div className="h-4 w-4 bg-gray-200 rounded"></div></td>
                                        <td className="p-4"><div className="h-5 w-48 bg-gray-200 rounded"></div></td>
                                        <td className="p-4"><div className="h-5 w-16 bg-gray-200 rounded"></div></td>
                                        <td className="p-4"><div className="h-5 w-12 bg-gray-200 rounded"></div></td>
                                        <td className="p-4"><div className="h-6 w-24 bg-gray-200 rounded-full"></div></td>
                                        <td className="p-4"><div className="h-5 w-12 bg-gray-200 rounded mx-auto"></div></td>
                                        <td className="p-4"><div className="h-5 w-12 bg-gray-200 rounded mx-auto"></div></td>
                                        <td className="p-4"><div className="h-8 w-8 bg-gray-200 rounded ml-auto"></div></td>
                                    </tr>
                                ))
                            ) : exams.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="p-12 text-center text-gray-500 font-medium">
                                        No exams found matching your filters.
                                    </td>
                                </tr>
                            ) : (
                                exams.map((exam) => (
                                    <tr key={exam.id} className="hover:bg-gray-50 transition-colors group">
                                        <td className="p-4">
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 rounded border-gray-300 text-[#A78BFA] focus:ring-[#A78BFA]"
                                                checked={selectedIds.includes(exam.id)}
                                                onChange={(e) => handleSelectRow(exam.id, e.target.checked)}
                                            />
                                        </td>
                                        <td className="p-4">
                                            <div>
                                                <Link href={`/admin/exams/${exam.id}`} className={cn("font-bold hover:underline block", !exam.isActive ? "text-gray-400 line-through" : "text-gray-900 hover:text-[#7C3AED]")}>
                                                    {exam.name}
                                                </Link>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-gray-500 font-mono">/{exam.slug}</span>
                                                    {!exam.isActive && <span className="text-[10px] uppercase font-black bg-red-100 text-red-600 px-1 rounded">Deactivated</span>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className="inline-block px-2 py-1 rounded text-xs font-bold bg-gray-100 text-gray-600 border border-gray-200">
                                                {exam.agency}
                                            </span>
                                        </td>
                                        <td className="p-4 text-sm font-medium text-gray-600">{exam.year}</td>
                                        <td className="p-4">
                                            <span className={cn(
                                                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border",
                                                exam.status === 'active' ? "bg-green-100 text-green-700 border-green-200" :
                                                    exam.status === 'upcoming' ? "bg-yellow-100 text-yellow-700 border-yellow-200" :
                                                        "bg-gray-100 text-gray-600 border-gray-200"
                                            )}>
                                                <span className={cn("w-1.5 h-1.5 rounded-full",
                                                    exam.status === 'active' ? "bg-green-500" :
                                                        exam.status === 'upcoming' ? "bg-yellow-500" : "bg-gray-400"
                                                )}></span>
                                                {exam.status.replace(/_/g, ' ')}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center text-sm font-bold text-gray-700">
                                            {exam.totalSubmissions || 0}
                                        </td>
                                        <td className="p-4 text-center text-sm font-bold text-gray-700">
                                            {exam.totalShifts || 0}
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleDuplicate(exam.id)}
                                                    className="p-1.5 text-gray-400 hover:text-[#7C3AED] hover:bg-[#F3E8FF] rounded-lg transition-colors"
                                                    title="Duplicate"
                                                >
                                                    <span className="material-symbols-outlined text-lg">content_copy</span>
                                                </button>
                                                <Link
                                                    href={`/admin/exams/${exam.id}`}
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
