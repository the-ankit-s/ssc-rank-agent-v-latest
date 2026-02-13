"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
    Trophy, Users, Target, Award, ChevronLeft, ChevronRight,
    Download, RefreshCw, ArrowUpDown, Medal, Crosshair, TrendingUp, BarChart3,
    Gauge
} from "lucide-react";
import { useLeaderboard, LeaderboardEntry, LeaderboardStats } from "@/hooks/admin/use-admin";
import { useExamOptions } from "@/hooks/admin/use-submissions";

// ─── Shared primitives ───
function Kpi({ label, value, icon: I, color, bg }: any) {
    return (
        <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-start gap-3">
            <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5", bg)}>
                <I className={cn("w-4 h-4", color)} />
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
                <p className="text-lg font-bold text-gray-900">{typeof value === "number" ? value.toLocaleString() : value}</p>
            </div>
        </div>
    );
}

function Empty({ msg }: { msg: string }) {
    return (
        <div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
            <BarChart3 className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-xs font-semibold text-gray-400">{msg}</p>
        </div>
    );
}

export default function LeaderboardPage() {
    // State
    const [examId, setExamId] = useState<string>("");
    const [category, setCategory] = useState("all");
    const [sort, setSort] = useState("rawScore");
    const [page, setPage] = useState(1);

    // Queries
    const { data: examsData } = useExamOptions();
    const exams = examsData || [];

    const { data, isLoading, refetch } = useLeaderboard({ examId, category, sort }, page);

    // Destructure data
    const rows: LeaderboardEntry[] = data?.leaderboard || [];
    const stats: LeaderboardStats | undefined = data?.stats;
    const pagination = data?.pagination || { page: 1, limit: 50, totalPages: 1, total: 0, hasMore: false };
    const currentExamName = data?.currentExamName || "Leaderboard";
    const currentExamId = data?.currentExamId;

    // Effect to parse currentExamId if not set
    // Only set if we don't have an examId and the API returns one (initial load)
    useEffect(() => {
        if (!examId && currentExamId) {
            setExamId(String(currentExamId));
        }
    }, [examId, currentExamId]);

    // Reset page on filter change
    useEffect(() => {
        setPage(1);
    }, [examId, category, sort]);

    const sortOptions = [
        { key: "rawScore", label: "Raw Score" },
        { key: "normalizedScore", label: "Normalized Score" },
        { key: "overallPercentile", label: "Percentile" },
        { key: "accuracy", label: "Accuracy" },
    ];

    const exportCSV = () => {
        if (!rows.length) return;
        const headers = ["Rank", "Name", "Roll No.", "Category", "Gender", "State", "Raw Score", "Norm. Score", "Accuracy", "Percentile", "Attempted", "Correct", "Wrong", "Overall Rank"];
        const csvRows = rows.map((r) => [
            r.displayRank, r.name, r.rollNumber, r.category, r.gender, r.state || "",
            r.rawScore, r.normalizedScore ?? "", r.accuracy ? `${r.accuracy}%` : "",
            r.overallPercentile ?? "", r.totalAttempted ?? "", r.totalCorrect ?? "", r.totalWrong ?? "",
            r.overallRank ?? "",
        ].join(","));
        const blob = new Blob([headers.join(",") + "\n" + csvRows.join("\n")], { type: "text/csv" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `leaderboard_${examId || "all"}_p${page}.csv`;
        a.click();
    };

    return (
        <div className="space-y-4 max-w-[1400px] mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-amber-500" />
                        <h1 className="text-lg font-bold text-gray-900">Leaderboard</h1>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 ml-7">{currentExamName}</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => refetch()} className="p-2 rounded-lg hover:bg-gray-100 transition-colors" title="Refresh">
                        <RefreshCw className={cn("w-4 h-4 text-gray-500", isLoading && "animate-spin")} />
                    </button>
                    <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white rounded-lg text-xs font-semibold hover:bg-gray-800 transition-colors">
                        <Download className="w-3.5 h-3.5" />Export
                    </button>
                </div>
            </div>

            {/* Controls row */}
            <div className="flex flex-wrap items-center gap-2">
                {/* Exam selector */}
                <select value={examId} onChange={e => setExamId(e.target.value)}
                    className="h-8 px-3 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-300 cursor-pointer min-w-[200px]">
                    <option value="" disabled>Select Exam</option>
                    {exams.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
                {/* Category filter */}
                <select value={category} onChange={e => setCategory(e.target.value)}
                    className="h-8 px-3 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-300 cursor-pointer">
                    <option value="all">All Categories</option>
                    <option value="GEN">GEN</option>
                    <option value="OBC">OBC</option>
                    <option value="EWS">EWS</option>
                    <option value="SC">SC</option>
                    <option value="ST">ST</option>
                </select>
                {/* Sort selector */}
                <div className="flex items-center gap-1 ml-auto">
                    <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-[10px] text-gray-400 font-semibold uppercase">Sort by:</span>
                    {sortOptions.map(s => (
                        <button key={s.key} onClick={() => setSort(s.key)}
                            className={cn("px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all",
                                sort === s.key ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-50")}>
                            {s.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Stats bar */}
            {stats && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <Kpi label="Total Candidates" value={stats.total} icon={Users} color="text-indigo-600" bg="bg-indigo-50" />
                    <Kpi label="Avg Raw Score" value={stats.avgRawScore} icon={Target} color="text-emerald-600" bg="bg-emerald-50" />
                    <Kpi label="Avg Norm. Score" value={stats.avgNormScore ?? "—"} icon={TrendingUp} color="text-blue-600" bg="bg-blue-50" />
                    <Kpi label="Avg Accuracy" value={stats.avgAccuracy ? `${stats.avgAccuracy}%` : "—"} icon={Crosshair} color="text-violet-600" bg="bg-violet-50" />
                    <Kpi label="Highest Score" value={stats.maxRawScore} icon={Award} color="text-amber-600" bg="bg-amber-50" />
                    <Kpi label="Lowest Score" value={stats.minRawScore} icon={Gauge} color="text-red-500" bg="bg-red-50" />
                </div>
            )}

            {/* Main table */}
            {isLoading ? (
                <div className="bg-white rounded-xl border border-gray-100 p-16 flex flex-col items-center gap-3">
                    <RefreshCw className="w-6 h-6 text-gray-300 animate-spin" />
                    <p className="text-xs font-semibold text-gray-400">Loading leaderboard…</p>
                </div>
            ) : rows.length === 0 ? (
                <Empty msg="No results found for the selected filters." />
            ) : (
                <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="text-[10px] text-gray-400 uppercase tracking-wider border-b border-gray-100 bg-gray-50/50">
                                    <th className="text-center py-3 px-3 w-14">#</th>
                                    <th className="text-left py-3 pr-3">Name</th>
                                    <th className="text-left py-3 pr-3">Roll No.</th>
                                    <th className="text-left py-3 pr-3">Cat</th>
                                    <th className="text-left py-3 pr-3">Gender</th>
                                    <th className="text-left py-3 pr-3">State</th>
                                    <th className={cn("text-right py-3 pr-3", sort === "rawScore" && "text-indigo-600")}>Raw Score</th>
                                    <th className={cn("text-right py-3 pr-3", sort === "normalizedScore" && "text-indigo-600")}>Norm. Score</th>
                                    <th className={cn("text-right py-3 pr-3", sort === "accuracy" && "text-indigo-600")}>Accuracy</th>
                                    <th className="text-right py-3 pr-3">Attempted</th>
                                    <th className="text-right py-3 pr-3">Correct</th>
                                    <th className="text-right py-3 pr-3">Wrong</th>
                                    <th className={cn("text-right py-3 pr-3", sort === "overallPercentile" && "text-indigo-600")}>Percentile</th>
                                    <th className="text-right py-3 pr-3">Rank</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((r, i) => {
                                    const isTop3 = r.displayRank <= 3;
                                    return (
                                        <tr key={r.id || i} className={cn("border-b border-gray-50 hover:bg-gray-50/50 transition-colors", isTop3 && "bg-amber-50/30")}>
                                            <td className="py-2.5 px-3 text-center">
                                                <span className={cn("inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold",
                                                    r.displayRank === 1 ? "bg-amber-200 text-amber-900" :
                                                        r.displayRank === 2 ? "bg-gray-200 text-gray-700" :
                                                            r.displayRank === 3 ? "bg-orange-200 text-orange-800" :
                                                                "bg-gray-100 text-gray-500"
                                                )}>
                                                    {r.displayRank <= 3 ? <Medal className="w-3 h-3" /> : r.displayRank}
                                                </span>
                                            </td>
                                            <td className="py-2.5 pr-3 font-semibold text-gray-800 whitespace-nowrap">{r.name}</td>
                                            <td className="py-2.5 pr-3 text-gray-500 font-mono text-[10px]">{r.rollNumber}</td>
                                            <td className="py-2.5 pr-3"><span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-[10px] font-semibold">{r.category}</span></td>
                                            <td className="py-2.5 pr-3 text-gray-600">{r.gender === "M" ? "Male" : r.gender === "F" ? "Female" : r.gender || "—"}</td>
                                            <td className="py-2.5 pr-3 text-gray-500 truncate max-w-[100px]">{r.state || "—"}</td>
                                            <td className={cn("py-2.5 pr-3 text-right font-bold", sort === "rawScore" ? "text-indigo-700" : "text-gray-900")}>{r.rawScore}</td>
                                            <td className={cn("py-2.5 pr-3 text-right font-semibold", sort === "normalizedScore" ? "text-indigo-700" : "text-indigo-600")}>{r.normalizedScore != null ? r.normalizedScore : "—"}</td>
                                            <td className={cn("py-2.5 pr-3 text-right", sort === "accuracy" ? "font-bold text-indigo-700" : "text-gray-600")}>{r.accuracy != null ? `${r.accuracy}%` : "—"}</td>
                                            <td className="py-2.5 pr-3 text-right text-gray-600">{r.totalAttempted ?? "—"}</td>
                                            <td className="py-2.5 pr-3 text-right text-emerald-600 font-semibold">{r.totalCorrect ?? "—"}</td>
                                            <td className="py-2.5 pr-3 text-right text-red-500">{r.totalWrong ?? "—"}</td>
                                            <td className={cn("py-2.5 pr-3 text-right", sort === "overallPercentile" && "font-bold")}>
                                                {r.overallPercentile != null
                                                    ? <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold", sort === "overallPercentile" ? "bg-indigo-100 text-indigo-700" : "bg-blue-50 text-blue-700")}>{r.overallPercentile}%</span>
                                                    : <span className="text-gray-400">—</span>}
                                            </td>
                                            <td className="py-2.5 pr-3 text-right font-bold text-gray-700">{r.overallRank || "—"}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {pagination.totalPages > 1 && (
                        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/30">
                            <p className="text-[11px] text-gray-400 font-semibold">
                                Showing <b className="text-gray-700">{(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)}</b> of <b className="text-gray-700">{pagination.total.toLocaleString()}</b> candidates
                            </p>
                            <div className="flex items-center gap-1">
                                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                                    className={cn("p-1.5 rounded-lg transition-colors", page <= 1 ? "text-gray-300 cursor-not-allowed" : "text-gray-600 hover:bg-gray-100")}>
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                {/* Page numbers */}
                                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                                    const start = Math.max(1, Math.min(page - 2, pagination.totalPages - 4));
                                    const p = start + i;
                                    if (p > pagination.totalPages) return null;
                                    return (
                                        <button key={p} onClick={() => setPage(p)}
                                            className={cn("w-7 h-7 rounded-lg text-[11px] font-bold transition-all",
                                                page === p ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-100")}>
                                            {p}
                                        </button>
                                    );
                                })}
                                <button onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))} disabled={!pagination.hasMore}
                                    className={cn("p-1.5 rounded-lg transition-colors", !pagination.hasMore ? "text-gray-300 cursor-not-allowed" : "text-gray-600 hover:bg-gray-100")}>
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
