"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
    BarChart3, Users, TrendingUp, TrendingDown, Activity, Gauge,
    ChevronDown, ChevronUp, RefreshCw, Calendar, Clock, Hash,
    ArrowUpDown, Info, Zap, Target, Scale, Layers,
    AlertTriangle, CheckCircle2,
} from "lucide-react";
import { DifficultyBadge } from "@/components/admin/tags";
import { useExamOptions } from "@/hooks/admin/use-submissions";
import { useShifts } from "@/hooks/admin/use-shifts";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Shift {
    id: number;
    examId: number;
    shiftCode: string;
    date: string;
    shiftNumber: number;
    timeSlot: string;
    startTime: string;
    endTime: string;
    examName: string;
    totalMarks: number | null;
    candidateCount: number;
    avgRawScore: number | null;
    medianRawScore: number | null;
    stdDev: number | null;
    maxRawScore: number | null;
    minRawScore: number | null;
    difficultyIndex: number | null;
    difficultyLabel: string | null;
    normalizationFactor: number | null;
    sectionStats: Record<string, { avgScore: number; maxScore: number; avgAccuracy: number }> | null;
    statsUpdatedAt: string | null;
}

interface Summary {
    totalShifts: number;
    totalCandidates: number;
    examAvgScore: number | null;
    scoreRange: { min: number | null; max: number | null };
    avgStdDev: number | null;
    normFactorRange: { min: number | null; max: number | null };
    difficultyDistribution: { easy: number; moderate: number; hard: number };
    totalMarks: number | null;
}

interface Pagination { total: number; page: number; limit: number; totalPages: number; }
interface ExamOption { id: number; name: string; tier?: string; year?: number; }

// ─── Helpers ────────────────────────────────────────────────────────────────

const fmt = (n: number | null | undefined, d = 1) => n != null ? n.toFixed(d) : "—";
const fmtInt = (n: number | null | undefined) => n != null ? n.toLocaleString() : "—";



function ScoreBar({ value, max, color = "bg-violet-500" }: { value: number; max: number; color?: string }) {
    const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
    return (
        <div className="flex items-center gap-2 w-full">
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs font-bold text-gray-700 w-12 text-right">{fmt(value, 1)}</span>
        </div>
    );
}

function StatCard({ icon: Icon, label, value, sub, color = "bg-white" }: {
    icon: any; label: string; value: string | number; sub?: string; color?: string;
}) {
    return (
        <div className={cn("rounded-2xl border border-gray-200 p-4 flex flex-col gap-1", color)}>
            <div className="flex items-center gap-2 text-gray-500">
                <Icon className="w-4 h-4" />
                <span className="text-[11px] font-bold uppercase tracking-wider">{label}</span>
            </div>
            <p className="text-2xl font-black text-gray-900 tracking-tight">{value}</p>
            {sub && <p className="text-[11px] text-gray-400 font-medium">{sub}</p>}
        </div>
    );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function ShiftsPage() {
    const [selectedExam, setSelectedExam] = useState<string>("");
    const [page, setPage] = useState(1);
    const [limit] = useState(50);
    const [sorting, setSorting] = useState({ field: "date", order: "asc" });
    const [expandedShift, setExpandedShift] = useState<number | null>(null);

    // React Query hooks
    const { data: examOptionsRaw } = useExamOptions();
    const exams = (examOptionsRaw || []) as ExamOption[];

    // Auto-select first active exam
    useEffect(() => {
        if (exams.length > 0 && !selectedExam) {
            setSelectedExam(String(exams[0].id));
        }
    }, [exams, selectedExam]);

    const { data: shiftsData, isLoading: loading } = useShifts(selectedExam, sorting, page, limit);
    const shifts = shiftsData?.shifts || [];
    const summary = shiftsData?.summary || null;
    const pagination = shiftsData?.pagination || { total: 0, page: 1, limit: 50, totalPages: 1 };

    const handleSort = (field: string) => {
        setSorting(prev => ({ field, order: prev.field === field && prev.order === "asc" ? "desc" : "asc" }));
    };

    const SortIcon = ({ field }: { field: string }) => (
        sorting.field === field ? (
            sorting.order === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
        ) : <ArrowUpDown className="w-3 h-3 text-gray-300" />
    );

    // Compute relative bars
    const maxAvg = Math.max(...shifts.map(s => s.avgRawScore || 0), 1);
    const maxCandidates = Math.max(...shifts.map(s => s.candidateCount || 0), 1);
    const totalMarks = summary?.totalMarks || maxAvg;

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Shift Analytics</h1>
                    <p className="text-gray-500 font-medium mt-1">Difficulty analysis, score distribution, and normalization insights per exam</p>
                </div>
                <div className="flex items-center gap-3">
                    <select
                        className="px-4 py-2.5 border-2 border-gray-900 rounded-xl bg-white text-sm font-bold text-gray-900 min-w-[260px] focus:ring-2 focus:ring-violet-300 outline-none"
                        value={selectedExam}
                        onChange={(e) => { setSelectedExam(e.target.value); setPage(1); }}
                    >
                        <option value="">Select an Exam</option>
                        {(() => {
                            const active = exams.filter(e => (e as any).isActive !== false && (e as any).status !== "closed");
                            const archived = exams.filter(e => (e as any).isActive === false || (e as any).status === "closed");
                            return (
                                <>
                                    {active.length > 0 && <optgroup label="Active Exams">
                                        {active.map(e => <option key={e.id} value={e.id}>{e.name}{e.tier ? ` ${e.tier}` : ""}</option>)}
                                    </optgroup>}
                                    {archived.length > 0 && <optgroup label="Archived / Closed">
                                        {archived.map(e => <option key={e.id} value={e.id}>{e.name}{e.tier ? ` ${e.tier}` : ""}</option>)}
                                    </optgroup>}
                                </>
                            );
                        })()}
                    </select>
                    <button
                        onClick={() => { /* refetch handled by React Query */ }}
                        className="p-2.5 border-2 border-gray-200 rounded-xl hover:border-gray-900 transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw className={cn("w-4 h-4 text-gray-600", loading && "animate-spin")} />
                    </button>
                </div>
            </div>

            {!selectedExam ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <Layers className="w-12 h-12 text-gray-300 mb-4" />
                    <h2 className="text-xl font-bold text-gray-900">Select an Exam</h2>
                    <p className="text-gray-500 text-sm mt-1 max-w-md">Choose an exam from the dropdown above to view its shift-wise analytics, difficulty breakdown, and score distributions.</p>
                </div>
            ) : (
                <>
                    {/* Summary Cards */}
                    {summary && (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                            <StatCard icon={Layers} label="Shifts" value={summary.totalShifts}
                                sub={`across ${new Set(shifts.map(s => s.date)).size} days`} />
                            <StatCard icon={Users} label="Total Candidates" value={fmtInt(summary.totalCandidates)}
                                sub={`~${fmtInt(Math.round(summary.totalCandidates / Math.max(summary.totalShifts, 1)))} per shift`} />
                            <StatCard icon={Target} label="Exam Average" value={fmt(summary.examAvgScore, 1)}
                                sub={summary.totalMarks ? `out of ${summary.totalMarks}` : undefined} />
                            <StatCard icon={TrendingUp} label="Score Range" value={`${fmt(summary.scoreRange.min, 0)}–${fmt(summary.scoreRange.max, 0)}`}
                                sub={summary.scoreRange.max && summary.scoreRange.min ? `Spread: ${(summary.scoreRange.max - summary.scoreRange.min).toFixed(0)}` : undefined} />
                            <StatCard icon={Activity} label="Avg Std Dev" value={fmt(summary.avgStdDev, 1)}
                                sub="score consistency" />
                            <div className="rounded-2xl border border-gray-200 p-4 flex flex-col gap-1.5">
                                <div className="flex items-center gap-2 text-gray-500">
                                    <Gauge className="w-4 h-4" />
                                    <span className="text-[11px] font-bold uppercase tracking-wider">Difficulty</span>
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="flex items-center gap-1 text-xs font-bold text-emerald-700">🟢 {summary.difficultyDistribution.easy}</span>
                                    <span className="flex items-center gap-1 text-xs font-bold text-amber-700">🟡 {summary.difficultyDistribution.moderate}</span>
                                    <span className="flex items-center gap-1 text-xs font-bold text-red-700">🔴 {summary.difficultyDistribution.hard}</span>
                                </div>
                                <p className="text-[10px] text-gray-400 font-medium">
                                    Norm: {fmt(summary.normFactorRange.min, 2)}–{fmt(summary.normFactorRange.max, 2)}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Difficulty Methodology Card */}
                    <details className="group rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white overflow-hidden">
                        <summary className="flex items-center gap-3 p-4 cursor-pointer select-none">
                            <Info className="w-4 h-4 text-violet-500" />
                            <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">How Difficulty is Calculated</span>
                            <ChevronDown className="w-4 h-4 text-gray-400 ml-auto transition-transform group-open:rotate-180" />
                        </summary>
                        <div className="px-4 pb-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-gray-600">
                            <div className="flex gap-3 items-start">
                                <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
                                    <BarChart3 className="w-4 h-4 text-violet-600" />
                                </div>
                                <div>
                                    <p className="font-bold text-gray-900">Mean Score Ratio (40%)</p>
                                    <p className="mt-0.5 text-[11px]">1 − (avg_score ÷ max_marks). Lower average = harder paper</p>
                                </div>
                            </div>
                            <div className="flex gap-3 items-start">
                                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                                    <Activity className="w-4 h-4 text-amber-600" />
                                </div>
                                <div>
                                    <p className="font-bold text-gray-900">Score Variation (30%)</p>
                                    <p className="mt-0.5 text-[11px]">Coefficient of variation (σ ÷ μ). High spread = inconsistent difficulty</p>
                                </div>
                            </div>
                            <div className="flex gap-3 items-start">
                                <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                                    <TrendingDown className="w-4 h-4 text-red-600" />
                                </div>
                                <div>
                                    <p className="font-bold text-gray-900">Topper Gap (30%)</p>
                                    <p className="mt-0.5 text-[11px]">(top_score − avg_score) ÷ max_marks. Large gap = hard for most candidates</p>
                                </div>
                            </div>
                        </div>
                    </details>

                    {/* Shifts Table */}
                    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200">
                                        {[
                                            { key: "date", label: "Date", icon: Calendar },
                                            { key: "shiftNumber", label: "Shift", icon: Hash },
                                            { key: "timeSlot", label: "Time", icon: Clock },
                                            { key: "candidateCount", label: "Candidates", icon: Users },
                                            { key: "avgRawScore", label: "Avg Score", icon: BarChart3 },
                                            { key: "medianRawScore", label: "Median", icon: Target },
                                            { key: "stdDev", label: "Std Dev", icon: Activity },
                                            { key: "maxRawScore", label: "Top Score", icon: TrendingUp },
                                            { key: "difficultyIndex", label: "Difficulty", icon: Gauge },
                                            { key: "normFactor", label: "Norm Factor", icon: Scale },
                                        ].map(col => (
                                            <th key={col.key}
                                                className="px-3 py-3 text-[10px] font-black text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors whitespace-nowrap"
                                                onClick={() => handleSort(col.key)}>
                                                <div className="flex items-center gap-1">
                                                    <col.icon className="w-3 h-3" />
                                                    {col.label}
                                                    <SortIcon field={col.key} />
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {loading ? (
                                        Array.from({ length: 5 }).map((_, i) => (
                                            <tr key={i} className="animate-pulse">
                                                {Array.from({ length: 10 }).map((_, j) => (
                                                    <td key={j} className="px-3 py-3"><div className="h-4 bg-gray-100 rounded w-16" /></td>
                                                ))}
                                            </tr>
                                        ))
                                    ) : shifts.length === 0 ? (
                                        <tr>
                                            <td colSpan={10} className="px-4 py-12 text-center text-gray-400 text-sm font-medium">
                                                <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                                                No shifts found. Run the normalization pipeline first to populate shift statistics.
                                            </td>
                                        </tr>
                                    ) : shifts.map((shift) => (
                                        <tr key={shift.id}
                                            className={cn("hover:bg-violet-50/50 transition-colors cursor-pointer", expandedShift === shift.id && "bg-violet-50/30")}
                                            onClick={() => setExpandedShift(expandedShift === shift.id ? null : shift.id)}>
                                            <td className="px-3 py-3">
                                                <span className="text-sm font-bold text-gray-900">{shift.date}</span>
                                            </td>
                                            <td className="px-3 py-3">
                                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-gray-100 text-xs font-black text-gray-700">
                                                    S{shift.shiftNumber}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3">
                                                <span className="text-xs font-medium text-gray-500">{shift.timeSlot || "—"}</span>
                                            </td>
                                            <td className="px-3 py-3">
                                                <div className="flex flex-col gap-1 min-w-[100px]">
                                                    <span className="text-sm font-bold text-gray-900">{fmtInt(shift.candidateCount)}</span>
                                                    <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                                                        <div className="h-full bg-blue-400 rounded-full" style={{ width: `${(shift.candidateCount / maxCandidates) * 100}%` }} />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-3 py-3 min-w-[120px]">
                                                <ScoreBar value={shift.avgRawScore || 0} max={totalMarks} color="bg-violet-500" />
                                            </td>
                                            <td className="px-3 py-3">
                                                <span className="text-xs font-bold text-gray-700">{fmt(shift.medianRawScore)}</span>
                                            </td>
                                            <td className="px-3 py-3">
                                                <span className={cn("text-xs font-bold",
                                                    (shift.stdDev || 0) > (summary?.avgStdDev || 50) ? "text-red-600" : "text-gray-600"
                                                )}>{fmt(shift.stdDev)}</span>
                                            </td>
                                            <td className="px-3 py-3">
                                                <span className="text-xs font-bold text-emerald-700">{fmt(shift.maxRawScore, 0)}</span>
                                            </td>
                                            <td className="px-3 py-3">
                                                <DifficultyBadge label={shift.difficultyLabel} index={shift.difficultyIndex} />
                                            </td>
                                            <td className="px-3 py-3">
                                                <span className="text-xs font-mono font-bold text-gray-600">{fmt(shift.normalizationFactor, 3)}</span>
                                            </td>
                                        </tr>
                                    ))}

                                    {/* Expanded row: section-wise stats */}
                                    {expandedShift && shifts.find(s => s.id === expandedShift)?.sectionStats && (() => {
                                        const shift = shifts.find(s => s.id === expandedShift)!;
                                        const sections = shift.sectionStats!;
                                        return (
                                            <tr className="bg-gray-50">
                                                <td colSpan={10} className="px-4 py-4">
                                                    <div className="flex flex-col gap-3">
                                                        <div className="flex items-center gap-2">
                                                            <Zap className="w-3.5 h-3.5 text-violet-500" />
                                                            <span className="text-xs font-black text-gray-900 uppercase tracking-wider">
                                                                Section-wise Performance — {shift.shiftCode}
                                                            </span>
                                                            <span className="text-[10px] text-gray-400 ml-2">
                                                                {shift.statsUpdatedAt ? `Updated: ${new Date(shift.statsUpdatedAt).toLocaleString()}` : ""}
                                                            </span>
                                                        </div>
                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                            {Object.entries(sections).map(([code, stats]) => (
                                                                <div key={code} className="rounded-xl border border-gray-200 bg-white p-3">
                                                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-wider">{code}</p>
                                                                    <div className="mt-2 space-y-1.5">
                                                                        <div className="flex justify-between text-xs">
                                                                            <span className="text-gray-500">Avg Score</span>
                                                                            <span className="font-bold text-gray-900">{fmt(stats.avgScore)}</span>
                                                                        </div>
                                                                        <div className="flex justify-between text-xs">
                                                                            <span className="text-gray-500">Top Score</span>
                                                                            <span className="font-bold text-emerald-700">{fmt(stats.maxScore)}</span>
                                                                        </div>
                                                                        <div className="flex justify-between text-xs">
                                                                            <span className="text-gray-500">Accuracy</span>
                                                                            <span className="font-bold text-violet-700">{fmt(stats.avgAccuracy)}%</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                        {/* Score range visual */}
                                                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                                                            <span className="font-bold">Score Range:</span>
                                                            <div className="flex-1 h-2 bg-gray-100 rounded-full relative overflow-hidden">
                                                                {shift.minRawScore != null && shift.maxRawScore != null && totalMarks > 0 && (
                                                                    <div className="absolute h-full bg-gradient-to-r from-red-400 via-amber-400 to-emerald-400 rounded-full"
                                                                        style={{
                                                                            left: `${(shift.minRawScore / totalMarks) * 100}%`,
                                                                            width: `${((shift.maxRawScore - shift.minRawScore) / totalMarks) * 100}%`,
                                                                        }} />
                                                                )}
                                                            </div>
                                                            <span className="font-mono font-bold">{fmt(shift.minRawScore, 0)} – {fmt(shift.maxRawScore, 0)}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })()}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="p-3 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <span className="text-xs text-gray-500 font-medium">
                                Showing {shifts.length} of {pagination.total} shifts
                            </span>
                            <div className="flex items-center gap-2">
                                <button disabled={pagination.page === 1}
                                    onClick={() => setPage(p => p - 1)}
                                    className="px-3 py-1.5 text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-lg hover:border-gray-900 disabled:opacity-40 transition-colors">
                                    Previous
                                </button>
                                <span className="text-xs font-bold text-gray-900 px-2">{pagination.page} / {pagination.totalPages}</span>
                                <button disabled={pagination.page >= pagination.totalPages}
                                    onClick={() => setPage(p => p + 1)}
                                    className="px-3 py-1.5 text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-lg hover:border-gray-900 disabled:opacity-40 transition-colors">
                                    Next
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Insights Card (Monetization-ready) */}
                    {summary && shifts.length > 0 && (
                        <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-violet-50 to-white p-5">
                            <div className="flex items-center gap-2 mb-4">
                                <Zap className="w-4 h-4 text-violet-600" />
                                <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">Key Insights</h3>
                                <span className="ml-auto text-[10px] font-bold text-violet-600 bg-violet-100 px-2 py-0.5 rounded-full">Premium Data</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                                {(() => {
                                    const hardest = [...shifts].sort((a, b) => (b.difficultyIndex || 0) - (a.difficultyIndex || 0))[0];
                                    const easiest = [...shifts].sort((a, b) => (a.difficultyIndex || 0) - (b.difficultyIndex || 0))[0];
                                    const mostPopulated = [...shifts].sort((a, b) => b.candidateCount - a.candidateCount)[0];

                                    return (
                                        <>
                                            <div className="flex items-start gap-3 p-3 rounded-xl bg-white border border-gray-100">
                                                <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                                                    <TrendingDown className="w-4 h-4 text-red-600" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900">Hardest Shift</p>
                                                    <p className="text-gray-500 mt-0.5">
                                                        {hardest?.shiftCode} — Avg {fmt(hardest?.avgRawScore, 1)}, Difficulty {((hardest?.difficultyIndex || 0) * 100).toFixed(0)}%
                                                    </p>
                                                    <p className="text-gray-400 mt-0.5">
                                                        Candidates in this shift may benefit from normalization uplift
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-3 p-3 rounded-xl bg-white border border-gray-100">
                                                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                                                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900">Easiest Shift</p>
                                                    <p className="text-gray-500 mt-0.5">
                                                        {easiest?.shiftCode} — Avg {fmt(easiest?.avgRawScore, 1)}, Difficulty {((easiest?.difficultyIndex || 0) * 100).toFixed(0)}%
                                                    </p>
                                                    <p className="text-gray-400 mt-0.5">
                                                        Highest average score, normalization may slightly adjust
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-3 p-3 rounded-xl bg-white border border-gray-100">
                                                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                                                    <Users className="w-4 h-4 text-blue-600" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900">Most Populated</p>
                                                    <p className="text-gray-500 mt-0.5">
                                                        {mostPopulated?.shiftCode} — {fmtInt(mostPopulated?.candidateCount)} candidates
                                                    </p>
                                                    <p className="text-gray-400 mt-0.5">
                                                        Largest sample size gives most reliable normalization
                                                    </p>
                                                </div>
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
