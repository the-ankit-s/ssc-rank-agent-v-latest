"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ComposedChart,
} from "recharts";
import {
    BarChart3, TrendingUp, Users, Target, Award, MapPin, RefreshCw, Download,
    Activity, Calendar, Clock, ArrowUpRight, ArrowDownRight, Minus,
    LayoutDashboard, Upload, GraduationCap, Gauge, Crosshair, Sigma, AlertTriangle, Info
} from "lucide-react";
import { useSuspenseAnalytics } from "@/hooks/admin/use-analytics";

const C = ["#6366f1", "#22c55e", "#f43f5e", "#3b82f6", "#eab308", "#ef4444", "#14b8a6", "#8b5cf6", "#f97316", "#06b6d4"];
const tabs = [
    { key: "overview", label: "Overview", icon: LayoutDashboard },
    { key: "submissions", label: "Submissions", icon: Upload },
    { key: "exams", label: "Exams", icon: GraduationCap },
    { key: "scores", label: "Scores", icon: Gauge },
    { key: "users", label: "Demographics", icon: Users },
];
const ranges = [
    { key: "all", label: "All Time" }, { key: "7d", label: "7D" }, { key: "30d", label: "30D" },
    { key: "90d", label: "90D" }, { key: "this_month", label: "This Mo" }, { key: "last_month", label: "Last Mo" },
    { key: "custom", label: "Custom" },
];

// ── Shared primitives ──
function Tip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;
    return (<div className="bg-white border border-gray-200 rounded-lg p-2.5 shadow-lg text-xs">
        <p className="font-bold text-gray-800 mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
            <p key={i} className="text-gray-600"><span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: p.color }} />{p.name}: <b className="text-gray-900">{typeof p.value === "number" ? p.value.toLocaleString() : p.value}</b></p>
        ))}
    </div>);
}
function Kpi({ label, value, delta, icon: I, color, bg }: any) {
    return (<div className="bg-white rounded-xl border border-gray-100 p-4 flex items-start gap-3">
        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5", bg)}><I className={cn("w-4 h-4", color)} /></div>
        <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
            <div className="flex items-baseline gap-2">
                <p className="text-lg font-bold text-gray-900">{typeof value === "number" ? value.toLocaleString() : value}</p>
                {delta !== undefined && delta !== null && <span className={cn("text-[10px] font-bold", delta > 0 ? "text-emerald-500" : delta < 0 ? "text-red-500" : "text-gray-400")}>{delta > 0 ? "+" : ""}{delta}%</span>}
            </div>
        </div>
    </div>);
}
function Card({ title, sub, children, className }: { title: string; sub?: string; children: React.ReactNode; className?: string }) {
    return (<div className={cn("bg-white rounded-xl border border-gray-100 p-5", className)}>
        <div className="mb-4"><h3 className="text-sm font-bold text-gray-800">{title}</h3>{sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}</div>
        {children}
    </div>);
}
function Empty({ msg }: { msg: string }) {
    return (<div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
        <BarChart3 className="w-8 h-8 text-gray-200 mx-auto mb-2" /><p className="text-xs font-semibold text-gray-400">{msg}</p>
    </div>);
}
function Warning({ msg }: { msg: string }) {
    return (<div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div><p className="text-sm font-semibold text-amber-800">Exam Selection Required</p><p className="text-xs text-amber-600 mt-1">{msg}</p></div>
    </div>);
}
function ExamHint() {
    return (<div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-start gap-2">
        <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
        <p className="text-[11px] text-blue-600">Select a specific exam above to see score-based metrics. Mixing scores across exams with different scales produces misleading statistics.</p>
    </div>);
}


export default function AnalyticsPage() {
    const [tab, setTab] = useState("overview");
    const [range, setRange] = useState("all");
    const [customFrom, setCustomFrom] = useState("");
    const [customTo, setCustomTo] = useState("");
    const [examId, setExamId] = useState<number | null>(null);
    const [autoRefresh, setAutoRefresh] = useState(false);

    // React Query hooks - Suspense version
    // Data is guaranteed to be available
    const { data, dataUpdatedAt, refetch } = useSuspenseAnalytics({
        tab, range, examId, customFrom, customTo, autoRefresh,
    });

    const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt) : null;
    const examList = data?.examList || [];

    const selectedExamName = examId ? examList.find((e: any) => e.id === examId)?.name : null;

    const exportCSV = () => {
        if (!data) return;
        let csv = ""; const fn = `analytics_${tab}_${range}${examId ? `_exam${examId}` : ""}.csv`;
        if (tab === "overview") { const k = data.kpis; csv = "Metric,Value\nSubmissions," + k?.submissions?.value; if (k?.avgScore) csv += "\nAvg Score," + k.avgScore.value; if (k?.avgAccuracy) csv += "\nAvg Accuracy," + k.avgAccuracy.value + "%"; }
        else if (tab === "submissions") csv = "Date,Count\n" + (data.dailyTrend || []).map((r: any) => `${r.date},${r.count}`).join("\n");
        else if (tab === "exams") csv = "Exam,Agency,Count,Avg Score,Max Score,Accuracy\n" + (data.perExam || []).map((r: any) => `"${r.examName}",${r.agency},${r.count},${r.avgScore},${r.maxScore},${r.avgAccuracy}%`).join("\n");
        else if (tab === "scores") csv = "Range,Count\n" + (data.scoreDistribution || []).map((r: any) => `${r.bucket},${r.count}`).join("\n");
        else if (tab === "users") csv = "State,Count\n" + (data.stateDist || []).map((r: any) => `"${r.state}",${r.count}`).join("\n");
        const b = new Blob([csv], { type: "text/csv" }); const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href = u; a.download = fn; a.click(); URL.revokeObjectURL(u);
    };

    return (
        <div className="space-y-5 max-w-[1600px] mx-auto pb-20">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Analytics Dashboard</h1>
                    <p className="text-gray-500 text-xs mt-1">
                        {selectedExamName ? <><span className="text-indigo-600 font-semibold">{selectedExamName}</span> · </> : "All exams · "}
                        {lastUpdated && <span className="text-gray-400">{lastUpdated.toLocaleTimeString()}</span>}
                    </p>
                </div>
                <div className="flex items-center gap-1.5">
                    <button onClick={() => setAutoRefresh(!autoRefresh)} className={cn("flex items-center gap-1 h-7 px-2.5 rounded-lg text-[11px] font-semibold border transition-all", autoRefresh ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-white border-gray-200 text-gray-500 hover:border-gray-300")}>
                        <RefreshCw className={cn("w-3 h-3", autoRefresh && "animate-spin")} style={autoRefresh ? { animationDuration: "3s" } : {}} />{autoRefresh ? "Live" : "Auto"}
                    </button>
                    <button onClick={() => refetch()} className="flex items-center gap-1 h-7 px-2.5 bg-white border border-gray-200 rounded-lg text-[11px] font-semibold text-gray-600 hover:border-gray-300"><RefreshCw className="w-3 h-3" /></button>
                    <button onClick={exportCSV} className="flex items-center gap-1 h-7 px-2.5 bg-white border border-gray-200 rounded-lg text-[11px] font-semibold text-gray-600 hover:border-gray-300"><Download className="w-3 h-3" />CSV</button>
                </div>
            </div>

            {/* Controls: Tabs + Exam Selector + Date Range */}
            <div className="bg-white rounded-xl border border-gray-100 p-3 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-1 flex-wrap">
                        {tabs.map(t => {
                            const I = t.icon; return (
                                <button key={t.key} onClick={() => setTab(t.key)} className={cn("flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all", tab === t.key ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-50")}>
                                    <I className="w-3.5 h-3.5" />{t.label}
                                </button>
                            );
                        })}
                    </div>
                    {/* Exam selector */}
                    <div className="flex items-center gap-2">
                        <label className="text-[10px] font-semibold text-gray-400 uppercase">Exam:</label>
                        <select value={examId || ""} onChange={e => setExamId(e.target.value ? Number(e.target.value) : null)}
                            className="h-7 px-2 min-w-[180px] text-xs border border-gray-200 rounded-lg bg-white text-gray-700 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-300">
                            <option value="">All Exams (aggregated)</option>
                            {examList.map((ex: any) => <option key={ex.id} value={ex.id}>{ex.name} ({ex.agency})</option>)}
                        </select>
                    </div>
                </div>
                <div className="flex items-center gap-1 flex-wrap">
                    {ranges.map(r => (<button key={r.key} onClick={() => setRange(r.key)} className={cn("px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all", range === r.key ? "bg-indigo-500 text-white" : "text-gray-400 hover:bg-gray-50")}>{r.label}</button>))}
                    {range === "custom" && <div className="flex items-center gap-1 ml-1">
                        <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="h-6 px-1.5 text-[10px] border border-gray-200 rounded bg-gray-50 font-mono" />
                        <span className="text-[10px] text-gray-300">→</span>
                        <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="h-6 px-1.5 text-[10px] border border-gray-200 rounded bg-gray-50 font-mono" />
                    </div>}
                </div>
            </div>

            {/* Suspense Content - No explicit loading check needed */}
            {tab === "overview" && <OverviewTab d={data} />}
            {tab === "submissions" && <SubmissionsTab d={data} />}
            {tab === "exams" && <ExamsTab d={data} />}
            {tab === "scores" && <ScoresTab d={data} />}
            {tab === "users" && <UsersTab d={data} />}
        </div>
    );
}

// ─── OVERVIEW ──
function OverviewTab({ d }: { d: any }) {
    const k = d.kpis;
    if (!k) return <Empty msg="No data available." />;
    const single = d.isSingleExam;
    return (<div className="space-y-4">
        <div className="bg-gradient-to-r from-indigo-50 to-violet-50 rounded-xl border border-indigo-100/50 p-4">
            <p className="text-sm text-gray-700"><b className="text-gray-900">{k.submissions?.value?.toLocaleString() || 0}</b> submissions
                {!d.examId && <> across <b className="text-gray-900">{k.activeExams?.value || 0}</b> exams</>}
                {d.examId && <> for this exam</>}
                {" "}from <b className="text-gray-900">{k.uniqueStates?.value || 0}</b> states.
                {single && k.avgScore && <> Average score: <b className="text-indigo-700">{k.avgScore.value}</b> with <b className="text-indigo-700">{k.avgAccuracy?.value || 0}%</b> accuracy.</>}
                {k.submissions?.delta !== 0 && <span className={cn("ml-1 text-xs font-bold", k.submissions?.delta > 0 ? "text-emerald-600" : "text-red-500")}>{k.submissions?.delta > 0 ? "↑" : "↓"} {Math.abs(k.submissions?.delta)}% vs prev</span>}</p>
        </div>
        {/* Count KPIs — always shown */}
        <div className={cn("grid gap-3", single ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-2 lg:grid-cols-3")}>
            <Kpi label="Total Submissions" value={k.submissions?.value || 0} delta={k.submissions?.delta} icon={Upload} color="text-indigo-600" bg="bg-indigo-50" />
            {!d.examId && <Kpi label="Active Exams" value={k.activeExams?.value || 0} delta={k.activeExams?.delta} icon={GraduationCap} color="text-blue-600" bg="bg-blue-50" />}
            <Kpi label="States" value={k.uniqueStates?.value || 0} icon={MapPin} color="text-red-500" bg="bg-red-50" />
            {/* Score KPIs — only when single exam */}
            {single && k.avgScore && <Kpi label="Avg Score" value={k.avgScore.value} delta={k.avgScore.delta} icon={Gauge} color="text-emerald-600" bg="bg-emerald-50" />}
            {single && k.avgAccuracy && <Kpi label="Avg Accuracy" value={`${k.avgAccuracy.value}%`} delta={k.avgAccuracy.delta} icon={Target} color="text-rose-600" bg="bg-rose-50" />}
        </div>
        {/* Attempt stats — only single exam */}
        {single && k.avgAttempted && <div className="grid grid-cols-3 gap-3">
            <Kpi label="Avg Attempted" value={k.avgAttempted.value} icon={Crosshair} color="text-violet-600" bg="bg-violet-50" />
            <Kpi label="Avg Correct" value={k.avgCorrect?.value || 0} icon={Award} color="text-emerald-600" bg="bg-emerald-50" />
            <Kpi label="Avg Wrong" value={k.avgWrong?.value || 0} icon={Minus} color="text-red-500" bg="bg-red-50" />
        </div>}
        {!single && <ExamHint />}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card title="Submission Trend" sub="Daily volume">
                {(d.dailyTrend?.length || 0) > 0 ? <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={d.dailyTrend}><defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} /><stop offset="95%" stopColor="#6366f1" stopOpacity={0} /></linearGradient></defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" /><XAxis dataKey="date" fontSize={9} tick={{ fill: "#9CA3AF" }} tickFormatter={v => v.slice(5)} /><YAxis fontSize={9} tick={{ fill: "#9CA3AF" }} width={35} />
                        <Tooltip content={<Tip />} /><Area type="monotone" dataKey="count" name="Submissions" stroke="#6366f1" strokeWidth={2} fill="url(#g1)" />
                    </AreaChart></ResponsiveContainer> : <Empty msg="No trend data." />}
            </Card>
            {/* Top exams — only in "all exams" mode */}
            {!d.examId && (d.topExams?.length || 0) > 0 && <Card title="Top Exams" sub="Most submitted exams">
                <div className="space-y-3">{d.topExams.map((e: any, i: number) => {
                    const mx = d.topExams[0]?.count || 1;
                    return (<div key={i}><div className="flex justify-between text-xs"><span className="font-semibold text-gray-700 truncate max-w-[70%]">{e.examName}</span><span className="font-bold text-gray-900">{e.count.toLocaleString()}</span></div>
                        <div className="h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${(e.count / mx) * 100}%`, backgroundColor: C[i] }} /></div></div>);
                })}</div>
            </Card>}
            {/* Category split (count-based — safe across exams) */}
            <Card title="Category Distribution" sub="Reservation category breakdown">
                {(d.categorySplit?.length || 0) > 0 ? <div className="flex items-center gap-6 justify-center flex-wrap">
                    <ResponsiveContainer width={160} height={160}><PieChart><Pie data={d.categorySplit} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="count" nameKey="category" paddingAngle={3}>
                        {d.categorySplit.map((_: any, i: number) => <Cell key={i} fill={C[i % C.length]} />)}</Pie><Tooltip content={<Tip />} /></PieChart></ResponsiveContainer>
                    <div className="space-y-1.5">{d.categorySplit.map((c: any, i: number) => {
                        const tot = d.categorySplit.reduce((a: number, b: any) => a + b.count, 0);
                        return (<div key={i} className="flex items-center gap-2 text-xs"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: C[i % C.length] }} /><span className="font-semibold text-gray-700 w-10">{c.category}</span><span className="text-gray-400">{c.count.toLocaleString()}</span><span className="text-[10px] text-gray-400 bg-gray-50 px-1 rounded">{tot > 0 ? ((c.count / tot) * 100).toFixed(0) : 0}%</span></div>);
                    })}</div>
                </div> : <Empty msg="No category data." />}
            </Card>
            {/* Attempt vs Accuracy — only single exam */}
            {single && (d.attemptAnalysis?.length || 0) > 0 && <Card title="Attempt vs Accuracy" sub="How attempt count affects performance">
                <ResponsiveContainer width="100%" height={200}>
                    <ComposedChart data={d.attemptAnalysis}><CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                        <XAxis dataKey="bucket" fontSize={10} tick={{ fill: "#9CA3AF" }} /><YAxis yAxisId="l" fontSize={9} tick={{ fill: "#6366f1" }} width={35} /><YAxis yAxisId="r" orientation="right" fontSize={9} tick={{ fill: "#22c55e" }} width={35} domain={[0, 100]} />
                        <Tooltip content={<Tip />} /><Legend wrapperStyle={{ fontSize: 10 }} />
                        <Bar yAxisId="l" dataKey="avgScore" name="Avg Score" fill="#6366f1" radius={[3, 3, 0, 0]} />
                        <Line yAxisId="r" type="monotone" dataKey="avgAccuracy" name="Accuracy %" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
                    </ComposedChart></ResponsiveContainer>
            </Card>}
            {/* Category performance — only single exam */}
            {single && (d.categoryPerformance?.length || 0) > 0 && <Card title="Category Performance" sub="Avg score by reservation category (this exam only)">
                <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={d.categoryPerformance}><CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                        <XAxis dataKey="category" fontSize={10} tick={{ fill: "#6B7280" }} /><YAxis fontSize={9} tick={{ fill: "#9CA3AF" }} width={35} /><Tooltip content={<Tip />} />
                        <Bar dataKey="avgScore" name="Avg Score" radius={[4, 4, 0, 0]}>{(d.categoryPerformance || []).map((_: any, i: number) => <Cell key={i} fill={C[i % C.length]} />)}</Bar>
                    </BarChart></ResponsiveContainer>
            </Card>}
        </div>
        {/* Top Performers — 3 rankings, only single exam */}
        {single && ((d.topByRawScore?.length || 0) > 0 || (d.topByNormScore?.length || 0) > 0 || (d.topByPercentile?.length || 0) > 0) && <TopPerformersSection d={d} />}
    </div>);
}

// ─── SUBMISSIONS ──
function SubmissionsTab({ d }: { d: any }) {
    const s = d.summary;
    return (<div className="space-y-4">
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-100/50 p-4">
            <p className="text-sm text-gray-700"><b className="text-gray-900">{s?.total?.toLocaleString() || 0}</b> total submissions{s?.avgPerDay > 0 && <>, averaging <b>{s.avgPerDay}</b>/day</>}.
                {s?.peakDay && <> Peak: <b className="text-blue-700">{s.peakDay.date}</b> ({s.peakDay.count}).</>}
                {s?.delta !== 0 && <span className={cn("ml-1 text-xs font-bold", s?.delta > 0 ? "text-emerald-600" : "text-red-500")}>{s?.delta > 0 ? "↑" : "↓"} {Math.abs(s?.delta)}%</span>}</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Kpi label="Total" value={s?.total || 0} delta={s?.delta} icon={Upload} color="text-indigo-600" bg="bg-indigo-50" />
            <Kpi label="Avg / Day" value={s?.avgPerDay || 0} icon={Calendar} color="text-blue-600" bg="bg-blue-50" />
            <Kpi label="Peak Day" value={s?.peakDay?.count || "—"} icon={TrendingUp} color="text-amber-600" bg="bg-amber-50" />
            <Kpi label="Prev Period" value={s?.prevTotal || 0} icon={Clock} color="text-gray-400" bg="bg-gray-100" />
        </div>
        {(d.dailyTrend?.length || 0) > 0 ? <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card title="Daily Trend" className="lg:col-span-2">
                <ResponsiveContainer width="100%" height={220}><AreaChart data={d.dailyTrend}>
                    <defs><linearGradient id="gs" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} /><stop offset="95%" stopColor="#6366f1" stopOpacity={0} /></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" /><XAxis dataKey="date" fontSize={9} tick={{ fill: "#9CA3AF" }} tickFormatter={v => v.slice(5)} /><YAxis fontSize={9} tick={{ fill: "#9CA3AF" }} width={35} /><Tooltip content={<Tip />} />
                    <Area type="monotone" dataKey="count" name="Submissions" stroke="#6366f1" strokeWidth={2} fill="url(#gs)" />
                </AreaChart></ResponsiveContainer>
            </Card>
            <Card title="By Hour"><ResponsiveContainer width="100%" height={180}><BarChart data={d.hourly || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" /><XAxis dataKey="hour" fontSize={8} tick={{ fill: "#9CA3AF" }} interval={3} /><YAxis fontSize={9} tick={{ fill: "#9CA3AF" }} width={30} /><Tooltip content={<Tip />} />
                <Bar dataKey="count" name="Submissions" fill="#3b82f6" radius={[3, 3, 0, 0]} />
            </BarChart></ResponsiveContainer></Card>
            <Card title="By Day of Week"><ResponsiveContainer width="100%" height={180}><BarChart data={d.dayOfWeek || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" /><XAxis dataKey="day" fontSize={10} tick={{ fill: "#9CA3AF" }} /><YAxis fontSize={9} tick={{ fill: "#9CA3AF" }} width={30} /><Tooltip content={<Tip />} />
                <Bar dataKey="count" name="Submissions" radius={[4, 4, 0, 0]}>{(d.dayOfWeek || []).map((_: any, i: number) => <Cell key={i} fill={C[i % C.length]} />)}</Bar>
            </BarChart></ResponsiveContainer></Card>
            <Card title="Cumulative Growth"><ResponsiveContainer width="100%" height={180}><AreaChart data={d.cumulativeTrend || []}>
                <defs><linearGradient id="gc" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} /><stop offset="95%" stopColor="#22c55e" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" /><XAxis dataKey="date" fontSize={9} tick={{ fill: "#9CA3AF" }} tickFormatter={v => v.slice(5)} /><YAxis fontSize={9} tick={{ fill: "#9CA3AF" }} width={40} /><Tooltip content={<Tip />} />
                <Area type="monotone" dataKey="cumulative" name="Total" stroke="#22c55e" strokeWidth={2} fill="url(#gc)" />
            </AreaChart></ResponsiveContainer></Card>
            {(d.sourceDist?.length || 0) > 0 && <Card title="Submission Sources">
                <div className="space-y-2">{d.sourceDist.map((s: any, i: number) => {
                    const tot = d.sourceDist.reduce((a: number, b: any) => a + b.count, 0);
                    return (<div key={i} className="flex items-center justify-between text-xs"><div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: C[i % C.length] }} /><span className="font-semibold text-gray-700">{s.source}</span></div><div className="flex items-center gap-2"><span className="font-bold text-gray-900">{s.count.toLocaleString()}</span><span className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">{tot > 0 ? ((s.count / tot) * 100).toFixed(0) : 0}%</span></div></div>);
                })}</div>
            </Card>}
        </div> : <Empty msg="No submissions in this period." />}
    </div>);
}

// ─── EXAMS ──  (comparison tab — shows each exam's OWN stats side by side)
function ExamsTab({ d }: { d: any }) {
    if ((d.perExam?.length || 0) === 0) return <Empty msg="No exam data." />;
    return (<div className="space-y-4">
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-100/50 p-4">
            <p className="text-sm text-gray-700">Comparing <b className="text-gray-900">{d.perExam?.length || 0}</b> exams across <b className="text-gray-900">{d.agencyDist?.length || 0}</b> agencies. Each exam&apos;s statistics are computed independently — scores are <b>not</b> mixed.</p>
        </div>
        <div className="grid grid-cols-1 gap-4">
            <Card title="Exam Comparison" sub="Each exam's own statistics (not blended)">
                <div className="overflow-x-auto max-h-[500px]"><table className="w-full text-xs">
                    <thead className="sticky top-0 bg-white"><tr className="text-[10px] text-gray-400 uppercase tracking-wider border-b border-gray-100">
                        <th className="text-left py-2 pr-2">#</th><th className="text-left py-2 pr-2">Exam</th><th className="text-left py-2 pr-2">Agency</th><th className="text-right py-2 pr-2">Submissions</th><th className="text-right py-2 pr-2">Avg Score</th><th className="text-right py-2 pr-2">Max Score</th><th className="text-right py-2">Accuracy</th>
                    </tr></thead>
                    <tbody>{(d.perExam || []).slice(0, 50).map((e: any, i: number) => (
                        <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50">
                            <td className="py-2 pr-2 text-gray-400 font-mono">{i + 1}</td>
                            <td className="py-2 pr-2"><span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: C[i % C.length] }} /><span className="font-semibold text-gray-800 truncate max-w-[200px]">{e.examName}</span></span></td>
                            <td className="py-2 pr-2 text-gray-500">{e.agency}</td>
                            <td className="py-2 pr-2 text-right font-bold text-gray-900">{e.count.toLocaleString()}</td>
                            <td className="py-2 pr-2 text-right text-gray-700">{e.avgScore}</td>
                            <td className="py-2 pr-2 text-right text-gray-700">{e.maxScore}</td>
                            <td className="py-2 text-right text-gray-600">{e.avgAccuracy}%</td>
                        </tr>
                    ))}</tbody>
                </table></div>
            </Card>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card title="Agency Distribution">
                <ResponsiveContainer width="100%" height={200}><PieChart>
                    <Pie data={d.agencyDist || []} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="count" nameKey="agency" paddingAngle={3}
                        label={({ agency, percent }: any) => `${agency} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                        {(d.agencyDist || []).map((_: any, i: number) => <Cell key={i} fill={C[i % C.length]} />)}
                    </Pie><Tooltip content={<Tip />} />
                </PieChart></ResponsiveContainer>
            </Card>
            {(d.popularityOverTime?.length || 0) > 0 && <Card title="Exam Popularity Over Time" sub="Top 5 exams">
                <ResponsiveContainer width="100%" height={200}><LineChart data={transformPop(d.popularityOverTime)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" /><XAxis dataKey="date" fontSize={9} tick={{ fill: "#9CA3AF" }} tickFormatter={v => v.slice(5)} /><YAxis fontSize={9} tick={{ fill: "#9CA3AF" }} /><Tooltip content={<Tip />} /><Legend wrapperStyle={{ fontSize: 10 }} />
                    {getUniq(d.popularityOverTime).map((n, i) => <Line key={n} type="monotone" dataKey={n} stroke={C[i % C.length]} strokeWidth={2} dot={false} />)}
                </LineChart></ResponsiveContainer>
            </Card>}
        </div>
    </div>);
}

// ─── SCORES ──  (requires single exam)
function ScoresTab({ d }: { d: any }) {
    if (d.warning) return <Warning msg={d.warning} />;
    const s = d.summary;
    if (!s) return <Empty msg="No score data." />;
    return (<div className="space-y-4">
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-100/50 p-4">
            <p className="text-sm text-gray-700">Average: <b className="text-gray-900">{s.avgScore}</b> (median: <b>{s.median}</b>). Range: <b>{s.minScore}</b> → <b>{s.maxScore}</b>. Std dev: <b className="text-amber-700">{s.stdDev}</b>. IQR: <b>{s.p25}</b>–<b>{s.p75}</b>.
                {s.delta !== 0 && <span className={cn("ml-1 text-xs font-bold", s.delta > 0 ? "text-emerald-600" : "text-red-500")}>{s.delta > 0 ? "↑" : "↓"} {Math.abs(s.delta)}%</span>}</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <Kpi label="Avg Score" value={s.avgScore} delta={s.delta} icon={Gauge} color="text-emerald-600" bg="bg-emerald-50" />
            <Kpi label="Median" value={s.median} icon={Activity} color="text-indigo-600" bg="bg-indigo-50" />
            <Kpi label="Std Dev" value={s.stdDev} icon={Sigma} color="text-violet-600" bg="bg-violet-50" />
            <Kpi label="P90" value={s.p90} icon={ArrowUpRight} color="text-blue-600" bg="bg-blue-50" />
            <Kpi label="P10" value={s.p10} icon={ArrowDownRight} color="text-red-500" bg="bg-red-50" />
            <Kpi label="Accuracy" value={`${s.avgAccuracy}%`} icon={Target} color="text-rose-600" bg="bg-rose-50" />
        </div>
        {/* Percentile box */}
        {s.maxScore > 0 && <div className="bg-white rounded-xl border border-gray-100 p-4">
            <h3 className="text-xs font-bold text-gray-800 mb-3">Percentile Distribution</h3>
            <div className="relative h-10 bg-gray-50 rounded-lg mx-4">
                <div className="absolute top-0 h-full bg-indigo-100 rounded" style={{ left: `${(s.p10 / s.maxScore) * 100}%`, width: `${((s.p90 - s.p10) / s.maxScore) * 100}%` }} />
                <div className="absolute top-0 h-full bg-indigo-200 rounded" style={{ left: `${(s.p25 / s.maxScore) * 100}%`, width: `${((s.p75 - s.p25) / s.maxScore) * 100}%` }} />
                <div className="absolute top-0 h-full w-0.5 bg-indigo-600" style={{ left: `${(s.median / s.maxScore) * 100}%` }} />
                {[{ v: s.p10, l: "P10" }, { v: s.p25, l: "P25" }, { v: s.median, l: "Med" }, { v: s.p75, l: "P75" }, { v: s.p90, l: "P90" }].map(p => (
                    <span key={p.l} className="absolute -bottom-5 text-[9px] font-bold text-gray-500 -translate-x-1/2" style={{ left: `${(p.v / s.maxScore) * 100}%` }}>{p.l}: {p.v}</span>
                ))}
            </div><div className="h-6" />
        </div>}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card title="Score Histogram" className="lg:col-span-2">
                <ResponsiveContainer width="100%" height={220}><BarChart data={d.scoreDistribution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" /><XAxis dataKey="bucket" fontSize={9} tick={{ fill: "#9CA3AF" }} /><YAxis fontSize={9} tick={{ fill: "#9CA3AF" }} width={35} /><Tooltip content={<Tip />} />
                    <Bar dataKey="count" name="Candidates" radius={[4, 4, 0, 0]}>{(d.scoreDistribution || []).map((_: any, i: number) => <Cell key={i} fill={C[i % C.length]} />)}</Bar>
                </BarChart></ResponsiveContainer>
            </Card>
            <Card title="Accuracy Distribution">
                <ResponsiveContainer width="100%" height={180}><BarChart data={d.accuracyDistribution || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" /><XAxis dataKey="bucket" fontSize={8} tick={{ fill: "#9CA3AF" }} /><YAxis fontSize={9} tick={{ fill: "#9CA3AF" }} width={30} /><Tooltip content={<Tip />} />
                    <Bar dataKey="count" name="Candidates" radius={[4, 4, 0, 0]}>{(d.accuracyDistribution || []).map((_: any, i: number) => <Cell key={i} fill={C[(i + 3) % C.length]} />)}</Bar>
                </BarChart></ResponsiveContainer>
            </Card>
            <Card title="Score & Accuracy Trend" sub="Daily averages">
                <ResponsiveContainer width="100%" height={180}><ComposedChart data={d.avgScoreTrend || []}>
                    <defs><linearGradient id="gsc" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22c55e" stopOpacity={0.15} /><stop offset="95%" stopColor="#22c55e" stopOpacity={0} /></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" /><XAxis dataKey="date" fontSize={9} tick={{ fill: "#9CA3AF" }} tickFormatter={v => v.slice(5)} /><YAxis yAxisId="l" fontSize={9} tick={{ fill: "#22c55e" }} width={35} /><YAxis yAxisId="r" orientation="right" fontSize={9} tick={{ fill: "#8b5cf6" }} width={35} domain={[0, 100]} />
                    <Tooltip content={<Tip />} /><Legend wrapperStyle={{ fontSize: 10 }} />
                    <Area yAxisId="l" type="monotone" dataKey="avgScore" name="Avg Score" stroke="#22c55e" strokeWidth={2} fill="url(#gsc)" />
                    <Line yAxisId="r" type="monotone" dataKey="avgAccuracy" name="Accuracy %" stroke="#8b5cf6" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                </ComposedChart></ResponsiveContainer>
            </Card>
            {d.normComparison && d.normComparison.avgNormalized != null && <Card title="Raw vs Normalized" sub="Score normalization impact" className="lg:col-span-2">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center"><p className="text-[10px] text-gray-400 uppercase font-semibold">Avg Raw</p><p className="text-lg font-bold text-indigo-600">{d.normComparison.avgRaw}</p></div>
                    <div className="text-center"><p className="text-[10px] text-gray-400 uppercase font-semibold">Avg Normalized</p><p className="text-lg font-bold text-emerald-600">{d.normComparison.avgNormalized}</p></div>
                    <div className="text-center"><p className="text-[10px] text-gray-400 uppercase font-semibold">Max Raw</p><p className="text-lg font-bold text-gray-800">{d.normComparison.maxRaw}</p></div>
                    <div className="text-center"><p className="text-[10px] text-gray-400 uppercase font-semibold">Max Normalized</p><p className="text-lg font-bold text-gray-800">{d.normComparison.maxNormalized || "—"}</p></div>
                </div>
                <p className="text-[11px] text-gray-400 mt-3 text-center">{d.normComparison.normalizedCount} of {d.normComparison.totalCount} submissions normalized</p>
            </Card>}
        </div>
    </div>);
}

// ─── DEMOGRAPHICS ──
function UsersTab({ d }: { d: any }) {
    const s = d.summary; const single = d.isSingleExam;
    return (<div className="space-y-4">
        <div className="bg-gradient-to-r from-rose-50 to-pink-50 rounded-xl border border-rose-100/50 p-4">
            <p className="text-sm text-gray-700"><b className="text-gray-900">{s?.total?.toLocaleString() || 0}</b> candidates from <b className="text-gray-900">{s?.uniqueStates || 0}</b> states.
                {!single && " Demographic counts shown. Select an exam for score-based breakdowns."}
                {s?.delta !== 0 && <span className={cn("ml-1 text-xs font-bold", s?.delta > 0 ? "text-emerald-600" : "text-red-500")}> {s?.delta > 0 ? "↑" : "↓"}{Math.abs(s?.delta)}%</span>}</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
            <Kpi label="Total" value={s?.total || 0} delta={s?.delta} icon={Users} color="text-indigo-600" bg="bg-indigo-50" />
            <Kpi label="States" value={s?.uniqueStates || 0} icon={MapPin} color="text-red-500" bg="bg-red-50" />
            <Kpi label="Prev Period" value={s?.prevTotal || 0} icon={Clock} color="text-gray-400" bg="bg-gray-100" />
        </div>
        {!single && <ExamHint />}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Count-based (always safe) */}
            <Card title="Top States" sub="By submission count" className="lg:col-span-2">
                {(d.stateDist?.length || 0) > 0 ? <ResponsiveContainer width="100%" height={Math.min(400, Math.max(180, (d.stateDist?.length || 0) * 26))}>
                    <BarChart data={d.stateDist} layout="vertical" margin={{ left: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" /><XAxis type="number" fontSize={10} tick={{ fill: "#9CA3AF" }} />
                        <YAxis type="category" dataKey="state" fontSize={10} tick={{ fill: "#6B7280" }} width={120} /><Tooltip content={<Tip />} />
                        <Bar dataKey="count" name="Submissions" radius={[0, 4, 4, 0]}>{(d.stateDist || []).map((_: any, i: number) => <Cell key={i} fill={C[i % C.length]} />)}</Bar>
                    </BarChart></ResponsiveContainer> : <Empty msg="No state data." />}
            </Card>
            <Card title="Category Split">
                <ResponsiveContainer width="100%" height={200}><PieChart>
                    <Pie data={d.categoryDist || []} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="count" nameKey="category" paddingAngle={3}
                        label={({ category, percent }: any) => `${category} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                        {(d.categoryDist || []).map((_: any, i: number) => <Cell key={i} fill={C[i % C.length]} />)}
                    </Pie><Tooltip content={<Tip />} />
                </PieChart></ResponsiveContainer>
            </Card>
            <Card title="Gender & PWD">
                <div className="grid grid-cols-2 gap-3">
                    <div><p className="text-[10px] font-semibold text-gray-400 uppercase text-center mb-1">Gender</p>
                        <ResponsiveContainer width="100%" height={130}><PieChart><Pie data={d.genderDist || []} cx="50%" cy="50%" innerRadius={22} outerRadius={45} dataKey="count" nameKey="gender" paddingAngle={3}>
                            {(d.genderDist || []).map((_: any, i: number) => <Cell key={i} fill={C[(i + 2) % C.length]} />)}</Pie><Tooltip content={<Tip />} /></PieChart></ResponsiveContainer>
                        <div className="flex justify-center gap-2 mt-1">{(d.genderDist || []).map((g: any, i: number) => (<span key={i} className="flex items-center gap-1 text-[9px] text-gray-500"><span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: C[(i + 2) % C.length] }} />{g.gender}</span>))}</div>
                    </div>
                    <div><p className="text-[10px] font-semibold text-gray-400 uppercase text-center mb-1">PWD</p>
                        <ResponsiveContainer width="100%" height={130}><PieChart><Pie data={d.pwdDist || []} cx="50%" cy="50%" innerRadius={22} outerRadius={45} dataKey="count" nameKey="label" paddingAngle={3}>
                            {(d.pwdDist || []).map((_: any, i: number) => <Cell key={i} fill={i === 0 ? "#6366f1" : "#e5e7eb"} />)}</Pie><Tooltip content={<Tip />} /></PieChart></ResponsiveContainer>
                        <div className="flex justify-center gap-2 mt-1">{(d.pwdDist || []).map((p: any, i: number) => (<span key={i} className="flex items-center gap-1 text-[9px] text-gray-500"><span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: i === 0 ? "#6366f1" : "#e5e7eb" }} />{p.label}</span>))}</div>
                    </div>
                </div>
            </Card>
            {/* Score-based — only single exam */}
            {single && (d.categoryAvgScores?.length || 0) > 0 && <Card title="Performance by Category" sub="Within this exam only" className="lg:col-span-2">
                <ResponsiveContainer width="100%" height={200}><ComposedChart data={d.categoryAvgScores}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" /><XAxis dataKey="category" fontSize={10} tick={{ fill: "#6B7280" }} /><YAxis yAxisId="l" fontSize={9} tick={{ fill: "#22c55e" }} width={35} /><YAxis yAxisId="r" orientation="right" fontSize={9} tick={{ fill: "#8b5cf6" }} width={35} domain={[0, 100]} />
                    <Tooltip content={<Tip />} /><Legend wrapperStyle={{ fontSize: 10 }} />
                    <Bar yAxisId="l" dataKey="avgScore" name="Avg Score" radius={[4, 4, 0, 0]}>{(d.categoryAvgScores || []).map((_: any, i: number) => <Cell key={i} fill={C[i % C.length]} />)}</Bar>
                    <Line yAxisId="r" type="monotone" dataKey="avgAccuracy" name="Accuracy %" stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 3 }} />
                </ComposedChart></ResponsiveContainer>
            </Card>}
            {single && (d.genderPerformance?.length || 0) > 0 && <Card title="Gender Performance" sub="Within this exam only">
                <div className="space-y-2">{d.genderPerformance.map((g: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: C[(i + 2) % C.length] }} /><span className="text-xs font-semibold text-gray-700">{g.gender}</span><span className="text-[10px] text-gray-400">({g.count.toLocaleString()})</span></div>
                        <div className="flex items-center gap-3"><span className="text-xs"><span className="text-gray-400">Score: </span><b className="text-gray-900">{g.avgScore}</b></span><span className="text-xs"><span className="text-gray-400">Acc: </span><b className="text-gray-900">{g.avgAccuracy}%</b></span></div>
                    </div>
                ))}</div>
            </Card>}
            {single && (d.topStatesByScore?.length || 0) > 0 && <Card title="Top States by Avg Score" sub="Min 5 submissions required">
                <div className="space-y-1.5">{d.topStatesByScore.map((s: any, i: number) => {
                    const mx = d.topStatesByScore[0]?.avgScore || 1;
                    return (<div key={i}><div className="flex justify-between text-xs"><span className="font-semibold text-gray-700">{s.state}</span><span className="text-gray-500">{s.avgScore} <span className="text-gray-300">({s.count})</span></span></div>
                        <div className="h-1 bg-gray-100 rounded-full mt-0.5 overflow-hidden"><div className="h-full rounded-full bg-indigo-400" style={{ width: `${(s.avgScore / mx) * 100}%` }} /></div></div>);
                })}</div>
            </Card>}
        </div>
    </div>);
}

// ─── TOP PERFORMERS (3 tabs) ──
function TopPerformersSection({ d }: { d: any }) {
    const [perfTab, setPerfTab] = useState<"raw" | "norm" | "pctl">("raw");
    const tabDefs = [
        { key: "raw" as const, label: "By Raw Score", data: d.topByRawScore, highlight: "rawScore" },
        { key: "norm" as const, label: "By Norm. Score", data: d.topByNormScore, highlight: "normalizedScore" },
        { key: "pctl" as const, label: "By Percentile", data: d.topByPercentile, highlight: "percentile" },
    ].filter(t => t.data?.length > 0);

    // Auto-select first available tab
    const activeTab = tabDefs.find(t => t.key === perfTab) || tabDefs[0];
    const rows = activeTab?.data || [];

    return (<div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
            <div><h3 className="text-sm font-bold text-gray-800">Top Performers</h3><p className="text-[11px] text-gray-400 mt-0.5">Top 10 candidates ranked by different metrics</p></div>
            <div className="flex items-center gap-1">
                {tabDefs.map(t => (
                    <button key={t.key} onClick={() => setPerfTab(t.key)}
                        className={cn("px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all",
                            (activeTab?.key === t.key) ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-50")}>
                        {t.label}
                    </button>
                ))}
            </div>
        </div>
        {rows.length > 0 ? <div className="overflow-x-auto"><table className="w-full text-xs">
            <thead><tr className="text-[10px] text-gray-400 uppercase tracking-wider border-b border-gray-100">
                <th className="text-left py-2 pr-2">#</th>
                <th className="text-left py-2 pr-2">Name</th>
                <th className="text-left py-2 pr-2">Roll No.</th>
                <th className="text-left py-2 pr-2">Cat</th>
                <th className="text-left py-2 pr-2">Gender</th>
                <th className="text-left py-2 pr-2">State</th>
                <th className={cn("text-right py-2 pr-2", activeTab?.highlight === "rawScore" && "text-indigo-600")}>Raw Score</th>
                <th className={cn("text-right py-2 pr-2", activeTab?.highlight === "normalizedScore" && "text-indigo-600")}>Norm. Score</th>
                <th className="text-right py-2 pr-2">Accuracy</th>
                <th className="text-right py-2 pr-2">Attempted</th>
                <th className="text-right py-2 pr-2">Correct</th>
                <th className="text-right py-2 pr-2">Wrong</th>
                <th className={cn("text-right py-2 pr-2", activeTab?.highlight === "percentile" && "text-indigo-600")}>Percentile</th>
                <th className="text-right py-2">Rank</th>
            </tr></thead>
            <tbody>{rows.map((p: any, i: number) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="py-2 pr-2"><span className={cn("inline-flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-bold", i < 3 ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500")}>{i + 1}</span></td>
                    <td className="py-2 pr-2 font-semibold text-gray-800 whitespace-nowrap">{p.name}</td>
                    <td className="py-2 pr-2 text-gray-500 font-mono text-[10px]">{p.rollNumber || "—"}</td>
                    <td className="py-2 pr-2"><span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-[10px] font-semibold">{p.category}</span></td>
                    <td className="py-2 pr-2 text-gray-600">{p.gender === "M" ? "Male" : p.gender === "F" ? "Female" : p.gender || "—"}</td>
                    <td className="py-2 pr-2 text-gray-500 truncate max-w-[100px]">{p.state || "—"}</td>
                    <td className={cn("py-2 pr-2 text-right font-bold", activeTab?.highlight === "rawScore" ? "text-indigo-700 bg-indigo-50/50" : "text-gray-900")}>{p.rawScore}</td>
                    <td className={cn("py-2 pr-2 text-right font-semibold", activeTab?.highlight === "normalizedScore" ? "text-indigo-700 bg-indigo-50/50" : "text-indigo-600")}>{p.normalizedScore != null ? p.normalizedScore : "—"}</td>
                    <td className="py-2 pr-2 text-right text-gray-600">{p.accuracy != null ? `${p.accuracy}%` : "—"}</td>
                    <td className="py-2 pr-2 text-right text-gray-600">{p.attempted ?? "—"}</td>
                    <td className="py-2 pr-2 text-right text-emerald-600 font-semibold">{p.correct ?? "—"}</td>
                    <td className="py-2 pr-2 text-right text-red-500">{p.wrong ?? "—"}</td>
                    <td className={cn("py-2 pr-2 text-right", activeTab?.highlight === "percentile" && "bg-indigo-50/50")}>{p.percentile != null ? <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold", activeTab?.highlight === "percentile" ? "bg-indigo-100 text-indigo-700" : "bg-blue-50 text-blue-700")}>{p.percentile}%</span> : <span className="text-gray-400">—</span>}</td>
                    <td className="py-2 text-right font-bold text-gray-700">{p.rank || "—"}</td>
                </tr>
            ))}</tbody>
        </table></div> : <Empty msg="No data for this ranking." />}
    </div>);
}

// ── helpers ──
function getUniq(d: any[]): string[] { return [...new Set(d.map(x => x.examName))]; }
function transformPop(raw: any[]): any[] {
    const m: Record<string, any> = {};
    raw.forEach(r => { if (!m[r.date]) m[r.date] = { date: r.date }; m[r.date][r.examName] = r.count; });
    return Object.values(m);
}
