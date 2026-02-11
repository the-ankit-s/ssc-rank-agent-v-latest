"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ComposedChart,
} from "recharts";

const COLORS = ["#A78BFA", "#34D399", "#F472B6", "#60A5FA", "#FBBF24", "#F87171", "#6EE7B7", "#93C5FD", "#FCA5A1", "#C4B5FD"];

const tabs = [
    { key: "overview", label: "Overview", icon: "dashboard" },
    { key: "submissions", label: "Submissions", icon: "upload_file" },
    { key: "exams", label: "Exams", icon: "quiz" },
    { key: "scores", label: "Scores", icon: "score" },
    { key: "users", label: "Users", icon: "group" },
];

const dateRanges = [
    { key: "all", label: "All Time" },
    { key: "7d", label: "7 Days" },
    { key: "30d", label: "30 Days" },
    { key: "90d", label: "90 Days" },
    { key: "this_month", label: "This Month" },
    { key: "last_month", label: "Last Month" },
    { key: "custom", label: "Custom" },
];

export default function AnalyticsPage() {
    const [tab, setTab] = useState("overview");
    const [range, setRange] = useState("all");
    const [customFrom, setCustomFrom] = useState("");
    const [customTo, setCustomTo] = useState("");
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            let url = `/api/admin/analytics?tab=${tab}&range=${range}`;
            if (range === "custom" && customFrom && customTo) {
                url += `&from=${customFrom}&to=${customTo}`;
            }
            const res = await fetch(url);
            const json = await res.json();
            setData(json);
            setLastUpdated(new Date());
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [tab, range, customFrom, customTo]);

    useEffect(() => { fetchData(); }, [fetchData]);

    useEffect(() => {
        if (autoRefresh) {
            intervalRef.current = setInterval(fetchData, 60000);
        }
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [autoRefresh, fetchData]);

    const exportCSV = () => {
        if (!data) return;
        let csv = "";
        const filename = `analytics_${tab}_${range}.csv`;
        if (tab === "overview") {
            const k = data.kpis;
            csv = "Metric,Value,Previous,Change %\n";
            csv += `Submissions,${k?.submissions?.value},${k?.submissions?.prev},${k?.submissions?.delta}%\n`;
            csv += `Avg Score,${k?.avgScore?.value},${k?.avgScore?.prev},${k?.avgScore?.delta}%\n`;
            csv += `Avg Accuracy,${k?.avgAccuracy?.value},${k?.avgAccuracy?.prev},${k?.avgAccuracy?.delta}%\n`;
            csv += `Active Exams,${k?.activeExams?.value},${k?.activeExams?.prev},${k?.activeExams?.delta}%\n`;
        } else if (tab === "submissions") {
            csv = "Date,Count\n" + (data.dailyTrend || []).map((r: any) => `${r.date},${r.count}`).join("\n");
        } else if (tab === "exams") {
            csv = "Exam,Agency,Submissions,Avg Score\n" + (data.perExam || []).map((r: any) => `"${r.examName}",${r.agency},${r.count},${r.avgScore}`).join("\n");
        } else if (tab === "scores") {
            csv = "Range,Count\n" + (data.scoreDistribution || []).map((r: any) => `${r.bucket},${r.count}`).join("\n");
        } else if (tab === "users") {
            csv = "State,Count\n" + (data.stateDist || []).map((r: any) => `"${r.state}",${r.count}`).join("\n");
        }
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = filename; a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Analytics</h1>
                    <p className="text-gray-500 font-medium mt-1">
                        Platform-wide insights and reporting
                        {lastUpdated && <span className="text-xs ml-2 text-gray-400">· Last updated {lastUpdated.toLocaleTimeString()}</span>}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setAutoRefresh(!autoRefresh)}
                        className={cn("flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border-2",
                            autoRefresh ? "bg-emerald-50 border-emerald-300 text-emerald-700" : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
                        )}
                    >
                        <span className={cn("material-symbols-outlined text-sm", autoRefresh && "animate-spin")} style={autoRefresh ? { animationDuration: "3s" } : {}}>sync</span>
                        {autoRefresh ? "Live" : "Auto"}
                    </button>
                    <button onClick={() => fetchData()} className="flex items-center gap-1.5 px-3 py-2 card-base bg-white text-gray-600 text-xs font-bold hover:shadow-neo-hover transition-all">
                        <span className="material-symbols-outlined text-sm">refresh</span>
                        Refresh
                    </button>
                    <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-2 card-base bg-white text-gray-700 text-xs font-bold hover:shadow-neo-hover transition-all">
                        <span className="material-symbols-outlined text-sm">download</span>
                        CSV
                    </button>
                </div>
            </div>

            {/* Tabs + Date Range */}
            <div className="flex flex-col gap-3">
                <div className="flex items-center gap-1.5 flex-wrap">
                    {tabs.map(t => (
                        <button key={t.key} onClick={() => setTab(t.key)}
                            className={cn("flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all border-2",
                                tab === t.key ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200 hover:border-gray-900"
                            )}>
                            <span className="material-symbols-outlined text-lg">{t.icon}</span>
                            {t.label}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                    {dateRanges.map(r => (
                        <button key={r.key} onClick={() => setRange(r.key)}
                            className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-all border-2",
                                range === r.key ? "bg-[#A78BFA] text-white border-[#A78BFA]" : "bg-white text-gray-500 border-gray-200 hover:border-[#A78BFA]"
                            )}>
                            {r.label}
                        </button>
                    ))}
                    {range === "custom" && (
                        <div className="flex items-center gap-2 ml-2">
                            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                                className="px-2 py-1 text-xs border-2 border-gray-200 rounded-lg bg-white font-mono" />
                            <span className="text-xs text-gray-400">to</span>
                            <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                                className="px-2 py-1 text-xs border-2 border-gray-200 rounded-lg bg-white font-mono" />
                        </div>
                    )}
                </div>
            </div>

            {/* Content */}
            {loading ? <LoadingSkeleton /> : (
                <>
                    {tab === "overview" && data && <OverviewTab data={data} />}
                    {tab === "submissions" && data && <SubmissionsTab data={data} />}
                    {tab === "exams" && data && <ExamsTab data={data} />}
                    {tab === "scores" && data && <ScoresTab data={data} />}
                    {tab === "users" && data && <UsersTab data={data} />}
                </>
            )}
        </div>
    );
}

// ─── Reusable Components ───────────────────────────────────────────
function ChartCard({ title, subtitle, children, className }: { title: string; subtitle?: string; children: React.ReactNode; className?: string }) {
    return (
        <div className={cn("card-base bg-white p-5", className)}>
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest">{title}</h3>
                    {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
                </div>
            </div>
            {children}
        </div>
    );
}

function KpiCard({ label, value, delta, icon, color, bg }: { label: string; value: string | number; delta?: number; icon: string; color: string; bg: string }) {
    return (
        <div className="card-base bg-white p-4 flex items-center gap-4">
            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0", bg)}>
                <span className={cn("material-symbols-outlined text-2xl", color)}>{icon}</span>
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider truncate">{label}</p>
                <p className="text-2xl font-bold text-gray-900 leading-tight">{typeof value === "number" ? value.toLocaleString() : value}</p>
            </div>
            {delta !== undefined && (
                <div className={cn("flex items-center gap-0.5 text-xs font-bold px-2 py-1 rounded-lg",
                    delta > 0 ? "bg-emerald-50 text-emerald-600" : delta < 0 ? "bg-red-50 text-red-500" : "bg-gray-50 text-gray-500"
                )}>
                    <span className="material-symbols-outlined text-sm">{delta > 0 ? "trending_up" : delta < 0 ? "trending_down" : "trending_flat"}</span>
                    {Math.abs(delta)}%
                </div>
            )}
        </div>
    );
}

function EmptyState({ message }: { message: string }) {
    return (
        <div className="card-base bg-white p-12 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-3xl text-gray-300">bar_chart</span>
            </div>
            <p className="text-sm font-bold text-gray-400">{message}</p>
            <p className="text-xs text-gray-300 mt-1">Try adjusting the date range or check back later.</p>
        </div>
    );
}

function LoadingSkeleton() {
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="card-base bg-white p-4">
                        <div className="h-3 w-20 bg-gray-100 rounded-full animate-pulse mb-3" />
                        <div className="h-7 w-28 bg-gray-100 rounded-lg animate-pulse" />
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="card-base bg-white p-5">
                        <div className="h-4 w-32 bg-gray-100 rounded-full animate-pulse mb-6" />
                        <div className="h-52 bg-gray-50 rounded-xl animate-pulse" />
                    </div>
                ))}
            </div>
        </div>
    );
}

function CustomTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white border-2 border-gray-200 rounded-xl p-3 shadow-md">
            <p className="text-xs font-bold text-gray-900 mb-1">{label}</p>
            {payload.map((p: any, i: number) => (
                <p key={i} className="text-xs text-gray-600">
                    <span className="inline-block w-2 h-2 rounded-full mr-1.5 align-middle" style={{ backgroundColor: p.color }} />
                    {p.name}: <span className="font-bold text-gray-900">{typeof p.value === "number" ? p.value.toLocaleString() : p.value}</span>
                </p>
            ))}
        </div>
    );
}

// ─── Overview Tab ──────────────────────────────────────────────────
function OverviewTab({ data }: { data: any }) {
    const k = data.kpis;
    if (!k) return <EmptyState message="No data available for this period." />;

    return (
        <div className="space-y-4">
            {/* KPI Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <KpiCard label="Submissions" value={k.submissions?.value || 0} delta={k.submissions?.delta} icon="upload_file" color="text-[#A78BFA]" bg="bg-[#A78BFA]/10" />
                <KpiCard label="Avg Score" value={k.avgScore?.value || 0} delta={k.avgScore?.delta} icon="score" color="text-[#34D399]" bg="bg-[#34D399]/10" />
                <KpiCard label="Avg Accuracy" value={`${k.avgAccuracy?.value || 0}%`} delta={k.avgAccuracy?.delta} icon="target" color="text-[#F472B6]" bg="bg-[#F472B6]/10" />
                <KpiCard label="Active Exams" value={k.activeExams?.value || 0} delta={k.activeExams?.delta} icon="quiz" color="text-[#60A5FA]" bg="bg-[#60A5FA]/10" />
            </div>

            {/* Secondary KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                <KpiCard label="Highest Score" value={k.maxScore?.value || 0} icon="emoji_events" color="text-[#FBBF24]" bg="bg-[#FBBF24]/10" />
                <KpiCard label="Unique States" value={k.uniqueStates?.value || 0} icon="location_on" color="text-[#F87171]" bg="bg-[#F87171]/10" />
                <div className="card-base bg-gradient-to-br from-violet-50/60 to-purple-50/60 p-4">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">vs Previous Period</p>
                    <div className="space-y-1.5">
                        <DeltaRow label="Submissions" current={k.submissions?.value} prev={k.submissions?.prev} delta={k.submissions?.delta} />
                        <DeltaRow label="Avg Score" current={k.avgScore?.value} prev={k.avgScore?.prev} delta={k.avgScore?.delta} />
                        <DeltaRow label="Accuracy" current={`${k.avgAccuracy?.value}%`} prev={`${k.avgAccuracy?.prev}%`} delta={k.avgAccuracy?.delta} />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Sparkline Trend */}
                <ChartCard title="Submission Trend" subtitle="Daily submission volume">
                    {(data.dailyTrend?.length || 0) > 0 ? (
                        <ResponsiveContainer width="100%" height={200}>
                            <AreaChart data={data.dailyTrend}>
                                <defs>
                                    <linearGradient id="ovGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#A78BFA" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#A78BFA" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="date" fontSize={10} tick={{ fill: "#9CA3AF" }} tickFormatter={(v) => v.slice(5)} />
                                <YAxis fontSize={10} tick={{ fill: "#9CA3AF" }} width={40} />
                                <Tooltip content={<CustomTooltip />} />
                                <Area type="monotone" dataKey="count" name="Submissions" stroke="#A78BFA" strokeWidth={2} fill="url(#ovGrad)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : <EmptyState message="No submissions in this period." />}
                </ChartCard>

                {/* Top Exams */}
                <ChartCard title="Top Exams" subtitle="Most popular exams">
                    {(data.topExams?.length || 0) > 0 ? (
                        <div className="space-y-2.5">
                            {data.topExams.map((exam: any, i: number) => {
                                const maxCount = data.topExams[0]?.count || 1;
                                return (
                                    <div key={i} className="space-y-1">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-gray-700 truncate max-w-[70%]">{exam.examName}</span>
                                            <span className="text-xs font-bold text-gray-900">{exam.count.toLocaleString()}</span>
                                        </div>
                                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(exam.count / maxCount) * 100}%`, backgroundColor: COLORS[i] }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : <EmptyState message="No exam data available." />}
                </ChartCard>

                {/* Category Split */}
                <ChartCard title="Category Distribution" className="lg:col-span-2">
                    {(data.categorySplit?.length || 0) > 0 ? (
                        <div className="flex items-center gap-8 justify-center flex-wrap">
                            <ResponsiveContainer width={220} height={220}>
                                <PieChart>
                                    <Pie data={data.categorySplit} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                                        dataKey="count" nameKey="category" paddingAngle={3}>
                                        {data.categorySplit.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="space-y-2">
                                {data.categorySplit.map((c: any, i: number) => {
                                    const total = data.categorySplit.reduce((a: number, b: any) => a + b.count, 0);
                                    return (
                                        <div key={i} className="flex items-center gap-3">
                                            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                            <span className="text-sm font-bold text-gray-700 w-10">{c.category}</span>
                                            <span className="text-xs text-gray-400 w-20 text-right">{c.count.toLocaleString()}</span>
                                            <span className="text-xs font-bold text-gray-500">{total > 0 ? ((c.count / total) * 100).toFixed(1) : 0}%</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : <EmptyState message="No category data." />}
                </ChartCard>
            </div>
        </div>
    );
}

function DeltaRow({ label, current, prev, delta }: { label: string; current: any; prev: any; delta: number }) {
    return (
        <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500 font-medium">{label}</span>
            <div className="flex items-center gap-2">
                <span className="text-gray-400">{typeof prev === "number" ? prev.toLocaleString() : prev}</span>
                <span className="text-gray-300">→</span>
                <span className="font-bold text-gray-900">{typeof current === "number" ? current.toLocaleString() : current}</span>
                <span className={cn("font-bold", delta > 0 ? "text-emerald-500" : delta < 0 ? "text-red-500" : "text-gray-400")}>
                    {delta > 0 ? "+" : ""}{delta}%
                </span>
            </div>
        </div>
    );
}

// ─── Submissions Tab ───────────────────────────────────────────────
function SubmissionsTab({ data }: { data: any }) {
    const s = data.summary;
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <KpiCard label="Total Submissions" value={s?.total || 0} delta={s?.delta} icon="upload_file" color="text-[#A78BFA]" bg="bg-[#A78BFA]/10" />
                <KpiCard label="Previous Period" value={s?.prevTotal || 0} icon="history" color="text-gray-400" bg="bg-gray-100" />
                <KpiCard label="Avg / Day" value={s?.avgPerDay || 0} icon="calendar_today" color="text-[#60A5FA]" bg="bg-[#60A5FA]/10" />
                <KpiCard label="Peak Day" value={s?.peakDay ? `${s.peakDay.count}` : "—"} icon="trending_up" color="text-[#FBBF24]" bg="bg-[#FBBF24]/10" />
            </div>

            {(data.dailyTrend?.length || 0) > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <ChartCard title="Daily Submission Trend" subtitle="Current period volume" className="lg:col-span-2">
                        <ResponsiveContainer width="100%" height={280}>
                            <AreaChart data={data.dailyTrend}>
                                <defs>
                                    <linearGradient id="colorSub" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#A78BFA" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#A78BFA" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="date" fontSize={10} tick={{ fill: "#9CA3AF" }} tickFormatter={(v) => v.slice(5)} />
                                <YAxis fontSize={10} tick={{ fill: "#9CA3AF" }} width={40} />
                                <Tooltip content={<CustomTooltip />} />
                                <Area type="monotone" dataKey="count" name="Submissions" stroke="#A78BFA" strokeWidth={2.5} fill="url(#colorSub)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </ChartCard>

                    <ChartCard title="Cumulative Submissions" subtitle="Running total over time">
                        <ResponsiveContainer width="100%" height={240}>
                            <AreaChart data={data.cumulativeTrend || []}>
                                <defs>
                                    <linearGradient id="colorCum" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#34D399" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#34D399" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="date" fontSize={10} tick={{ fill: "#9CA3AF" }} tickFormatter={(v) => v.slice(5)} />
                                <YAxis fontSize={10} tick={{ fill: "#9CA3AF" }} width={50} />
                                <Tooltip content={<CustomTooltip />} />
                                <Area type="monotone" dataKey="cumulative" name="Total" stroke="#34D399" strokeWidth={2} fill="url(#colorCum)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </ChartCard>

                    <ChartCard title="Hour of Day" subtitle="When submissions are made">
                        <ResponsiveContainer width="100%" height={240}>
                            <BarChart data={data.hourly || []}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="hour" fontSize={9} tick={{ fill: "#9CA3AF" }} interval={3} />
                                <YAxis fontSize={10} tick={{ fill: "#9CA3AF" }} width={40} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="count" name="Submissions" fill="#60A5FA" radius={[3, 3, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>

                    <ChartCard title="Day of Week" subtitle="Weekly distribution">
                        <ResponsiveContainer width="100%" height={240}>
                            <BarChart data={data.dayOfWeek || []}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="day" fontSize={11} tick={{ fill: "#9CA3AF" }} />
                                <YAxis fontSize={10} tick={{ fill: "#9CA3AF" }} width={40} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="count" name="Submissions" radius={[4, 4, 0, 0]}>
                                    {(data.dayOfWeek || []).map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>
                </div>
            ) : <EmptyState message="No submissions in this period." />}
        </div>
    );
}

// ─── Exams Tab ─────────────────────────────────────────────────────
function ExamsTab({ data }: { data: any }) {
    if ((data.perExam?.length || 0) === 0) return <EmptyState message="No exam data in this period." />;
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Submissions per Exam with avg score overlay */}
            <ChartCard title="Submissions per Exam" subtitle="Top 100 exams by submission count" className="lg:col-span-2">
                <ResponsiveContainer width="100%" height={Math.max(300, (data.perExam?.length || 0) * 38)}>
                    <BarChart data={data.perExam} layout="vertical" margin={{ left: 10, right: 30 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis type="number" fontSize={11} tick={{ fill: "#9CA3AF" }} />
                        <YAxis type="category" dataKey="examName" fontSize={10} tick={{ fill: "#6B7280" }} width={200} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="count" name="Submissions" radius={[0, 4, 4, 0]}>
                            {(data.perExam || []).map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
                {/* Tabular summary beneath */}
                <div className="mt-4 border-t border-gray-100 pt-4 max-h-[500px] overflow-y-auto">
                    <div className="grid grid-cols-12 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">
                        <span className="col-span-5">Exam</span>
                        <span className="col-span-2 text-center">Agency</span>
                        <span className="col-span-2 text-right">Count</span>
                        <span className="col-span-3 text-right">Avg Score</span>
                    </div>
                    {(data.perExam || []).slice(0, 100).map((e: any, i: number) => (
                        <div key={i} className="grid grid-cols-12 text-xs py-1.5 px-1 hover:bg-gray-50 rounded-lg">
                            <span className="col-span-5 font-bold text-gray-700 truncate flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                {e.examName}
                            </span>
                            <span className="col-span-2 text-center text-gray-500 font-medium">{e.agency}</span>
                            <span className="col-span-2 text-right font-bold text-gray-900">{e.count.toLocaleString()}</span>
                            <span className="col-span-3 text-right font-bold text-gray-600">{e.avgScore}</span>
                        </div>
                    ))}
                </div>
            </ChartCard>

            <ChartCard title="Agency Distribution" subtitle="Submissions by conducting body">
                <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                        <Pie data={data.agencyDist || []} cx="50%" cy="50%" innerRadius={55} outerRadius={90}
                            dataKey="count" nameKey="agency" paddingAngle={3}
                            label={({ agency, percent }: any) => `${agency} ${(percent * 100).toFixed(0)}%`}
                            labelLine={false} fontSize={11}>
                            {(data.agencyDist || []).map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Top Exams Over Time" subtitle="Daily trend for top 5 exams">
                {(data.popularityOverTime?.length || 0) > 0 ? (
                    <ResponsiveContainer width="100%" height={260}>
                        <LineChart data={transformPopularity(data.popularityOverTime)}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="date" fontSize={10} tick={{ fill: "#9CA3AF" }} tickFormatter={(v) => v.slice(5)} />
                            <YAxis fontSize={10} tick={{ fill: "#9CA3AF" }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend wrapperStyle={{ fontSize: 10 }} />
                            {getUniqueExams(data.popularityOverTime).map((name, i) => (
                                <Line key={name} type="monotone" dataKey={name} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                ) : <EmptyState message="Not enough data for timeline." />}
            </ChartCard>
        </div>
    );
}

// ─── Scores Tab ────────────────────────────────────────────────────
function ScoresTab({ data }: { data: any }) {
    const s = data.summary;
    return (
        <div className="space-y-4">
            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                <KpiCard label="Avg Score" value={s?.avgScore || 0} delta={s?.delta} icon="score" color="text-[#34D399]" bg="bg-[#34D399]/10" />
                <KpiCard label="Median" value={s?.median || 0} icon="linear_scale" color="text-[#A78BFA]" bg="bg-[#A78BFA]/10" />
                <KpiCard label="P90 Score" value={s?.p90 || 0} icon="keyboard_double_arrow_up" color="text-[#60A5FA]" bg="bg-[#60A5FA]/10" />
                <KpiCard label="P10 Score" value={s?.p10 || 0} icon="keyboard_double_arrow_down" color="text-[#F87171]" bg="bg-[#F87171]/10" />
                <KpiCard label="Max Score" value={s?.maxScore || 0} icon="emoji_events" color="text-[#FBBF24]" bg="bg-[#FBBF24]/10" />
                <KpiCard label="Accuracy" value={`${s?.avgAccuracy || 0}%`} icon="target" color="text-[#F472B6]" bg="bg-[#F472B6]/10" />
            </div>

            {(data.scoreDistribution?.length || 0) > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <ChartCard title="Score Distribution" subtitle="Histogram of raw scores (20-pt buckets)" className="lg:col-span-2">
                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={data.scoreDistribution}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="bucket" fontSize={10} tick={{ fill: "#9CA3AF" }} />
                                <YAxis fontSize={10} tick={{ fill: "#9CA3AF" }} width={40} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="count" name="Candidates" radius={[4, 4, 0, 0]}>
                                    {(data.scoreDistribution || []).map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>

                    {/* Accuracy Distribution */}
                    <ChartCard title="Accuracy Distribution" subtitle="How accurate are candidates?">
                        <ResponsiveContainer width="100%" height={240}>
                            <BarChart data={data.accuracyDistribution || []}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="bucket" fontSize={9} tick={{ fill: "#9CA3AF" }} />
                                <YAxis fontSize={10} tick={{ fill: "#9CA3AF" }} width={40} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="count" name="Candidates" radius={[4, 4, 0, 0]}>
                                    {(data.accuracyDistribution || []).map((_: any, i: number) => <Cell key={i} fill={COLORS[(i + 3) % COLORS.length]} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>

                    {/* Score + Accuracy Trend */}
                    <ChartCard title="Score & Accuracy Trend" subtitle="Daily averages over time">
                        <ResponsiveContainer width="100%" height={240}>
                            <ComposedChart data={data.avgScoreTrend || []}>
                                <defs>
                                    <linearGradient id="colorAvgS" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#34D399" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#34D399" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="date" fontSize={10} tick={{ fill: "#9CA3AF" }} tickFormatter={(v) => v.slice(5)} />
                                <YAxis yAxisId="left" fontSize={10} tick={{ fill: "#34D399" }} width={40} />
                                <YAxis yAxisId="right" orientation="right" fontSize={10} tick={{ fill: "#A78BFA" }} width={40} domain={[0, 100]} />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend wrapperStyle={{ fontSize: 10 }} />
                                <Area yAxisId="left" type="monotone" dataKey="avgScore" name="Avg Score" stroke="#34D399" strokeWidth={2} fill="url(#colorAvgS)" />
                                <Line yAxisId="right" type="monotone" dataKey="avgAccuracy" name="Accuracy %" stroke="#A78BFA" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </ChartCard>
                </div>
            ) : <EmptyState message="No score data in this period." />}
        </div>
    );
}

// ─── Users Tab ─────────────────────────────────────────────────────
function UsersTab({ data }: { data: any }) {
    const s = data.summary;
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                <KpiCard label="Total Users" value={s?.total || 0} delta={s?.delta} icon="group" color="text-[#A78BFA]" bg="bg-[#A78BFA]/10" />
                <KpiCard label="Previous Period" value={s?.prevTotal || 0} icon="history" color="text-gray-400" bg="bg-gray-100" />
                <KpiCard label="Unique States" value={s?.uniqueStates || 0} icon="location_on" color="text-[#F87171]" bg="bg-[#F87171]/10" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* State Distribution */}
                <ChartCard title="Geographic Distribution" subtitle="Top 50 states by submissions" className="lg:col-span-2">
                    {(data.stateDist?.length || 0) > 0 ? (
                        <ResponsiveContainer width="100%" height={Math.max(280, (data.stateDist?.length || 0) * 32)}>
                            <BarChart data={data.stateDist} layout="vertical" margin={{ left: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis type="number" fontSize={11} tick={{ fill: "#9CA3AF" }} />
                                <YAxis type="category" dataKey="state" fontSize={11} tick={{ fill: "#6B7280" }} width={150} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="count" name="Submissions" radius={[0, 4, 4, 0]}>
                                    {(data.stateDist || []).map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : <EmptyState message="No geographic data available." />}
                </ChartCard>

                {/* Category Distribution */}
                <ChartCard title="Category Distribution">
                    <ResponsiveContainer width="100%" height={260}>
                        <PieChart>
                            <Pie data={data.categoryDist || []} cx="50%" cy="50%" innerRadius={50} outerRadius={85}
                                dataKey="count" nameKey="category" paddingAngle={3}
                                label={({ category, percent }: any) => `${category} ${(percent * 100).toFixed(0)}%`}
                                labelLine={false} fontSize={11}>
                                {(data.categoryDist || []).map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                    </ResponsiveContainer>
                </ChartCard>

                {/* Gender + PWD */}
                <ChartCard title="Gender & PWD Distribution">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 text-center">Gender</p>
                            <ResponsiveContainer width="100%" height={180}>
                                <PieChart>
                                    <Pie data={data.genderDist || []} cx="50%" cy="50%" innerRadius={30} outerRadius={55}
                                        dataKey="count" nameKey="gender" paddingAngle={3}>
                                        {(data.genderDist || []).map((_: any, i: number) => <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="flex justify-center gap-3 mt-1">
                                {(data.genderDist || []).map((g: any, i: number) => (
                                    <span key={i} className="flex items-center gap-1 text-xs text-gray-600">
                                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[(i + 2) % COLORS.length] }} />
                                        {g.gender}
                                    </span>
                                ))}
                            </div>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 text-center">PWD Status</p>
                            <ResponsiveContainer width="100%" height={180}>
                                <PieChart>
                                    <Pie data={data.pwdDist || []} cx="50%" cy="50%" innerRadius={30} outerRadius={55}
                                        dataKey="count" nameKey="label" paddingAngle={3}>
                                        {(data.pwdDist || []).map((_: any, i: number) => <Cell key={i} fill={i === 0 ? "#A78BFA" : "#E5E7EB"} />)}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="flex justify-center gap-3 mt-1">
                                {(data.pwdDist || []).map((p: any, i: number) => (
                                    <span key={i} className="flex items-center gap-1 text-xs text-gray-600">
                                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: i === 0 ? "#A78BFA" : "#E5E7EB" }} />
                                        {p.label}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </ChartCard>

                {/* Category Performance */}
                <ChartCard title="Performance by Category" subtitle="Average score and accuracy per category" className="lg:col-span-2">
                    {(data.categoryAvgScores?.length || 0) > 0 ? (
                        <ResponsiveContainer width="100%" height={260}>
                            <ComposedChart data={data.categoryAvgScores}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="category" fontSize={11} tick={{ fill: "#6B7280" }} />
                                <YAxis yAxisId="left" fontSize={10} tick={{ fill: "#34D399" }} width={40} />
                                <YAxis yAxisId="right" orientation="right" fontSize={10} tick={{ fill: "#A78BFA" }} width={40} domain={[0, 100]} />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend wrapperStyle={{ fontSize: 10 }} />
                                <Bar yAxisId="left" dataKey="avgScore" name="Avg Score" radius={[4, 4, 0, 0]}>
                                    {(data.categoryAvgScores || []).map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                </Bar>
                                <Line yAxisId="right" type="monotone" dataKey="avgAccuracy" name="Accuracy %" stroke="#A78BFA" strokeWidth={2.5} dot={{ r: 4 }} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    ) : <EmptyState message="No category performance data." />}
                </ChartCard>
            </div>
        </div>
    );
}

// ─── Helpers ───────────────────────────────────────────────────────
function getUniqueExams(data: any[]): string[] {
    return [...new Set(data.map((d: any) => d.examName))];
}

function transformPopularity(raw: any[]): any[] {
    const byDate: Record<string, any> = {};
    raw.forEach((item: any) => {
        if (!byDate[item.date]) byDate[item.date] = { date: item.date };
        byDate[item.date][item.examName] = item.count;
    });
    return Object.values(byDate);
}
