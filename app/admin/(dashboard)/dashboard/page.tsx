"use client";

import { useEffect, useState, useCallback } from "react";
import {
    AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
    PieChart, Pie, Cell, BarChart, Bar, Legend
} from "recharts";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

// Types matching API response
interface DashboardStats {
    counts: {
        exams: { total: number; active: number; upcoming: number; closed: number };
        submissions: { total: number; today: number; thisWeek: number };
        shifts: number;
    };
    trends: {
        daily: { name: string; submissions: number }[];
        topExams: { name: string; value: number }[];
        categories: { name: string; value: number }[];
    };
    activity: {
        id: string;
        type: 'submission' | 'alert' | 'job' | 'system';
        user: string;
        exam: string;
        time: string;
        status: string;
    }[];
    health: {
        db: { status: string; latency: number; message: string };
        api: { status: string; uptime: number; message: string };
        cache: { status: string; message: string };
        workers: { status: string; activeJobs: number; failedJobs: number; message: string };
        lastCheck: string;
    };
}

const COLORS = ["#A78BFA", "#F472B6", "#34D399", "#FBBF24", "#60A5FA"];

export default function DashboardPage() {
    const [data, setData] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
    const [refreshing, setRefreshing] = useState(false);

    const [loadingAction, setLoadingAction] = useState<string | null>(null);
    const [cooldown, setCooldown] = useState(0);

    const fetchData = useCallback(async () => {
        try {
            setRefreshing(true);
            const res = await fetch("/api/admin/stats");
            if (!res.ok) throw new Error("Failed to fetch stats");
            const jsonData = await res.json();
            setData(jsonData);
            setLastUpdated(new Date());
        } catch (error) {
            console.error("Error fetching dashboard data:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    const handleRefresh = async () => {
        if (cooldown > 0 || refreshing) return;

        await fetchData();

        // Start cooldown
        setCooldown(10);
        const timer = setInterval(() => {
            setCooldown((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const triggerJob = async (type: string) => {
        if (loadingAction) return;
        setLoadingAction(type);
        try {
            await fetch("/api/admin/jobs", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type }),
            });
            alert(`Job '${type}' started successfully.`);
            fetchData(); // Refresh data to show new job status
        } catch (e) {
            alert("Failed to trigger job");
        } finally {
            setLoadingAction(null);
        }
    };

    // Initial fetch and polling
    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000); // 30s auto-refresh
        return () => clearInterval(interval);
    }, [fetchData]);

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white text-gray-900 border-2 border-gray-900 p-3 rounded-lg shadow-neo-sm">
                    <p className="font-bold text-xs uppercase mb-1 text-gray-500">{label}</p>
                    <p className="text-[#A78BFA] font-bold text-sm">
                        {payload[0].value.toLocaleString()}
                    </p>
                </div>
            );
        }
        return null;
    };

    if (loading && !data) {
        return (
            <div className="space-y-8 max-w-[1600px] mx-auto pb-10 animate-pulse">
                {/* Header Skeleton */}
                <div className="flex justify-between items-end h-20">
                    <div className="space-y-3">
                        <div className="h-10 w-48 bg-gray-200 rounded-xl"></div>
                        <div className="h-6 w-32 bg-gray-100 rounded-full"></div>
                    </div>
                    <div className="flex gap-4">
                        <div className="h-10 w-24 bg-gray-200 rounded-xl"></div>
                        <div className="h-10 w-32 bg-[#A78BFA]/30 rounded-xl"></div>
                    </div>
                </div>

                {/* Stats Grid Skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-40 bg-gray-100 rounded-xl border-2 border-gray-200"></div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                        <div className="h-[400px] bg-gray-100 rounded-xl border-2 border-gray-200"></div>
                        <div className="h-[350px] bg-gray-100 rounded-xl border-2 border-gray-200"></div>
                    </div>
                    <div className="space-y-8">
                        <div className="h-[300px] bg-gray-100 rounded-xl border-2 border-gray-200"></div>
                        <div className="h-[250px] bg-gray-100 rounded-xl border-2 border-gray-200"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-[1600px] mx-auto pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
                    <div className="flex items-center gap-3 mt-2">
                        <span className="text-sm font-medium text-gray-500 bg-white px-3 py-1 rounded-full border border-gray-200 shadow-sm">
                            Last Updated: {lastUpdated.toLocaleTimeString()}
                        </span>
                        {refreshing && <span className="text-xs font-bold text-[#A78BFA] animate-pulse">Refreshing...</span>}
                    </div>
                </div>
                <div className="flex flex-wrap gap-4">
                    <button
                        onClick={handleRefresh}
                        disabled={cooldown > 0 || refreshing}
                        className="flex items-center gap-2 px-5 py-2.5 bg-white text-gray-700 font-bold border-2 border-gray-200 rounded-xl shadow-sm hover:border-gray-900 hover:text-gray-900 hover:shadow-neo-sm transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <span className={cn("material-symbols-outlined text-xl", refreshing && "animate-spin")}>refresh</span>
                        {refreshing ? "Refreshing..." : cooldown > 0 ? `Wait ${cooldown}s` : "Refresh"}
                    </button>
                    <Link href="/admin/exams/create" className="btn-primary flex items-center gap-2 text-sm">
                        <span className="material-symbols-outlined text-xl">add</span>
                        New Exam
                    </Link>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Total Exams */}
                <div className="card-base p-6 hover:shadow-neo-hover hover:-translate-y-1 group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-12 h-12 bg-[#F3E8FF] rounded-xl flex items-center justify-center border-2 border-gray-900 shadow-[2px_2px_0px_0px_#1F2937] group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined text-[#8B5CF6] text-2xl">quiz</span>
                        </div>
                        <span className="text-xs font-bold bg-[#A78BFA] text-white px-2 py-1 rounded-lg border-2 border-gray-900 shadow-sm">
                            {data?.counts.exams.active} Active
                        </span>
                    </div>
                    <p className="text-gray-500 font-bold text-sm">Total Exams</p>
                    <h3 className="text-4xl font-bold text-gray-900 mt-1">{data?.counts.exams.total}</h3>
                </div>

                {/* Total Submissions */}
                <div className="card-base p-6 hover:shadow-neo-hover hover:-translate-y-1 group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-12 h-12 bg-[#FEF3C7] rounded-xl flex items-center justify-center border-2 border-gray-900 shadow-[2px_2px_0px_0px_#1F2937] group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined text-[#D97706] text-2xl">description</span>
                        </div>
                        <span className="text-xs font-bold bg-[#FBBF24] text-gray-900 px-2 py-1 rounded-lg border-2 border-gray-900 shadow-sm">
                            +{data?.counts.submissions.today} Today
                        </span>
                    </div>
                    <p className="text-gray-500 font-bold text-sm">Total Submissions</p>
                    <h3 className="text-4xl font-bold text-gray-900 mt-1">{data?.counts.submissions.total.toLocaleString()}</h3>
                </div>

                {/* Weekly Volume */}
                <div className="card-base p-6 hover:shadow-neo-hover hover:-translate-y-1 group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-12 h-12 bg-[#DBEAFE] rounded-xl flex items-center justify-center border-2 border-gray-900 shadow-[2px_2px_0px_0px_#1F2937] group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined text-[#2563EB] text-2xl">date_range</span>
                        </div>
                        <span className="text-xs font-bold bg-[#60A5FA] text-white px-2 py-1 rounded-lg border-2 border-gray-900 shadow-sm">
                            7 Days
                        </span>
                    </div>
                    <p className="text-gray-500 font-bold text-sm">Weekly Volume</p>
                    <h3 className="text-4xl font-bold text-gray-900 mt-1">{data?.counts.submissions.thisWeek.toLocaleString()}</h3>
                </div>

                {/* System Health Widget (New) */}
                <div className="card-base p-4 hover:shadow-neo-hover hover:-translate-y-1 group flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
                        <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                            <span className="material-symbols-outlined text-lg text-gray-400">monitor_heart</span>
                            System Health
                        </h3>
                        <span className="text-[10px] font-mono text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200">
                            {formatDistanceToNow(new Date(data?.health.lastCheck || new Date()), { addSuffix: true })}
                        </span>
                    </div>

                    <div className="space-y-2">
                        {/* Database */}
                        <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                                <span className={cn("w-2 h-2 rounded-full", data?.health.db.status === 'healthy' ? "bg-green-500" : "bg-red-500")}></span>
                                <span className="text-gray-600 font-medium">Database</span>
                            </div>
                            <span className={cn("text-xs font-bold px-1.5 py-0.5 rounded border",
                                data?.health.db.status === 'healthy' ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"
                            )}>
                                {data?.health.db.latency}ms
                            </span>
                        </div>

                        {/* API Server */}
                        <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                <span className="text-gray-600 font-medium">API Server</span>
                            </div>
                            <span className="text-xs font-bold text-gray-500">
                                {Math.floor((data?.health.api.uptime || 0) / 60)}m Up
                            </span>
                        </div>

                        {/* Workers */}
                        <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                                <span className={cn("w-2 h-2 rounded-full", data?.health.workers.status === 'active' ? "bg-blue-500 animate-pulse" : "bg-gray-400")}></span>
                                <span className="text-gray-600 font-medium">Workers</span>
                            </div>
                            <span className="text-xs font-bold text-blue-600">
                                {data?.health.workers.activeJobs} Active
                            </span>
                        </div>

                        {/* Cache */}
                        <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-gray-300"></span>
                                <span className="text-gray-600 font-medium">Cache</span>
                            </div>
                            <span className="text-[10px] font-bold text-gray-400 uppercase">
                                {data?.health.cache.message}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Charts */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Submission Trends */}
                    <div className="card-base p-1 pb-6 overflow-hidden">
                        <div className="px-6 py-4 border-b-2 border-gray-100 flex justify-between items-center bg-gray-50 mb-4">
                            <h3 className="font-bold text-lg text-gray-900">Submission Trends</h3>
                            <span className="text-sm font-medium text-gray-500">Last 30 Days</span>
                        </div>
                        <div className="px-6 h-[350px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={data?.trends.daily}>
                                    <defs>
                                        <linearGradient id="colorSub" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#A78BFA" stopOpacity={0.5} />
                                            <stop offset="95%" stopColor="#A78BFA" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Area type="monotone" dataKey="submissions" stroke="#8B5CF6" strokeWidth={3} fillOpacity={1} fill="url(#colorSub)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Top Exams Bar Chart */}
                    <div className="card-base p-1 pb-6 overflow-hidden">
                        <div className="px-6 py-4 border-b-2 border-gray-100 flex justify-between items-center bg-gray-50 mb-4">
                            <h3 className="font-bold text-lg text-gray-900">Top 5 Exams</h3>
                            <Link href="/admin/exams" className="text-sm font-bold text-[#8B5CF6] hover:underline">View All</Link>
                        </div>
                        <div className="px-6 h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart layout="vertical" data={data?.trends.topExams} margin={{ left: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" width={120} axisLine={false} tickLine={false} tick={{ fill: '#374151', fontSize: 13, fontWeight: 500 }} />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F9FAFB' }} />
                                    <Bar dataKey="value" fill="#F472B6" radius={[0, 4, 4, 0]} barSize={24} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Right Column: Activity & Actions */}
                <div className="space-y-8">
                    {/* Quick Actions Panel */}
                    <div className="card-base p-6 bg-[#A78BFA] border-2 border-gray-900">
                        <div className="flex justify-between items-center mb-6 text-gray-900">
                            <h3 className="font-bold text-lg">Quick Actions</h3>
                            <span className="material-symbols-outlined bg-white/30 p-1 rounded-lg border border-gray-900/10">bolt</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <Link
                                href="/admin/exams/create"
                                className="bg-white text-gray-900 p-3 rounded-xl flex flex-col items-center justify-center gap-2 border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] hover:-translate-y-1 hover:shadow-neo transition-all text-center group"
                            >
                                <span className="material-symbols-outlined text-2xl group-hover:scale-110 transition-transform">add_circle</span>
                                <span className="font-bold text-xs">Create Exam</span>
                            </Link>

                            <button
                                onClick={() => triggerJob('rank_calculation')}
                                disabled={loadingAction === 'rank_calculation'}
                                className="bg-[#F3E8FF] text-[#7C3AED] p-3 rounded-xl flex flex-col items-center justify-center gap-2 border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] hover:-translate-y-1 hover:shadow-neo transition-all text-center group disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <span className={cn("material-symbols-outlined text-2xl group-hover:scale-110 transition-transform", loadingAction === 'rank_calculation' && "animate-spin")}>calculate</span>
                                <span className="font-bold text-xs">{loadingAction === 'rank_calculation' ? 'Running...' : 'Rank Calc'}</span>
                            </button>

                            <Link
                                href="/admin/reports"
                                className="bg-[#ECFDF5] text-[#059669] p-3 rounded-xl flex flex-col items-center justify-center gap-2 border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] hover:-translate-y-1 hover:shadow-neo transition-all text-center group"
                            >
                                <span className="material-symbols-outlined text-2xl group-hover:scale-110 transition-transform">download</span>
                                <span className="font-bold text-xs">Export Subs</span>
                            </Link>

                            <button
                                onClick={() => triggerJob('cleanup')}
                                disabled={loadingAction === 'cleanup'}
                                className="bg-[#FFFBEB] text-[#D97706] p-3 rounded-xl flex flex-col items-center justify-center gap-2 border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] hover:-translate-y-1 hover:shadow-neo transition-all text-center group disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <span className={cn("material-symbols-outlined text-2xl group-hover:scale-110 transition-transform", loadingAction === 'cleanup' && "animate-spin")}>cleaning_services</span>
                                <span className="font-bold text-xs">{loadingAction === 'cleanup' ? 'Cleaning...' : 'Clear Cache'}</span>
                            </button>

                            <Link
                                href="/admin/logs"
                                className="bg-white text-gray-900 p-3 rounded-xl flex flex-col items-center justify-center gap-2 border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] hover:-translate-y-1 hover:shadow-neo transition-all text-center group"
                            >
                                <span className="material-symbols-outlined text-2xl group-hover:scale-110 transition-transform">terminal</span>
                                <span className="font-bold text-xs">System Logs</span>
                            </Link>

                            <button
                                onClick={() => triggerJob('backup')}
                                disabled={loadingAction === 'backup'}
                                className="bg-[#FEF2F2] text-[#DC2626] p-3 rounded-xl flex flex-col items-center justify-center gap-2 border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] hover:-translate-y-1 hover:shadow-neo transition-all text-center group disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <span className={cn("material-symbols-outlined text-2xl group-hover:scale-110 transition-transform", loadingAction === 'backup' && "animate-spin")}>cloud_upload</span>
                                <span className="font-bold text-xs">{loadingAction === 'backup' ? 'Backing up...' : 'Backup DB'}</span>
                            </button>
                        </div>
                    </div>

                    {/* Category Distribution */}
                    <div className="card-base p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg text-gray-900">Demographics</h3>
                        </div>
                        <div className="h-[250px] flex items-center justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={data?.trends.categories}
                                        cx="50%" cy="50%"
                                        innerRadius={50} outerRadius={80}
                                        paddingAngle={2}
                                        dataKey="value"
                                        stroke="#fff" strokeWidth={2}
                                    >
                                        {data?.trends.categories.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend
                                        verticalAlign="bottom"
                                        height={36}
                                        iconType="circle"
                                        wrapperStyle={{ fontSize: '12px', fontWeight: 600 }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Recent Activity Feed */}
                    <div className="card-base overflow-hidden">
                        <div className="px-6 py-4 border-b-2 border-gray-900 bg-[#FFFDF8] flex justify-between items-center">
                            <h3 className="font-bold text-lg text-gray-900">Live Activity</h3>
                            <div className="flex items-center gap-2 px-2 py-1 bg-red-100 rounded-lg border border-red-200">
                                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                                <span className="text-[10px] font-bold text-red-700">LIVE</span>
                            </div>
                        </div>
                        <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto scrollbar-thin">
                            {data?.activity.length === 0 ? (
                                <div className="p-6 text-center text-gray-400 font-medium italic">No recent activity</div>
                            ) : (
                                data?.activity.map((item) => (
                                    <div key={item.id} className="p-4 hover:bg-gray-50 transition-colors flex gap-3 items-start group">
                                        <div className={cn(
                                            "w-9 h-9 rounded-xl flex-shrink-0 border-2 border-gray-900 flex items-center justify-center shadow-sm transition-transform group-hover:scale-105",
                                            item.type === 'submission' ? "bg-[#DBEAFE] text-[#2563EB]" :
                                                item.type === 'alert' ? "bg-[#FEE2E2] text-[#DC2626]" :
                                                    item.type === 'job' ? "bg-[#F3E8FF] text-[#7C3AED]" : "bg-gray-100 text-gray-600"
                                        )}>
                                            <span className="material-symbols-outlined text-lg">
                                                {item.type === 'submission' ? 'person' :
                                                    item.type === 'alert' ? 'warning' :
                                                        item.type === 'job' ? 'settings' : 'article'}
                                            </span>
                                        </div>
                                        <div className="flex-1 min-w-0 pt-0.5">
                                            <p className="font-bold text-sm text-gray-900 truncate">{item.exam}</p>
                                            <p className="text-xs font-medium text-gray-500 truncate">{item.user} • {item.type}</p>
                                        </div>
                                        <div className="text-right flex-shrink-0 pt-1">
                                            <span className="text-[10px] font-bold text-gray-400 block mb-1">
                                                {formatDistanceToNow(new Date(item.time), { addSuffix: true })}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="p-3 bg-gray-50 text-center border-t border-gray-100">
                            <Link href="/admin/logs" className="text-xs font-bold text-[#8B5CF6] hover:underline">View Full Logs</Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
