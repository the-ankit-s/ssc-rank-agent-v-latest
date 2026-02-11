"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface Submission {
    id: number;
    name: string;
    rollNumber: string;
    examName: string;
    shiftCode: string;
    rawScore: number;
    normalizedScore?: number;
    createdAt: string;
}

export default function SubmissionsPage() {
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ search: "", exam: "all", shift: "all" });

    useEffect(() => {
        fetch("/api/admin/submissions")
            .then((res) => res.json())
            .then((data) => {
                setSubmissions(data.submissions || []);
                setLoading(false);
            })
            .catch((err) => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    const filteredSubmissions = submissions.filter(sub =>
        sub.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        sub.rollNumber.includes(filters.search)
    );

    if (loading) return (
        <div className="flex items-center justify-center min-h-[400px]">
            <span className="material-symbols-outlined text-black text-6xl animate-spin">rotate_right</span>
        </div>
    );

    return (
        <div className="space-y-8 max-w-[1600px] mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Submissions</h1>
                    <p className="text-gray-500 font-medium mt-1">Review candidate responses.</p>
                </div>
                <div className="flex gap-3">
                    <Link
                        href="/admin/submissions/duplicates"
                        className="flex items-center gap-2 px-5 py-2.5 bg-white text-gray-900 font-bold rounded-xl border-2 border-gray-900 shadow-neo hover:-translate-y-1 hover:shadow-neo-hover transition-all text-sm"
                    >
                        <span className="material-symbols-outlined text-xl">content_copy</span>
                        Duplicates
                    </Link>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-4 border-2 border-gray-900 shadow-neo rounded-xl flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl">search</span>
                    <input
                        type="text"
                        placeholder="Search Name or Roll Number..."
                        className="w-full pl-12 pr-4 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-lg text-gray-900 font-medium placeholder:text-gray-400 focus:outline-none focus:border-[#A78BFA] focus:bg-white focus:shadow-sm transition-all"
                        value={filters.search}
                        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    />
                </div>
                <div className="flex gap-4">
                    <select className="px-4 py-2.5 bg-white border-2 border-gray-200 rounded-lg text-gray-700 font-bold focus:outline-none focus:border-[#A78BFA] focus:bg-white focus:shadow-sm cursor-pointer min-w-[160px] hover:border-gray-900 transition-colors">
                        <option value="all">All Exams</option>
                        {/* Populate dynamically */}
                    </select>
                </div>
            </div>

            {/* Data Grid */}
            <div className="bg-white border-2 border-gray-900 shadow-neo rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-[#DBEAFE] border-b-2 border-gray-900">
                            <tr>
                                <th className="px-6 py-4 text-sm font-bold text-gray-900 uppercase tracking-wider border-r border-gray-900/10">Candidate</th>
                                <th className="px-6 py-4 text-sm font-bold text-gray-900 uppercase tracking-wider border-r border-gray-900/10">Details</th>
                                <th className="px-6 py-4 text-sm font-bold text-gray-900 uppercase tracking-wider border-r border-gray-900/10">Shift</th>
                                <th className="px-6 py-4 text-sm font-bold text-gray-900 uppercase tracking-wider border-r border-gray-900/10">Score</th>
                                <th className="px-6 py-4 text-right text-sm font-bold text-gray-900 uppercase tracking-wider">Submitted</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredSubmissions.map((sub) => (
                                <tr key={sub.id} className="group hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-5 border-r border-gray-50">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 border border-gray-200">
                                                {sub.id}
                                            </div>
                                            <div className="font-bold text-gray-900">{sub.name || "Unknown"}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 border-r border-gray-50">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-gray-900 font-mono">{sub.rollNumber}</span>
                                            <span className="text-[10px] text-gray-500 font-bold uppercase">{sub.examName}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 border-r border-gray-50">
                                        {sub.shiftCode ? (
                                            <span className="px-2 py-1 bg-white text-gray-600 text-xs font-medium border border-gray-200 rounded-md shadow-sm">
                                                {sub.shiftCode}
                                            </span>
                                        ) : (
                                            <span className="text-gray-300 text-xs">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-5 border-r border-gray-50">
                                        <span className={cn(
                                            "font-bold text-lg",
                                            sub.rawScore > 100 ? "text-[#059669]" : "text-gray-900"
                                        )}>
                                            {sub.rawScore}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5 text-right font-medium text-gray-500 text-xs">
                                        {new Date(sub.createdAt).toLocaleDateString()}
                                    </td>
                                </tr>
                            ))}
                            {filteredSubmissions.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={5} className="text-center py-12">
                                        <div className="flex flex-col items-center gap-2 text-gray-400">
                                            <span className="material-symbols-outlined text-4xl">inbox</span>
                                            <p className="font-medium">No submissions match your filters</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {/* Pagination */}
                <div className="p-4 border-t-2 border-gray-100 bg-white flex items-center justify-between">
                    <p className="text-xs font-bold text-gray-500 uppercase">Showing {filteredSubmissions.length} results</p>
                    <div className="flex gap-2">
                        <button className="px-4 py-2 bg-white text-gray-700 font-bold border-2 border-gray-200 rounded-lg hover:border-gray-900 hover:text-gray-900 transition-all text-xs disabled:opacity-50">Previous</button>
                        <button className="px-4 py-2 bg-white text-gray-700 font-bold border-2 border-gray-200 rounded-lg hover:border-gray-900 hover:text-gray-900 transition-all text-xs">Next</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
