"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { formatDistanceToNow, format } from "date-fns";
import {
    AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
    PieChart, Pie, Cell, BarChart, Bar,
} from "recharts";
import {
    LayoutDashboard, RefreshCw, Plus, Calculator, Download, Trash2, Database,
    Activity, Server, Cpu, HardDrive, AlertTriangle, FileText,
    Users, TrendingUp, TrendingDown, Clock, CheckCircle2, XCircle, Zap,
    MemoryStick, ArrowRight, Eye, Shield, ChevronDown, ChevronUp,
    Loader2, ExternalLink, Star, Bell, Calendar, FileCheck2, Timer,
    Globe, BarChart3, Target, Gauge, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import { useSuspenseDashboardStats, useTriggerDashboardJob } from "@/hooks/admin/use-dashboard";
import { useExamOptions } from "@/hooks/admin/use-submissions";

const COLORS = ["#6366f1", "#22c55e", "#f43f5e", "#3b82f6", "#eab308", "#8b5cf6"];
const GENDER_COLORS = ["#3b82f6", "#ec4899", "#8b5cf6"];

// ─── Primitives ─────────────────────────────────────────────────────────────

function Tip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white border border-gray-200 rounded-lg p-2.5 shadow-lg text-xs z-50">
            <p className="font-bold text-gray-800 mb-1">{label}</p>
            {payload.map((p: any, i: number) => (
                <p key={i} className="text-gray-600">
                    <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: p.color || p.payload?.fill }} />
                    {p.name}: <b className="text-gray-900">{typeof p.value === "number" ? p.value.toLocaleString() : p.value}</b>
                </p>
            ))}
        </div>
    );
}

function Kpi({ label, value, sub, icon: I, color, bg, badge, delta }: any) {
    return (
        <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-start gap-3 hover:shadow-sm transition-all">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", bg)}>
                <I className={cn("w-5 h-5", color)} />
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">{label}</p>
                <div className="flex items-baseline gap-2 flex-wrap">
                    <h3 className="text-2xl font-bold text-gray-900">{typeof value === "number" ? value.toLocaleString() : value}</h3>
                    {delta !== undefined && delta !== null && (
                        <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5",
                            delta > 0 ? "bg-emerald-100 text-emerald-700" : delta < 0 ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-500"
                        )}>
                            {delta > 0 ? <ArrowUpRight className="w-2.5 h-2.5" /> : delta < 0 ? <ArrowDownRight className="w-2.5 h-2.5" /> : null}
                            {delta > 0 ? "+" : ""}{delta}%
                        </span>
                    )}
                    {badge && <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full", badge.color)}>{badge.text}</span>}
                </div>
                {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
            </div>
        </div>
    );
}

function Card({ title, sub, children, className, action, noPad }: {
    title: string; sub?: string; children: React.ReactNode; className?: string;
    action?: React.ReactNode; noPad?: boolean;
}) {
    return (
        <div className={cn("bg-white rounded-xl border border-gray-100 flex flex-col", !noPad && "p-5", className)}>
            <div className={cn("flex justify-between items-start", noPad ? "px-5 pt-5 pb-3" : "mb-4")}>
                <div>
                    <h3 className="text-sm font-bold text-gray-900">{title}</h3>
                    {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
                </div>
                {action}
            </div>
            <div className="flex-1 w-full min-h-0">{children}</div>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const map: Record<string, { bg: string; text: string; label: string; dot: string }> = {
        healthy: { bg: "bg-emerald-50", text: "text-emerald-700", label: "Online", dot: "bg-emerald-500" },
        active: { bg: "bg-emerald-50", text: "text-emerald-700", label: "Active", dot: "bg-emerald-500" },
        idle: { bg: "bg-gray-100", text: "text-gray-600", label: "Idle", dot: "bg-gray-400" },
        degraded: { bg: "bg-amber-50", text: "text-amber-700", label: "Degraded", dot: "bg-amber-500" },
        warning: { bg: "bg-amber-50", text: "text-amber-700", label: "Warning", dot: "bg-amber-500" },
        down: { bg: "bg-red-50", text: "text-red-700", label: "Offline", dot: "bg-red-500" },
        completed: { bg: "bg-emerald-50", text: "text-emerald-700", label: "Done", dot: "bg-emerald-500" },
        error: { bg: "bg-red-50", text: "text-red-700", label: "Failed", dot: "bg-red-500" },
        running: { bg: "bg-blue-50", text: "text-blue-700", label: "Running", dot: "bg-blue-500" },
        info: { bg: "bg-indigo-50", text: "text-indigo-600", label: "Info", dot: "bg-indigo-400" },
        upcoming: { bg: "bg-blue-50", text: "text-blue-700", label: "Upcoming", dot: "bg-blue-400" },
    };
    const s = map[status] || map.idle;
    return (
        <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold", s.bg, s.text)}>
            <span className={cn("w-1.5 h-1.5 rounded-full", s.dot, status === "running" && "animate-pulse")} />
            {s.label}
        </span>
    );
}

function ProgressBar({ value, max, color = "bg-indigo-500" }: { value: number; max: number; color?: string }) {
    const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
    return (
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className={cn("h-full rounded-full transition-all duration-500", color)} style={{ width: `${pct}%` }} />
        </div>
    );
}

const ACTIVITY_FILTERS = [
    { key: "all", label: "All" },
    { key: "submission", label: "Submissions" },
    { key: "job", label: "Jobs" },
    { key: "alert", label: "Alerts" },
    { key: "audit", label: "Audit" },
] as const;
type ActivityFilter = typeof ACTIVITY_FILTERS[number]["key"];

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function DashboardPage() {
    const [scoreExamId, setScoreExamId] = useState<number | null>(null);
    const { data, dataUpdatedAt, refetch } = useSuspenseDashboardStats(scoreExamId);
    const triggerJobMutation = useTriggerDashboardJob();
    const [cooldown, setCooldown] = useState(0);
    const [refreshing, setRefreshing] = useState(false);
    const [healthExpanded, setHealthExpanded] = useState(false);
    const [activityFilter, setActivityFilter] = useState<ActivityFilter>("all");
    const [jobFeedback, setJobFeedback] = useState<Record<string, "success" | "error" | null>>({});
    const { data: examOptions } = useExamOptions();

    const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt) : new Date();
    const loadingAction = triggerJobMutation.isPending ? (triggerJobMutation.variables as string) : null;

    const handleRefresh = async () => {
        if (cooldown > 0 || refreshing) return;
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
        setCooldown(10);
        const timer = setInterval(() => {
            setCooldown(prev => { if (prev <= 1) { clearInterval(timer); return 0; } return prev - 1; });
        }, 1000);
    };

    const triggerJob = (type: string) => {
        if (triggerJobMutation.isPending) return;
        setJobFeedback(prev => ({ ...prev, [type]: null }));
        triggerJobMutation.mutate(type, {
            onSuccess: () => {
                setJobFeedback(prev => ({ ...prev, [type]: "success" }));
                setTimeout(() => setJobFeedback(prev => ({ ...prev, [type]: null })), 3000);
            },
            onError: () => {
                setJobFeedback(prev => ({ ...prev, [type]: "error" }));
                setTimeout(() => setJobFeedback(prev => ({ ...prev, [type]: null })), 4000);
            },
        });
    };

    // Derived
    const healthParams = [data.health.db, data.health.api, data.health.workers, data.health.cache];
    const healthyCount = healthParams.filter(s => s.status === 'healthy' || s.status === 'active' || s.status === 'idle').length;
    const overallStatus = healthyCount === 4 ? 'healthy' : healthyCount >= 2 ? 'degraded' : 'down';
    const filteredActivity = activityFilter === "all" ? data.activity : data.activity.filter(a => a.type === activityFilter);

    return (
        <div className="space-y-5 max-w-[1600px] mx-auto pb-20">
            {/* ── Status Banner ── */}
            <div className={cn(
                "rounded-xl p-3 flex items-center justify-between border",
                overallStatus === 'healthy' ? "bg-emerald-50/70 border-emerald-200/50" :
                    overallStatus === 'degraded' ? "bg-amber-50/70 border-amber-200/50" : "bg-red-50/70 border-red-200/50"
            )}>
                <div className="flex items-center gap-3">
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center",
                        overallStatus === 'healthy' ? "bg-emerald-100" : overallStatus === 'degraded' ? "bg-amber-100" : "bg-red-100"
                    )}>
                        <Shield className={cn("w-4 h-4",
                            overallStatus === 'healthy' ? "text-emerald-600" : overallStatus === 'degraded' ? "text-amber-600" : "text-red-600"
                        )} />
                    </div>
                    <div>
                        <p className={cn("text-xs font-bold",
                            overallStatus === 'healthy' ? "text-emerald-800" : overallStatus === 'degraded' ? "text-amber-800" : "text-red-800"
                        )}>
                            {overallStatus === 'healthy' ? "All Systems Operational" : overallStatus === 'degraded' ? "Partial Degradation" : "Critical Issues"}
                        </p>
                        <p className="text-[10px] text-gray-500">
                            {healthyCount}/4 services healthy · Uptime: {data.health.api.uptimeFormatted} · Memory: {data.health.memory?.percentUsed || 0}%
                            {data.pipeline?.parser?.totalParses > 0 && ` · Parser: ${data.pipeline.parser.successRate}%`}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {data.engagement?.unreadNotifications > 0 && (
                        <span className="flex items-center gap-1 px-2 py-1 bg-indigo-100 rounded-lg text-[10px] font-bold text-indigo-700">
                            <Bell className="w-3 h-3" /> {data.engagement.unreadNotifications} unread
                        </span>
                    )}
                    {data.errorCount24h > 0 && (
                        <Link href="/admin/logs" className="flex items-center gap-1 px-2 py-1 bg-red-100 rounded-lg text-[10px] font-bold text-red-700 hover:bg-red-200 transition-colors">
                            <AlertTriangle className="w-3 h-3" /> {data.errorCount24h} errors
                        </Link>
                    )}
                    <span className="text-[10px] text-gray-400 font-mono">{lastUpdated.toLocaleTimeString()}</span>
                </div>
            </div>

            {/* ── Header ── */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                        <LayoutDashboard className="w-6 h-6 text-indigo-600" /> Dashboard
                    </h1>
                    <p className="text-gray-500 text-xs mt-1">System performance, data insights, and key metrics</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={handleRefresh} disabled={cooldown > 0 || refreshing}
                        className={cn("flex items-center gap-1.5 h-9 px-3.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed", refreshing && "text-indigo-600 border-indigo-200")}>
                        <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin")} />
                        {refreshing ? "Refreshing..." : cooldown > 0 ? `Wait ${cooldown}s` : "Refresh"}
                    </button>
                    <Link href="/admin/exams/create" className="flex items-center gap-1.5 h-9 px-3.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-all shadow-sm">
                        <Plus className="w-3.5 h-3.5" /> New Exam
                    </Link>
                </div>
            </div>

            {/* ── KPI Grid (6 items) ── */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <Kpi label="Total Exams" value={data.counts.exams.total}
                    sub={`${data.counts.exams.active} active · ${data.counts.exams.upcoming} upcoming`}
                    icon={FileText} color="text-blue-600" bg="bg-blue-50" />
                <Kpi label="Today's Submissions" value={data.counts.submissions.today}
                    delta={data.counts.submissions.deltaPercent}
                    sub={`vs ${data.counts.submissions.yesterday} yesterday`}
                    icon={TrendingUp} color="text-emerald-600" bg="bg-emerald-50" />
                <Kpi label="Total Submissions" value={data.counts.submissions.total}
                    sub={`${data.counts.submissions.thisWeek} this week`}
                    icon={Users} color="text-violet-600" bg="bg-violet-50" />
                <Kpi label="Avg Score" value={data.scoreSnapshot?.avgScore || 0}
                    sub={`${data.scoreSnapshot?.avgAccuracy || 0}% accuracy`}
                    icon={Target} color="text-orange-600" bg="bg-orange-50" />
                <Kpi label="Result Views" value={data.engagement?.resultViews || 0}
                    sub={data.engagement?.feedback?.avgRating ? `★ ${data.engagement.feedback.avgRating} rating` : "No ratings yet"}
                    icon={Eye} color="text-pink-600" bg="bg-pink-50"
                    badge={data.engagement?.feedback?.unresolved > 0 ? { text: `${data.engagement.feedback.unresolved} open`, color: "bg-amber-100 text-amber-700" } : undefined} />
                <Kpi label="Cutoffs" value={data.cutoffStatus?.published || 0}
                    sub={data.cutoffStatus?.draft > 0 ? `${data.cutoffStatus.draft} drafts pending` : `of ${data.cutoffStatus?.total || 0} total`}
                    icon={FileCheck2} color="text-teal-600" bg="bg-teal-50" />
            </div>

            {/* ── Main Grid (3 cols) ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* ─── Left Column (2/3) ─── */}
                <div className="lg:col-span-2 space-y-5">
                    {/* Submission Trends */}
                    <Card title="Submission Trends" sub="Daily volume · Last 30 days" className="h-[340px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data.trends.daily}>
                                <defs>
                                    <linearGradient id="colorSub" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} dy={10} minTickGap={30} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} width={30} />
                                <Tooltip content={<Tip />} />
                                <Area type="monotone" dataKey="submissions" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorSub)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </Card>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <Card title="Top 5 Exams" sub="By submission volume">
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart layout="vertical" data={data.trends.topExams} margin={{ left: 0, right: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" width={100} axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 11, fontWeight: 500 }} />
                                    <Tooltip content={<Tip />} cursor={{ fill: '#f8fafc' }} />
                                    <Bar dataKey="value" name="Submissions" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={18} />
                                </BarChart>
                            </ResponsiveContainer>
                        </Card>

                        <Card title="Category Distribution" sub="Submission demographics">
                            <div className="flex items-center gap-4">
                                <ResponsiveContainer width="50%" height={200}>
                                    <PieChart>
                                        <Pie data={data.trends.categories} cx="50%" cy="50%" innerRadius={45} outerRadius={68} paddingAngle={4} dataKey="value">
                                            {data.trends.categories.map((_: any, index: number) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<Tip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="space-y-2 flex-1">
                                    {data.trends.categories.map((cat: any, i: number) => {
                                        const total = data.trends.categories.reduce((a: number, b: any) => a + b.value, 0);
                                        return (
                                            <div key={i} className="flex items-center gap-2 text-xs">
                                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                                <span className="font-medium text-gray-700 truncate flex-1">{cat.name}</span>
                                                <span className="font-bold text-gray-900">{cat.value}</span>
                                                <span className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded-md font-mono">{total > 0 ? ((cat.value / total) * 100).toFixed(0) : 0}%</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* ── NEW: Score + Demographics Row ── */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Score Snapshot */}
                        <Card title="Score Snapshot" sub={scoreExamId ? "Exam-scoped metrics" : "Global submission metrics"} action={
                            <div className="flex items-center gap-1.5">
                                <div className="relative">
                                    <select
                                        value={scoreExamId || ""}
                                        onChange={(e) => setScoreExamId(e.target.value ? parseInt(e.target.value) : null)}
                                        className="text-[10px] appearance-none bg-white border border-gray-200 rounded-md pl-2 pr-5 py-0.5 font-medium text-gray-600 hover:border-indigo-300 focus:outline-none focus:border-indigo-400 cursor-pointer max-w-[120px] truncate"
                                    >
                                        <option value="">All Exams</option>
                                        {examOptions?.map((ex: any) => (
                                            <option key={ex.id} value={ex.id}>{ex.name?.slice(0, 25)}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="w-3 h-3 text-gray-400 absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none" />
                                </div>
                                {data.scoreSnapshot?.topScorer && (
                                    <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                                        <Star className="w-3 h-3" /> Top: {data.scoreSnapshot.topScorer.score}
                                    </span>
                                )}
                            </div>
                        }>
                            <div className="space-y-3">
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="bg-gray-50 rounded-lg p-2.5 text-center">
                                        <p className="text-[10px] text-gray-400 font-medium">Avg Score</p>
                                        <p className="text-lg font-bold text-gray-900">{data.scoreSnapshot?.avgScore || 0}</p>
                                    </div>
                                    <div className="bg-gray-50 rounded-lg p-2.5 text-center">
                                        <p className="text-[10px] text-gray-400 font-medium">Max Score</p>
                                        <p className="text-lg font-bold text-gray-900">{data.scoreSnapshot?.maxScore || 0}</p>
                                    </div>
                                    <div className="bg-gray-50 rounded-lg p-2.5 text-center">
                                        <p className="text-[10px] text-gray-400 font-medium">Accuracy</p>
                                        <p className="text-lg font-bold text-gray-900">{data.scoreSnapshot?.avgAccuracy || 0}%</p>
                                    </div>
                                </div>
                                {data.scoreSnapshot?.topScorer && (
                                    <div className="bg-amber-50/50 border border-amber-100 rounded-lg p-3 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                                            <Star className="w-4 h-4 text-amber-600" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-bold text-amber-900 truncate">{data.scoreSnapshot.topScorer.name}</p>
                                            <p className="text-[10px] text-amber-600">{data.scoreSnapshot.topScorer.exam} · Score: {data.scoreSnapshot.topScorer.score}</p>
                                        </div>
                                    </div>
                                )}
                                <p className="text-[10px] text-gray-400 text-center">{data.scoreSnapshot?.totalRanked || 0} candidates ranked</p>
                            </div>
                        </Card>

                        {/* Demographics */}
                        <Card title="Demographics" sub="Gender & regional distribution">
                            <div className="space-y-4">
                                {/* Gender Pie */}
                                <div className="flex items-center gap-3">
                                    <ResponsiveContainer width="40%" height={110}>
                                        <PieChart>
                                            <Pie data={data.demographics?.gender || []} cx="50%" cy="50%" innerRadius={28} outerRadius={48} paddingAngle={3} dataKey="value">
                                                {(data.demographics?.gender || []).map((_: any, i: number) => (
                                                    <Cell key={i} fill={GENDER_COLORS[i % GENDER_COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip content={<Tip />} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="flex-1 space-y-1.5">
                                        {(data.demographics?.gender || []).map((g: any, i: number) => (
                                            <div key={i} className="flex items-center gap-2 text-xs">
                                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: GENDER_COLORS[i % GENDER_COLORS.length] }} />
                                                <span className="text-gray-600 capitalize flex-1">{g.name}</span>
                                                <span className="font-bold text-gray-900">{g.value.toLocaleString()}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                {/* Top States */}
                                {(data.demographics?.topStates || []).length > 0 && (
                                    <div className="space-y-1.5">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1"><Globe className="w-3 h-3" /> Top States</p>
                                        {(data.demographics?.topStates || []).map((s: any, i: number) => {
                                            const maxVal = data.demographics.topStates[0]?.value || 1;
                                            return (
                                                <div key={i} className="flex items-center gap-2 text-xs">
                                                    <span className="text-gray-600 w-20 truncate">{s.name}</span>
                                                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                        <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${(s.value / maxVal) * 100}%` }} />
                                                    </div>
                                                    <span className="font-bold text-gray-700 w-8 text-right">{s.value}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </Card>
                    </div>
                </div>

                {/* ─── Right Column (1/3) ─── */}
                <div className="space-y-5">
                    {/* Quick Actions */}
                    <Card title="Quick Actions" sub="Common operations">
                        <div className="grid grid-cols-2 gap-2.5">
                            <ActionBtn icon={Calculator} label="Rank Calc" desc="Recompute rankings" color="violet"
                                loading={loadingAction === 'rank_calculation'} feedback={jobFeedback['rank_calculation']}
                                onClick={() => triggerJob('rank_calculation')} />
                            <ActionLink icon={Download} label="Export Data" desc="Download submissions" color="emerald" href="/admin/reports" />
                            <ActionBtn icon={Trash2} label="Clear Cache" desc="Purge cached data" color="amber"
                                loading={loadingAction === 'cleanup'} feedback={jobFeedback['cleanup']}
                                onClick={() => triggerJob('cleanup')} />
                            <ActionBtn icon={Database} label="Backup DB" desc="Create snapshot" color="blue"
                                loading={loadingAction === 'backup'} feedback={jobFeedback['backup']}
                                onClick={() => triggerJob('backup')} />
                            <ActionLink icon={Eye} label="View Logs" desc="System & error logs" color="gray" href="/admin/logs" />
                            <ActionLink icon={Plus} label="New Exam" desc="Create examination" color="indigo" href="/admin/exams/create" />
                        </div>
                    </Card>

                    {/* Upcoming Exams */}
                    {data.upcomingExams?.length > 0 && (
                        <Card title="Upcoming Exams" sub={`${data.upcomingExams.length} exams`} noPad action={
                            <Link href="/admin/exams" className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5">
                                View All <ExternalLink className="w-3 h-3" />
                            </Link>
                        }>
                            <div className="divide-y divide-gray-50">
                                {data.upcomingExams.map((exam: any) => (
                                    <div key={exam.id} className="px-5 py-3 hover:bg-gray-50/60 transition-colors flex items-center gap-3">
                                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                                            exam.status === 'active' ? "bg-emerald-50" : "bg-blue-50"
                                        )}>
                                            <Calendar className={cn("w-4 h-4",
                                                exam.status === 'active' ? "text-emerald-600" : "text-blue-600"
                                            )} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-bold text-gray-900 truncate">{exam.name}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[10px] text-gray-400">{exam.agency}</span>
                                                {exam.startDate && (
                                                    <>
                                                        <span className="text-[10px] text-gray-300">·</span>
                                                        <span className="text-[10px] text-gray-500">{format(new Date(exam.startDate), 'MMM dd, yyyy')}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <div className="shrink-0 text-right">
                                            <StatusBadge status={exam.status} />
                                            <p className="text-[10px] text-gray-400 mt-1">{exam.submissions} subs · {exam.shifts} shifts</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}

                    {/* System Health + Pipeline */}
                    <Card title="System Health" sub="Infrastructure & pipeline" noPad action={<StatusBadge status={overallStatus} />}>
                        <div className="px-5 pb-2 space-y-3">
                            <HealthRow icon={Database} name="Database" status={data.health.db.status}
                                metric={`${data.health.db.latency}ms`} metricLabel="latency"
                                progress={{ value: data.health.db.latency, max: 300, color: data.health.db.latency < 100 ? "bg-emerald-500" : data.health.db.latency < 200 ? "bg-amber-500" : "bg-red-500" }} />
                            <HealthRow icon={Server} name="API Server" status={data.health.api.status}
                                metric={data.health.api.uptimeFormatted} metricLabel="uptime" />
                            <HealthRow icon={Cpu} name="Workers" status={data.health.workers.status}
                                metric={`${data.health.workers.activeJobs} active`} metricLabel={`${data.health.workers.failedJobs} failed`}
                                progress={data.health.workers.totalProcessed > 0 ? { value: data.health.workers.activeJobs, max: Math.max(data.health.workers.totalProcessed, 1), color: "bg-blue-500" } : undefined} />
                            <HealthRow icon={HardDrive} name="Redis Cache" status={data.health.cache.status}
                                metric={data.health.cache.message} metricLabel="" />
                            {data.health.memory && (
                                <HealthRow icon={MemoryStick} name="Memory" status={data.health.memory.percentUsed > 90 ? "degraded" : "healthy"}
                                    metric={`${data.health.memory.heapUsed}MB / ${data.health.memory.heapTotal}MB`} metricLabel={`${data.health.memory.percentUsed}%`}
                                    progress={{ value: data.health.memory.percentUsed, max: 100, color: data.health.memory.percentUsed > 90 ? "bg-red-500" : data.health.memory.percentUsed > 70 ? "bg-amber-500" : "bg-emerald-500" }} />
                            )}

                            {/* Pipeline Health */}
                            {data.pipeline && (
                                <>
                                    <div className="border-t border-gray-50 pt-3 mt-1">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Data Pipeline (24h)</p>
                                    </div>
                                    <HealthRow icon={Gauge} name="URL Parser" status={data.pipeline.parser.status}
                                        metric={`${data.pipeline.parser.successRate}%`} metricLabel={`${data.pipeline.parser.avgParseTime}ms avg`}
                                        progress={{ value: data.pipeline.parser.successRate, max: 100, color: data.pipeline.parser.successRate >= 95 ? "bg-emerald-500" : "bg-amber-500" }} />
                                    <HealthRow icon={Zap} name="API Endpoints" status={data.pipeline.api.status}
                                        metric={`p95: ${data.pipeline.api.p95ResponseTime}ms`} metricLabel={`${data.pipeline.api.errorRate}% errors`}
                                        progress={{ value: 100 - data.pipeline.api.errorRate, max: 100, color: data.pipeline.api.errorRate <= 1 ? "bg-emerald-500" : "bg-red-500" }} />
                                </>
                            )}
                        </div>

                        {/* Expandable details */}
                        <button onClick={() => setHealthExpanded(!healthExpanded)}
                            className="w-full px-5 py-2 border-t border-gray-50 flex items-center justify-center gap-1 text-[10px] font-bold text-gray-400 hover:text-gray-600 hover:bg-gray-50/50 transition-colors">
                            {healthExpanded ? "Hide Details" : "Show Details"}
                            {healthExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>

                        {healthExpanded && (
                            <div className="px-5 pb-4 space-y-4 border-t border-gray-50 pt-3">
                                {/* Memory Breakdown */}
                                {data.health.memory && (
                                    <div className="space-y-2">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Memory</p>
                                        <div className="grid grid-cols-2 gap-2">
                                            {[
                                                { label: "Heap Used", value: `${data.health.memory.heapUsed} MB` },
                                                { label: "Heap Total", value: `${data.health.memory.heapTotal} MB` },
                                                { label: "RSS", value: `${data.health.memory.rss} MB` },
                                                { label: "External", value: `${data.health.memory.external} MB` },
                                            ].map((m, i) => (
                                                <div key={i} className="bg-gray-50 rounded-lg p-2.5">
                                                    <p className="text-[10px] text-gray-400 font-medium">{m.label}</p>
                                                    <p className="text-sm font-bold text-gray-900">{m.value}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Cutoff Status */}
                                {data.cutoffStatus && data.cutoffStatus.total > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Cutoff Predictions</p>
                                        <div className="flex items-center gap-3">
                                            <div className="flex-1 space-y-1">
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-gray-500">Published</span>
                                                    <span className="font-bold text-emerald-700">{data.cutoffStatus.published}</span>
                                                </div>
                                                <ProgressBar value={data.cutoffStatus.published} max={data.cutoffStatus.total} color="bg-emerald-500" />
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-gray-500">Draft</span>
                                                    <span className="font-bold text-amber-700">{data.cutoffStatus.draft}</span>
                                                </div>
                                                <ProgressBar value={data.cutoffStatus.draft} max={data.cutoffStatus.total} color="bg-amber-500" />
                                            </div>
                                        </div>
                                        {data.cutoffStatus.confidence.length > 0 && (
                                            <div className="flex items-center gap-2 mt-1">
                                                {data.cutoffStatus.confidence.map((c: any, i: number) => (
                                                    <span key={i} className="text-[10px] bg-gray-50 px-2 py-0.5 rounded-md text-gray-600">
                                                        {c.level}: <b>{c.count}</b>
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Scheduled Jobs */}
                                {data.scheduledJobs?.length > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Scheduled Jobs</p>
                                        <div className="space-y-1.5">
                                            {data.scheduledJobs.map((job: any) => (
                                                <div key={job.id} className="flex items-center justify-between text-xs bg-gray-50 rounded-lg p-2">
                                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                                        <Timer className={cn("w-3.5 h-3.5 shrink-0", job.isEnabled ? "text-emerald-500" : "text-gray-400")} />
                                                        <span className="font-medium text-gray-700 truncate">{job.name}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 shrink-0 ml-2">
                                                        <span className="text-[10px] font-mono text-gray-400">{job.cron}</span>
                                                        <StatusBadge status={job.isEnabled ? "healthy" : "down"} />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Recent Jobs */}
                                {data.recentJobs?.length > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Recent Jobs</p>
                                        <div className="space-y-1.5">
                                            {data.recentJobs.map((job: any, i: number) => (
                                                <div key={i} className="flex items-center justify-between text-xs bg-gray-50 rounded-lg p-2">
                                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                                        {job.status === 'success' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                                                        <span className="font-medium text-gray-700 truncate">{job.name}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 shrink-0 ml-2">
                                                        {job.duration != null && <span className="text-[10px] text-gray-400 font-mono">{job.duration}s</span>}
                                                        <span className="text-[10px] text-gray-400">{formatDistanceToNow(new Date(job.startedAt), { addSuffix: true })}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <p className="text-[10px] text-gray-400 text-center mt-2">
                                    Last checked: {formatDistanceToNow(new Date(data.health.lastCheck), { addSuffix: true })}
                                </p>
                            </div>
                        )}
                    </Card>

                    {/* Live Activity */}
                    <Card title="Live Activity" sub={`${data.activity.length} recent events`} noPad action={
                        <Link href="/admin/logs" className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5">
                            View All <ExternalLink className="w-3 h-3" />
                        </Link>
                    }>
                        <div className="px-5 pb-2 flex items-center gap-1 overflow-x-auto">
                            {ACTIVITY_FILTERS.map(f => (
                                <button key={f.key} onClick={() => setActivityFilter(f.key)}
                                    className={cn("px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all whitespace-nowrap",
                                        activityFilter === f.key ? "bg-gray-900 text-white" : "text-gray-400 hover:bg-gray-50"
                                    )}>
                                    {f.label}
                                </button>
                            ))}
                        </div>
                        <div className="divide-y divide-gray-50 max-h-[320px] overflow-y-auto">
                            {filteredActivity.length === 0 ? (
                                <div className="p-8 text-center text-gray-400 text-xs italic">No activity found</div>
                            ) : (
                                filteredActivity.map((item: any) => (
                                    <div key={item.id} className="px-5 py-3 hover:bg-gray-50/60 transition-colors flex gap-3 items-start">
                                        <div className={cn("w-8 h-8 rounded-lg shrink-0 flex items-center justify-center",
                                            item.type === 'submission' ? "bg-blue-50 text-blue-600" :
                                                item.type === 'alert' ? "bg-red-50 text-red-600" :
                                                    item.type === 'job' ? "bg-violet-50 text-violet-600" :
                                                        item.type === 'audit' ? "bg-indigo-50 text-indigo-600" : "bg-gray-100 text-gray-500"
                                        )}>
                                            {item.type === 'submission' && <Users className="w-4 h-4" />}
                                            {item.type === 'alert' && <AlertTriangle className="w-4 h-4" />}
                                            {item.type === 'job' && <Activity className="w-4 h-4" />}
                                            {item.type === 'audit' && <Shield className="w-4 h-4" />}
                                            {item.type === 'system' && <Server className="w-4 h-4" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="font-medium text-xs text-gray-900 truncate">{item.exam || "System Event"}</p>
                                                <StatusBadge status={item.status} />
                                            </div>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <span className="text-[10px] text-gray-500 font-medium truncate max-w-[120px]">{item.user}</span>
                                                <span className="text-[10px] text-gray-300">·</span>
                                                <span className="text-[10px] text-gray-400">{formatDistanceToNow(new Date(item.time), { addSuffix: true })}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}

// ─── Sub-Components ─────────────────────────────────────────────────────────

function ActionBtn({ icon: I, label, desc, color, loading, feedback, onClick }: {
    icon: any; label: string; desc: string; color: string;
    loading: boolean; feedback: "success" | "error" | null; onClick: () => void;
}) {
    const cm: Record<string, string> = {
        violet: "bg-violet-50 text-violet-700 hover:bg-violet-100 border-violet-100",
        emerald: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-100",
        amber: "bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-100",
        blue: "bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-100",
        gray: "bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-100",
        indigo: "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-100",
    };
    return (
        <button onClick={onClick} disabled={loading}
            className={cn("flex flex-col items-start gap-1.5 p-3 rounded-xl border transition-all text-left disabled:opacity-60",
                feedback === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-700" :
                    feedback === "error" ? "bg-red-50 border-red-200 text-red-700" : cm[color]
            )}>
            <div className="flex items-center gap-2 w-full">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> :
                    feedback === "success" ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> :
                        feedback === "error" ? <XCircle className="w-4 h-4 text-red-600" /> : <I className="w-4 h-4" />}
                <span className="text-[11px] font-bold">{feedback === "success" ? "Done!" : feedback === "error" ? "Failed" : label}</span>
            </div>
            <span className="text-[10px] opacity-60 leading-tight">{desc}</span>
        </button>
    );
}

function ActionLink({ icon: I, label, desc, color, href }: {
    icon: any; label: string; desc: string; color: string; href: string;
}) {
    const cm: Record<string, string> = {
        violet: "bg-violet-50 text-violet-700 hover:bg-violet-100 border-violet-100",
        emerald: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-100",
        amber: "bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-100",
        blue: "bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-100",
        gray: "bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-100",
        indigo: "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-100",
    };
    return (
        <Link href={href} className={cn("flex flex-col items-start gap-1.5 p-3 rounded-xl border transition-all", cm[color])}>
            <div className="flex items-center gap-2 w-full">
                <I className="w-4 h-4" />
                <span className="text-[11px] font-bold">{label}</span>
                <ArrowRight className="w-3 h-3 ml-auto opacity-40" />
            </div>
            <span className="text-[10px] opacity-60 leading-tight">{desc}</span>
        </Link>
    );
}

function HealthRow({ icon: I, name, status, metric, metricLabel, progress }: {
    icon: any; name: string; status: string; metric: string;
    metricLabel?: string; progress?: { value: number; max: number; color: string };
}) {
    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-gray-50 rounded-md"><I className="w-3.5 h-3.5 text-gray-500" /></div>
                    <span className="font-medium text-gray-700">{name}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-gray-500 font-mono text-[11px]">{metric}</span>
                    {metricLabel && <span className="text-[10px] text-gray-400">{metricLabel}</span>}
                    <StatusBadge status={status} />
                </div>
            </div>
            {progress && (
                <div className="ml-9">
                    <ProgressBar value={progress.value} max={progress.max} color={progress.color} />
                </div>
            )}
        </div>
    );
}
