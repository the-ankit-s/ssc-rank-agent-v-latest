"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import Link from "next/link";

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════════════════ */
interface SectionStats {
    marks: number;
    correct: number;
    wrong: number;
    unattempted: number;
    accuracy: number;
    totalQuestions?: number;
}

interface SubmissionData {
    id: number;
    rollNumber: string;
    name: string;
    category: string;
    processingStatus: "pending" | "processing" | "ready" | "failed";
    createdAt: string;
    fatherName: string | null;
    dob: string | null;
    gender: string | null;
    state: string | null;
    examCentre: string | null;
    examCentreCode: string | null;
    horizontalCategory: string | null;
    isPWD: boolean | null;
    isExServiceman: boolean | null;
    sectionPerformance: Record<string, SectionStats>;
    totalAttempted: number;
    totalCorrect: number;
    totalWrong: number;
    accuracy: number;
    rawScore: number;
    normalizedScore: number | null;
    overallRank: number | null;
    categoryRank: number | null;
    shiftRank: number | null;
    stateRank: number | null;
    overallPercentile: number | null;
    categoryPercentile: number | null;
    shiftPercentile: number | null;
    pendingCount: number;
    nextBatchRun: string | null;
    pollIntervalMs: number;
    exam: { name: string; tier: string; totalMarks: number; totalSubmissions: number; agency: string; year: number };
    shift: { date: string; timeSlot: string; shiftNumber: number; candidateCount: number; avgRawScore: number | null; maxRawScore: number | null; minRawScore: number | null; stdDev: number | null; difficultyLabel: string | null };
}

/* ═══════════════════════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════════════════════ */
const SECTION: Record<string, { label: string; short: string; icon: string; color: string; light: string }> = {
    GI: { label: "General Intelligence & Reasoning", short: "GI & Reasoning", icon: "psychology", color: "#6366f1", light: "#eef2ff" },
    Reasoning: { label: "General Intelligence & Reasoning", short: "GI & Reasoning", icon: "psychology", color: "#6366f1", light: "#eef2ff" },
    QA: { label: "Quantitative Aptitude", short: "Quant", icon: "calculate", color: "#f59e0b", light: "#fffbeb" },
    Quant: { label: "Quantitative Aptitude", short: "Quant", icon: "calculate", color: "#f59e0b", light: "#fffbeb" },
    EN: { label: "English Language & Comprehension", short: "English", icon: "translate", color: "#10b981", light: "#ecfdf5" },
    English: { label: "English Language & Comprehension", short: "English", icon: "translate", color: "#10b981", light: "#ecfdf5" },
    GA: { label: "General Awareness", short: "GA", icon: "public", color: "#ef4444", light: "#fef2f2" },
    Awareness: { label: "General Awareness", short: "GA", icon: "public", color: "#ef4444", light: "#fef2f2" },
    Computer: { label: "Computer Proficiency (Module)", short: "CPM", icon: "terminal", color: "#8b5cf6", light: "#faf5ff" },
};

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════════════════ */
function fmtDate(d: string | null): string {
    if (!d) return "—";
    try { return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); } catch { return d; }
}
function ordinal(n: number): string {
    const s = ["th", "st", "nd", "rd"], v = n % 100;
    return n.toLocaleString() + (s[(v - 20) % 10] || s[v] || s[0]);
}
function categoryLabel(c: string): string {
    const m: Record<string, string> = { GEN: "General", GENERAL: "General", OBC: "OBC", SC: "SC", ST: "ST", EWS: "EWS" };
    return m[c.toUpperCase()] || c;
}
function genderLabel(g: string | null): string {
    return g === "M" ? "Male" : g === "F" ? "Female" : g || "—";
}
function cronHuman(c: string | null): string {
    if (!c) return "Soon";
    const m: Record<string, string> = { "0 2 * * *": "Tonight 2:00 AM", "0 3 * * *": "Tonight 3:00 AM", "0 * * * *": "Within 1 hr", "0 */6 * * *": "Within 6 hrs" };
    return m[c] || c;
}

/* ═══════════════════════════════════════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════════════════════════════════════ */
export default function ResultPage() {
    const params = useParams();
    const [data, setData] = useState<SubmissionData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [pollTimedOut, setPollTimedOut] = useState(false);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const t0 = useRef(Date.now());

    const load = useCallback(async () => {
        try {
            if (!params?.id) return;
            const r = await fetch(`/api/result/${params.id}`);
            if (!r.ok) { setError(true); return; }
            const d: SubmissionData = await r.json();
            setData(d);
            if (d.processingStatus === "ready" || d.processingStatus === "failed") { timerRef.current && clearInterval(timerRef.current); timerRef.current = null; }
            if (Date.now() - t0.current > 86_400_000) { setPollTimedOut(true); timerRef.current && clearInterval(timerRef.current); timerRef.current = null; }
        } catch { /* silent */ } finally { setLoading(false); }
    }, [params?.id]);

    useEffect(() => { t0.current = Date.now(); load(); }, []); // eslint-disable-line
    useEffect(() => {
        timerRef.current && clearInterval(timerRef.current); timerRef.current = null;
        if (!data || data.processingStatus === "ready" || data.processingStatus === "failed" || pollTimedOut) return;
        timerRef.current = setInterval(load, data.pollIntervalMs || 21_600_000);
        return () => { timerRef.current && clearInterval(timerRef.current); };
    }, [data?.processingStatus, data?.pollIntervalMs, pollTimedOut, load]);

    /* ── Loading ─────────────────────────────────────────────── */
    if (loading) return (
        <>
            <Navbar />
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="relative inline-block mb-4">
                        <div className="w-14 h-14 border-4 border-gray-200 rounded-full" />
                        <div className="absolute inset-0 w-14 h-14 border-4 border-black border-t-transparent rounded-full animate-spin" />
                    </div>
                    <p className="font-black text-lg uppercase tracking-widest">Loading Result</p>
                </div>
            </div>
            <Footer />
        </>
    );

    /* ── Error ────────────────────────────────────────────────── */
    if (error || !data) return (
        <>
            <Navbar />
            <div className="min-h-screen flex items-center justify-center px-4">
                <div className="text-center max-w-sm">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 border-4 border-black rounded-2xl shadow-[4px_4px_0_#000] mb-4">
                        <span className="material-symbols-outlined text-3xl text-red-500">search_off</span>
                    </div>
                    <h2 className="text-2xl font-black uppercase mb-1">Not Found</h2>
                    <p className="text-gray-500 mb-6">This submission doesn&apos;t exist or has expired.</p>
                    <Link href="/" className="btn-primary rounded-xl text-sm">Go Home</Link>
                </div>
            </div>
            <Footer />
        </>
    );

    /* ── Derived ──────────────────────────────────────────────── */
    const isPending = data.processingStatus === "pending";
    const isProcessing = data.processingStatus === "processing";
    const isFailed = data.processingStatus === "failed";
    const hasNorm = data.normalizedScore != null;
    const hasRank = data.overallRank != null;

    const allSections = Object.entries(data.sectionPerformance || {});
    const meritSections = allSections.filter(([k]) => k !== "Computer");
    const comp = data.sectionPerformance?.["Computer"];
    const compMarks = comp?.marks ?? 0;
    const totalSkipped = allSections.reduce((a, [, v]) => a + v.unattempted, 0);
    const overallAcc = data.accuracy ?? (data.totalAttempted > 0 ? (data.totalCorrect / data.totalAttempted) * 100 : 0);
    const totalQ = allSections.reduce((a, [, v]) => a + v.correct + v.wrong + v.unattempted, 0);
    const grandTotal = data.rawScore + compMarks;

    return (
        <>
            <Navbar />
            <main className="pb-24" style={{ background: "var(--background)" }}>

                {/* ══════════════════════════════════════════════════
                    HERO HEADER
                ══════════════════════════════════════════════════ */}
                <header className="bg-black text-white overflow-hidden relative">
                    {/* Subtle grid pattern */}
                    <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23fff' fill-opacity='1'%3E%3Cpath d='M0 0h1v40H0V0zm39 0h1v40h-1V0z'/%3E%3Cpath d='M0 0h40v1H0V0zm0 39h40v1H0v-1z'/%3E%3C/g%3E%3C/svg%3E\")" }} />

                    <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
                        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
                            <div>
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="bg-[#FFDE59] text-black p-2 rounded-lg border-2 border-[#FFDE59]">
                                        <span className="material-symbols-outlined text-xl">verified</span>
                                    </div>
                                    <span className="text-[#FFDE59] text-xs font-black uppercase tracking-[0.2em]">Score Analysis</span>
                                </div>
                                <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight leading-none mb-2">
                                    {data.name}
                                </h1>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-400">
                                    <span className="font-mono text-gray-500">{data.rollNumber}</span>
                                    <span className="w-1 h-1 rounded-full bg-gray-600" />
                                    <span>{data.exam?.name} ({data.exam?.tier})</span>
                                    <span className="w-1 h-1 rounded-full bg-gray-600" />
                                    <span>{fmtDate(data.shift?.date)} · {data.shift?.timeSlot}</span>
                                </div>
                            </div>

                            {/* Hero score pill */}
                            <div className="flex items-center gap-4 md:gap-6">
                                <div className="text-right">
                                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-0.5">Grand Total</p>
                                    <p className="text-5xl md:text-6xl font-black text-[#FFDE59] leading-none">{grandTotal}</p>
                                    <p className="text-gray-500 text-xs font-bold">/ {data.exam?.totalMarks || 450}</p>
                                </div>
                                {hasRank && (
                                    <div className="h-16 w-px bg-gray-700" />
                                )}
                                {hasRank && (
                                    <div className="text-right">
                                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-0.5">AIR</p>
                                        <p className="text-4xl md:text-5xl font-black text-white leading-none">#{data.overallRank}</p>
                                        {data.overallPercentile != null && (
                                            <p className="text-green-400 text-xs font-bold">Top {(100 - data.overallPercentile).toFixed(1)}%</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </header>

                {/* ══════════════════════════════════════════════════
                    STATUS BANNERS — thin, contextual
                ══════════════════════════════════════════════════ */}
                {isPending && (
                    <div className="bg-blue-50 border-b-2 border-blue-200">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center gap-3 text-sm">
                            <span className="material-symbols-outlined text-blue-500 text-lg animate-pulse">schedule</span>
                            <span className="text-blue-800 font-bold">Queue position #{data.pendingCount}</span>
                            {data.nextBatchRun && <span className="text-blue-600 text-xs bg-blue-100 px-2 py-0.5 rounded-md">Next: {cronHuman(data.nextBatchRun)}</span>}
                            <span className="hidden sm:inline text-blue-500 text-xs ml-auto">Raw scores shown below. Normalization pending.</span>
                        </div>
                    </div>
                )}
                {isProcessing && (
                    <div className="bg-amber-50 border-b-2 border-amber-200 relative overflow-hidden">
                        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-amber-200"><div className="h-full bg-amber-500" style={{ width: "35%", animation: "slide 2s ease-in-out infinite" }} /></div>
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center gap-3 text-sm">
                            <span className="material-symbols-outlined text-amber-600 text-lg animate-spin">settings</span>
                            <span className="text-amber-800 font-bold">Batch running — results will auto-update</span>
                        </div>
                    </div>
                )}
                {isFailed && (
                    <div className="bg-red-50 border-b-2 border-red-200">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center gap-3 text-sm">
                            <span className="material-symbols-outlined text-red-500 text-lg">error</span>
                            <span className="text-red-800 font-bold flex-1">Processing error — will retry on next batch</span>
                            <button onClick={() => location.reload()} className="text-xs font-bold bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700">Retry</button>
                        </div>
                    </div>
                )}
                {pollTimedOut && (isPending || isProcessing) && (
                    <div className="bg-gray-100 border-b border-gray-200">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex justify-between items-center text-xs text-gray-500">
                            <span>Auto-refresh paused</span>
                            <button onClick={() => { setPollTimedOut(false); t0.current = Date.now(); load(); }} className="font-bold text-primary hover:underline">Refresh</button>
                        </div>
                    </div>
                )}

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">

                    {/* ══════════════════════════════════════════════════
                        ROW 1: CANDIDATE DETAILS  +  SCORE OVERVIEW
                    ══════════════════════════════════════════════════ */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

                        {/* ── Candidate Info (2/3 width) ──────────────── */}
                        <div className="lg:col-span-2 bg-white border-4 border-black shadow-[4px_4px_0_#000] rounded-xl overflow-hidden">
                            <div className="px-6 py-4 border-b-2 border-gray-100 flex items-center gap-3">
                                <span className="material-symbols-outlined text-xl">badge</span>
                                <h2 className="font-black text-sm uppercase tracking-wider">Candidate Details</h2>
                            </div>
                            <div className="p-6">
                                <div className="flex items-start gap-5 mb-6">
                                    {/* Avatar */}
                                    <div className="h-16 w-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl border-3 border-black flex items-center justify-center shrink-0 shadow-[3px_3px_0_#000]">
                                        <span className="text-xl font-black text-white">{data.name?.split(" ").map(w => w[0]).join("").slice(0, 2)}</span>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-black uppercase">{data.name}</h3>
                                        <div className="flex flex-wrap items-center gap-2 mt-1">
                                            <span className="text-xs font-black text-white bg-black px-2 py-0.5 rounded-md">{categoryLabel(data.category)}</span>
                                            {data.isPWD && <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md border border-purple-200">PwD</span>}
                                            {data.isExServiceman && <span className="text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-md border border-green-200">Ex-SM</span>}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-6 gap-y-4">
                                    <InfoItem label="Roll Number" value={data.rollNumber} mono />
                                    <InfoItem label="Father's Name" value={data.fatherName} />
                                    <InfoItem label="Date of Birth" value={data.dob} />
                                    <InfoItem label="Gender" value={genderLabel(data.gender)} />
                                    <InfoItem label="State" value={data.state} />
                                    <InfoItem label="Exam Centre" value={data.examCentre} />
                                    <InfoItem label="Centre Code" value={data.examCentreCode} mono />
                                    <InfoItem label="Exam Date" value={fmtDate(data.shift?.date)} />
                                    <InfoItem label="Shift / Time" value={data.shift?.timeSlot || `Shift ${data.shift?.shiftNumber}`} />
                                    <InfoItem label="Submission ID" value={`#${data.id}`} mono />
                                </div>
                            </div>
                        </div>

                        {/* ── Score Overview (1/3 width) ──────────────── */}
                        <div className="flex flex-col gap-4">
                            {/* Merit */}
                            <div className="bg-[#FFDE59] border-4 border-black rounded-xl shadow-[4px_4px_0_#000] p-5 flex-1 flex flex-col items-center justify-center text-center">
                                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-black/50 mb-1">Merit Score</span>
                                <span className="text-5xl font-black text-black leading-none">{data.rawScore}</span>
                                <span className="text-xs text-black/40 font-bold mt-1">out of {(data.exam?.totalMarks || 450) - 50}</span>
                            </div>

                            {/* Normalized */}
                            <div className="bg-white border-4 border-black rounded-xl shadow-[4px_4px_0_#000] p-5 flex-1 flex flex-col items-center justify-center text-center">
                                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-400 mb-1">Normalized</span>
                                {hasNorm ? (
                                    <span className="text-4xl font-black text-blue-600 leading-none">{data.normalizedScore!.toFixed(2)}</span>
                                ) : (
                                    <PendingPill label={isPending || isProcessing ? "In Queue" : "Awaiting Batch"} />
                                )}
                            </div>

                            {/* Computer */}
                            <div className={`border-4 border-black rounded-xl shadow-[4px_4px_0_#000] p-5 flex-1 flex flex-col items-center justify-center text-center ${compMarks >= 33 ? "bg-[#d8b4fe]" : "bg-red-200"}`}>
                                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-black/50 mb-1">Computer (CPM)</span>
                                <span className="text-4xl font-black text-black leading-none">{compMarks}<span className="text-lg text-black/30">/50</span></span>
                                <span className={`text-[10px] font-bold mt-1 ${compMarks >= 33 ? "text-green-800" : "text-red-700"}`}>
                                    {compMarks >= 33 ? "✓ Qualifying" : "✗ Not Qualifying"}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* ══════════════════════════════════════════════════
                        ROW 2: QUICK STATS BAR
                    ══════════════════════════════════════════════════ */}
                    <div className="bg-white border-4 border-black rounded-xl shadow-[4px_4px_0_#000] mb-8 overflow-hidden">
                        <div className="grid grid-cols-2 sm:grid-cols-5 divide-x-2 divide-gray-100">
                            <QuickStat n={data.totalCorrect} label="Correct" color="text-green-600" />
                            <QuickStat n={data.totalWrong} label="Wrong" color="text-red-500" />
                            <QuickStat n={totalSkipped} label="Skipped" color="text-gray-400" />
                            <QuickStat n={`${overallAcc.toFixed(1)}%`} label="Accuracy" color="text-blue-600" />
                            <QuickStat n={`${data.totalAttempted}/${totalQ}`} label="Attempted" color="text-black" />
                        </div>
                    </div>

                    {/* ══════════════════════════════════════════════════
                        ROW 3: RANKING TABLE  +  YOUR POSITION
                    ══════════════════════════════════════════════════ */}
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
                        {/* Rank Table (3/5) */}
                        <div className="lg:col-span-3 bg-white border-4 border-black rounded-xl shadow-[4px_4px_0_#000] overflow-hidden">
                            <div className="px-6 py-4 border-b-2 border-gray-100 flex items-center gap-3">
                                <span className="material-symbols-outlined text-xl">leaderboard</span>
                                <h2 className="font-black text-sm uppercase tracking-wider">Rank Among All Candidates</h2>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-gray-50">
                                            <th className="px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-wider">Category</th>
                                            <th className="px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-wider text-center">Rank</th>
                                            <th className="px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-wider text-center">Percentile</th>
                                            <th className="px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-wider text-center">Out Of</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        <RankRow
                                            label="Overall (All India)"
                                            icon="public"
                                            rank={data.overallRank}
                                            pct={data.overallPercentile}
                                            total={data.exam?.totalSubmissions}
                                            primary
                                        />
                                        <RankRow
                                            label={`Category — ${categoryLabel(data.category)}`}
                                            icon="group"
                                            rank={data.categoryRank}
                                            pct={data.categoryPercentile}
                                            total={null}
                                        />
                                        <RankRow
                                            label={`Shift — ${data.shift?.timeSlot || `#${data.shift?.shiftNumber}`}`}
                                            icon="schedule"
                                            rank={data.shiftRank}
                                            pct={data.shiftPercentile}
                                            total={data.shift?.candidateCount}
                                        />
                                        <RankRow
                                            label={`State — ${data.state || "N/A"}`}
                                            icon="location_on"
                                            rank={data.stateRank}
                                            pct={null}
                                            total={null}
                                        />
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Your Position visual (2/5) */}
                        <div className="lg:col-span-2 bg-white border-4 border-black rounded-xl shadow-[4px_4px_0_#000] overflow-hidden">
                            <div className="px-6 py-4 border-b-2 border-gray-100 flex items-center gap-3">
                                <span className="material-symbols-outlined text-xl">ssid_chart</span>
                                <h2 className="font-black text-sm uppercase tracking-wider">Shift Comparison</h2>
                            </div>
                            <div className="p-6">
                                {data.shift?.avgRawScore != null ? (
                                    <>
                                        <PositionBar
                                            min={data.shift.minRawScore ?? 0}
                                            max={data.shift.maxRawScore ?? data.rawScore}
                                            avg={data.shift.avgRawScore}
                                            yours={data.rawScore}
                                        />
                                        <div className="grid grid-cols-2 gap-3 mt-5">
                                            <ShiftStat label="Shift Average" value={data.shift.avgRawScore.toFixed(0)} />
                                            <ShiftStat label="Shift Topper" value={String(data.shift.maxRawScore ?? "—")} highlight={data.rawScore === data.shift.maxRawScore} />
                                            <ShiftStat label="Candidates" value={data.shift.candidateCount.toLocaleString()} />
                                            <ShiftStat label="Difficulty" value={data.shift.difficultyLabel || "—"} />
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center py-8">
                                        <span className="material-symbols-outlined text-3xl text-gray-200 mb-2">analytics</span>
                                        <p className="text-sm text-gray-400 font-medium">Shift stats will appear after batch processing</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ══════════════════════════════════════════════════
                        ROW 4: SECTION-WISE BREAKDOWN
                    ══════════════════════════════════════════════════ */}
                    <div className="mb-8">
                        <div className="flex items-center gap-3 mb-5">
                            <span className="w-2.5 h-7 bg-black -skew-x-12 block" />
                            <h2 className="font-black text-lg uppercase tracking-wider">Section-wise Performance</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {meritSections.map(([code, s]) => {
                                const meta = SECTION[code] || { label: code, short: code, icon: "quiz", color: "#6b7280", light: "#f9fafb" };
                                const totalQs = s.totalQuestions || (s.correct + s.wrong + s.unattempted);
                                const attempted = s.correct + s.wrong;
                                const acc = s.accuracy ?? (attempted > 0 ? (s.correct / attempted) * 100 : 0);

                                return (
                                    <div key={code} className="bg-white border-4 border-black rounded-xl shadow-[4px_4px_0_#000] hover-lift overflow-hidden">
                                        {/* Colour top bar */}
                                        <div className="h-1.5" style={{ background: meta.color }} />

                                        <div className="p-5">
                                            {/* Header row */}
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className="w-10 h-10 rounded-lg flex items-center justify-center border-2 border-black shadow-[2px_2px_0_#000]"
                                                        style={{ background: meta.light }}
                                                    >
                                                        <span className="material-symbols-outlined text-lg" style={{ color: meta.color }}>{meta.icon}</span>
                                                    </div>
                                                    <div>
                                                        <h3 className="text-sm font-black text-black uppercase leading-tight">{meta.label}</h3>
                                                        <span className="text-[10px] text-gray-400 font-medium">{attempted}/{totalQs} attempted</span>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-3xl font-black text-black leading-none">{s.marks}</p>
                                                    <span className="text-[9px] font-bold text-gray-400 uppercase">marks</span>
                                                </div>
                                            </div>

                                            {/* C / W / S */}
                                            <div className="grid grid-cols-3 gap-2 mb-4">
                                                <Pill n={s.correct} label="Correct" variant="green" />
                                                <Pill n={s.wrong} label="Wrong" variant="red" />
                                                <Pill n={s.unattempted} label="Skipped" variant="gray" />
                                            </div>

                                            {/* Accuracy bar */}
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                                    <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${acc}%`, background: meta.color }} />
                                                </div>
                                                <span className={`text-xs font-black px-2 py-0.5 rounded-md ${acc > 85 ? "text-green-700 bg-green-50" : acc > 60 ? "text-amber-700 bg-amber-50" : "text-red-600 bg-red-50"
                                                    }`}>{acc.toFixed(1)}%</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* ══════════════════════════════════════════════════
                        FOOTER ACTIONS
                    ══════════════════════════════════════════════════ */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                        <button onClick={() => window.print()} className="btn-secondary rounded-xl text-sm flex items-center gap-2">
                            <span className="material-symbols-outlined text-lg">print</span> Print / Save PDF
                        </button>
                        <Link href="/" className="btn-primary rounded-xl text-sm flex items-center gap-2">
                            <span className="material-symbols-outlined text-lg">add_circle</span> New Submission
                        </Link>
                    </div>
                </div>
            </main>

            <style dangerouslySetInnerHTML={{ __html: `@keyframes slide{0%{transform:translateX(-100%)}50%{transform:translateX(250%)}100%{transform:translateX(-100%)}}` }} />
            <Footer />
        </>
    );
}


/* ═══════════════════════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════════════════════════════════ */

function InfoItem({ label, value, mono }: { label: string; value: string | null | undefined; mono?: boolean }) {
    return (
        <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">{label}</p>
            <p className={`text-sm font-bold text-gray-800 leading-snug ${mono ? "font-mono" : ""}`}>{value || "—"}</p>
        </div>
    );
}

function QuickStat({ n, label, color }: { n: number | string; label: string; color: string }) {
    return (
        <div className="py-4 px-5 text-center">
            <p className={`text-2xl font-black leading-none ${color}`}>{n}</p>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mt-1">{label}</p>
        </div>
    );
}

function PendingPill({ label }: { label: string }) {
    return (
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200 mt-1">
            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
            {label}
        </span>
    );
}

function RankRow({ label, icon, rank, pct, total, primary }: { label: string; icon: string; rank: number | null; pct: number | null; total: number | null; primary?: boolean }) {
    return (
        <tr className={primary ? "bg-yellow-50/60" : ""}>
            <td className="px-5 py-3.5">
                <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-base text-gray-400">{icon}</span>
                    <span className={`text-sm ${primary ? "font-black text-black" : "font-bold text-gray-700"}`}>{label}</span>
                </div>
            </td>
            <td className="px-5 py-3.5 text-center">
                {rank != null ? (
                    <span className={`font-black ${primary ? "text-lg text-black" : "text-base text-gray-700"}`}>{ordinal(rank)}</span>
                ) : (
                    <PendingPill label="Pending" />
                )}
            </td>
            <td className="px-5 py-3.5 text-center">
                {pct != null ? (
                    <span className="text-sm font-bold text-gray-600">{pct.toFixed(2)}%</span>
                ) : <span className="text-gray-300">—</span>}
            </td>
            <td className="px-5 py-3.5 text-center">
                {total != null ? (
                    <span className="text-sm font-mono text-gray-500">{total.toLocaleString()}</span>
                ) : <span className="text-gray-300">—</span>}
            </td>
        </tr>
    );
}

function Pill({ n, label, variant }: { n: number; label: string; variant: "green" | "red" | "gray" }) {
    const styles = {
        green: "bg-green-50 border-green-200 text-green-600",
        red: "bg-red-50 border-red-200 text-red-500",
        gray: "bg-gray-50 border-gray-200 text-gray-400",
    };
    const labelColor = { green: "text-green-500", red: "text-red-400", gray: "text-gray-400" };
    return (
        <div className={`rounded-lg border py-2 text-center ${styles[variant]}`}>
            <p className="text-lg font-black leading-none">{n}</p>
            <p className={`text-[9px] font-bold uppercase mt-0.5 tracking-wide ${labelColor[variant]}`}>{label}</p>
        </div>
    );
}

function ShiftStat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
    return (
        <div className={`rounded-lg border-2 px-3 py-2.5 text-center ${highlight ? "border-green-400 bg-green-50" : "border-gray-200 bg-gray-50"}`}>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
            <p className={`text-lg font-black ${highlight ? "text-green-700" : "text-black"}`}>{value}</p>
        </div>
    );
}

function PositionBar({ min, max, avg, yours }: { min: number; max: number; avg: number; yours: number }) {
    const range = max - min || 1;
    const pctYou = Math.max(0, Math.min(100, ((yours - min) / range) * 100));
    const pctAvg = Math.max(0, Math.min(100, ((avg - min) / range) * 100));

    return (
        <div>
            <div className="flex justify-between text-[10px] font-bold text-gray-400 mb-2">
                <span>Min {min}</span>
                <span>Max {max}</span>
            </div>
            <div className="relative h-7 bg-gray-100 rounded-full border-2 border-black overflow-visible">
                {/* Fill */}
                <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-300 to-indigo-500 rounded-l-full" style={{ width: `${pctYou}%`, transition: "width 1s ease" }} />

                {/* Avg line */}
                <div className="absolute top-0 bottom-0 w-px bg-black/30" style={{ left: `${pctAvg}%` }}>
                    <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[8px] font-bold text-gray-500 bg-white px-1 rounded whitespace-nowrap">Avg {avg.toFixed(0)}</div>
                </div>

                {/* You */}
                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10" style={{ left: `${pctYou}%` }}>
                    <div className="w-6 h-6 bg-black border-[3px] border-[#FFDE59] rounded-full flex items-center justify-center shadow-md">
                        <span className="text-[7px] font-black text-white">{yours}</span>
                    </div>
                </div>
            </div>
            <div className="flex items-center justify-center gap-6 mt-2.5 text-[9px] text-gray-400 font-medium">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />You</span>
                <span className="flex items-center gap-1"><span className="w-3 h-px bg-black/30 inline-block" />Average</span>
            </div>
        </div>
    );
}
