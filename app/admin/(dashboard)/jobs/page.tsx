"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface Job {
    id: number;
    jobName: string;
    jobType: string;
    status: "pending" | "running" | "success" | "failed";
    scheduledAt: string | null;
    startedAt: string | null;
    completedAt: string | null;
    totalRecords: number | null;
    recordsProcessed: number;
    progressPercent: number;
    errorMessage: string | null;
    metadata: any;
    triggeredBy: string;
}

interface Pagination { total: number; page: number; limit: number; totalPages: number; }

const statusConfig: Record<string, { color: string; bg: string; icon: string; label: string }> = {
    pending: { color: "text-amber-700", bg: "bg-amber-50 border-amber-200", icon: "hourglass_empty", label: "Queued" },
    running: { color: "text-blue-700", bg: "bg-blue-50 border-blue-200", icon: "sync", label: "Running" },
    success: { color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", icon: "check_circle", label: "Success" },
    failed: { color: "text-red-700", bg: "bg-red-50 border-red-200", icon: "error", label: "Failed" },
};

const jobTriggers = [
    { type: "rank_calculation", label: "Rank Calculation", desc: "Re-calculate ranks for submissions", icon: "calculate", color: "text-blue-600", bg: "bg-blue-50", needsExam: true },
    { type: "normalization", label: "Normalization", desc: "Normalize scores across shifts", icon: "balance", color: "text-violet-600", bg: "bg-violet-50", needsExam: true },
    { type: "cutoff_prediction", label: "Cutoff Prediction", desc: "Generate AI cutoff predictions", icon: "auto_awesome", color: "text-amber-600", bg: "bg-amber-50", needsExam: true },
    { type: "analytics", label: "Analytics Refresh", desc: "Refresh dashboard statistics", icon: "analytics", color: "text-emerald-600", bg: "bg-emerald-50", needsExam: false },
    { type: "cleanup", label: "Data Cleanup", desc: "Remove orphaned records and optimize", icon: "cleaning_services", color: "text-pink-600", bg: "bg-pink-50", needsExam: false },
    { type: "backup", label: "Database Backup", desc: "Create a full database backup", icon: "backup", color: "text-gray-600", bg: "bg-gray-100", needsExam: false },
];

export default function JobsPage() {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [activeJobs, setActiveJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, limit: 25, totalPages: 1 });
    const [filters, setFilters] = useState({ status: "all", type: "all", search: "" });
    const [triggering, setTriggering] = useState<string | null>(null);
    const [tab, setTab] = useState<"dashboard" | "scheduled">("dashboard");

    // Exam selector modal state
    const [examModal, setExamModal] = useState<{ open: boolean; jobType: string; label: string }>({ open: false, jobType: "", label: "" });
    const [selectedExamId, setSelectedExamId] = useState<string>("all");

    // Scheduled jobs state (inline)
    const [scheduledJobs, setScheduledJobs] = useState<any[]>([]);
    const [exams, setExams] = useState<{ id: number; name: string }[]>([]);
    const [showAddSchedule, setShowAddSchedule] = useState(false);
    const [scheduleForm, setScheduleForm] = useState({ jobType: "rank_calculation", examId: "", cronExpression: "0 2 * * *", name: "" });
    const [creatingSchedule, setCreatingSchedule] = useState(false);

    useEffect(() => {
        fetch("/api/admin/exams?limit=100").then(r => r.json()).then(d => setExams(d.exams || [])).catch(console.error);
    }, []);

    const fetchJobs = useCallback(async () => {
        try {
            const params = new URLSearchParams({
                page: pagination.page.toString(),
                limit: pagination.limit.toString(),
                ...filters,
            });
            const res = await fetch(`/api/admin/jobs?${params}`);
            const data = await res.json();
            setJobs(data.jobs || []);
            setPagination(prev => ({ ...prev, ...data.pagination }));
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, [pagination.page, pagination.limit, filters]);

    const fetchActiveJobs = useCallback(async () => {
        try {
            const res = await fetch("/api/admin/jobs?status=running&limit=10");
            const data = await res.json();
            setActiveJobs(data.jobs || []);
        } catch (e) { console.error(e); }
    }, []);

    useEffect(() => {
        fetchJobs();
        fetchActiveJobs();
        const interval = setInterval(() => { fetchActiveJobs(); }, 5000);
        return () => clearInterval(interval);
    }, [fetchJobs, fetchActiveJobs]);

    const fetchScheduledJobs = useCallback(async () => {
        try {
            const res = await fetch("/api/admin/scheduled-jobs");
            const data = await res.json();
            setScheduledJobs(data.jobs || []);
        } catch (e) { console.error(e); }
    }, []);

    useEffect(() => { fetchScheduledJobs(); }, [fetchScheduledJobs]);

    const handleTriggerClick = (type: string) => {
        const trigger = jobTriggers.find(t => t.type === type);
        if (trigger?.needsExam) {
            setExamModal({ open: true, jobType: type, label: trigger.label });
            setSelectedExamId("all");
        } else {
            triggerJob(type);
        }
    };

    const triggerJob = async (type: string, examId?: number) => {
        setTriggering(type);
        setExamModal({ open: false, jobType: "", label: "" });
        try {
            await fetch("/api/admin/jobs", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type, examId: examId || undefined }),
            });
            setTimeout(() => { fetchJobs(); fetchActiveJobs(); }, 500);
        } catch {
            alert("Failed to trigger job");
        } finally {
            setTriggering(null);
        }
    };

    const handleJobAction = async (id: number, action: "retry" | "cancel") => {
        if (!confirm(`Are you sure you want to ${action} this job?`)) return;
        try {
            await fetch(`/api/admin/jobs/${id}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action }),
            });
            fetchJobs();
            fetchActiveJobs();
        } catch { alert(`${action} failed`); }
    };

    const handleCreateSchedule = async () => {
        if (!scheduleForm.name) return alert("Job name is required");
        setCreatingSchedule(true);
        try {
            const res = await fetch("/api/admin/scheduled-jobs", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    jobName: scheduleForm.name,
                    jobType: scheduleForm.jobType,
                    cronExpression: scheduleForm.cronExpression,
                    config: scheduleForm.examId ? { examId: parseInt(scheduleForm.examId) } : {},
                }),
            });
            if (res.ok) {
                fetchScheduledJobs();
                setShowAddSchedule(false);
                setScheduleForm({ jobType: "rank_calculation", examId: "", cronExpression: "0 2 * * *", name: "" });
            } else {
                const err = await res.json();
                alert(err.error || "Failed to create schedule");
            }
        } catch { alert("Error creating schedule"); }
        finally { setCreatingSchedule(false); }
    };

    const handleDeleteSchedule = async (id: number) => {
        if (!confirm("Delete this scheduled job?")) return;
        try {
            await fetch(`/api/admin/scheduled-jobs?id=${id}`, { method: "DELETE" });
            fetchScheduledJobs();
        } catch { alert("Failed to delete schedule"); }
    };

    const handleToggleSchedule = async (id: number, isEnabled: boolean) => {
        try {
            await fetch(`/api/admin/scheduled-jobs?id=${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isEnabled: !isEnabled }),
            });
            fetchScheduledJobs();
        } catch { console.error("Failed to toggle schedule"); }
    };

    const getDuration = (job: Job) => {
        if (!job.startedAt) return "-";
        const start = new Date(job.startedAt).getTime();
        const end = job.completedAt ? new Date(job.completedAt).getTime() : Date.now();
        const secs = Math.round((end - start) / 1000);
        if (secs < 60) return `${secs}s`;
        return `${Math.floor(secs / 60)}m ${secs % 60}s`;
    };

    const cronPresets: Record<string, string> = {
        "0 2 * * *": "Daily at 2:00 AM",
        "0 3 * * *": "Daily at 3:00 AM",
        "0 * * * *": "Every hour",
        "0 */6 * * *": "Every 6 hours",
        "0 2 * * 0": "Weekly (Sun 2 AM)",
        "0 2 1 * *": "Monthly (1st at 2 AM)",
    };

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Background Jobs</h1>
                    <p className="text-gray-500 font-medium mt-1">Monitor, trigger, and schedule background tasks.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setTab("dashboard")}
                        className={cn("px-4 py-2 rounded-xl text-sm font-bold transition-all border-2",
                            tab === "dashboard" ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-700 border-gray-200 hover:border-gray-900"
                        )}
                    >Dashboard</button>
                    <button
                        onClick={() => setTab("scheduled")}
                        className={cn("px-4 py-2 rounded-xl text-sm font-bold transition-all border-2",
                            tab === "scheduled" ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-700 border-gray-200 hover:border-gray-900"
                        )}
                    >
                        Scheduled Jobs
                        {scheduledJobs.length > 0 && (
                            <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-[#A78BFA] text-white rounded-full">{scheduledJobs.length}</span>
                        )}
                    </button>
                </div>
            </div>

            {tab === "dashboard" ? (
                <>
                    {/* Active Jobs */}
                    {activeJobs.length > 0 && (
                        <div className="space-y-3">
                            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                <span className="flex h-2 w-2 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span></span>
                                Active Jobs ({activeJobs.length})
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {activeJobs.map(job => (
                                    <div key={job.id} className="card-base p-4 bg-blue-50 border-blue-200">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <span className="material-symbols-outlined text-blue-600 animate-spin">sync</span>
                                                <span className="font-bold text-gray-900">{job.jobName}</span>
                                            </div>
                                            <button onClick={() => handleJobAction(job.id, "cancel")}
                                                className="text-xs font-bold text-red-500 hover:text-red-700 px-2 py-1 hover:bg-red-50 rounded-lg transition-colors">
                                                Cancel
                                            </button>
                                        </div>
                                        <div className="w-full bg-blue-200 rounded-full h-2.5 mb-2">
                                            <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                                                style={{ width: `${job.progressPercent || 0}%` }}></div>
                                        </div>
                                        <div className="flex justify-between text-xs text-gray-500 font-medium">
                                            <span>{job.progressPercent || 0}% complete</span>
                                            <span>{job.recordsProcessed || 0}/{job.totalRecords || "?"} records</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Quick Trigger Cards */}
                    <div>
                        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-3">Quick Triggers</h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                            {jobTriggers.map(trigger => (
                                <button
                                    key={trigger.type}
                                    onClick={() => handleTriggerClick(trigger.type)}
                                    disabled={triggering === trigger.type}
                                    className="card-base p-4 bg-white text-left hover:-translate-y-1 hover:shadow-neo-hover transition-all group disabled:opacity-50"
                                >
                                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-3", trigger.bg)}>
                                        <span className={cn("material-symbols-outlined text-xl", trigger.color)}>
                                            {triggering === trigger.type ? "progress_activity" : trigger.icon}
                                        </span>
                                    </div>
                                    <h3 className="font-bold text-sm text-gray-900 leading-tight">{trigger.label}</h3>
                                    <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">{trigger.desc}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Job History  */}
                    <div className="card-base bg-white overflow-hidden p-0">
                        {/* Filters */}
                        <div className="p-4 border-b-2 border-gray-100 flex flex-wrap gap-2 items-center">
                            <h2 className="text-lg font-bold text-gray-900 mr-auto">Job History</h2>
                            <div className="relative group">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">search</span>
                                <input type="text" placeholder="Search jobs..."
                                    className="pl-9 pr-4 py-1.5 border-2 border-gray-200 rounded-lg focus:border-gray-900 outline-none w-44 text-sm"
                                    value={filters.search} onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))} />
                            </div>
                            <select className="px-3 py-1.5 border-2 border-gray-200 rounded-lg focus:border-gray-900 outline-none bg-white text-sm font-bold text-gray-700"
                                value={filters.status} onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}>
                                <option value="all">All Status</option>
                                <option value="pending">Queued</option>
                                <option value="running">Running</option>
                                <option value="success">Success</option>
                                <option value="failed">Failed</option>
                            </select>
                            <select className="px-3 py-1.5 border-2 border-gray-200 rounded-lg focus:border-gray-900 outline-none bg-white text-sm font-bold text-gray-700"
                                value={filters.type} onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}>
                                <option value="all">All Types</option>
                                {jobTriggers.map(t => <option key={t.type} value={t.type}>{t.label}</option>)}
                            </select>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="p-3 text-xs font-bold text-gray-500 uppercase">Job</th>
                                        <th className="p-3 text-xs font-bold text-gray-500 uppercase">Type</th>
                                        <th className="p-3 text-xs font-bold text-gray-500 uppercase">Status</th>
                                        <th className="p-3 text-xs font-bold text-gray-500 uppercase">Duration</th>
                                        <th className="p-3 text-xs font-bold text-gray-500 uppercase">Progress</th>
                                        <th className="p-3 text-xs font-bold text-gray-500 uppercase">Started</th>
                                        <th className="p-3 text-xs font-bold text-gray-500 uppercase text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {loading ? (
                                        Array.from({ length: 5 }).map((_, i) => (
                                            <tr key={i} className="animate-pulse">
                                                {Array.from({ length: 7 }).map((_, j) => (
                                                    <td key={j} className="p-3"><div className="h-5 bg-gray-200 rounded w-20"></div></td>
                                                ))}
                                            </tr>
                                        ))
                                    ) : jobs.length === 0 ? (
                                        <tr><td colSpan={7} className="p-12 text-center text-gray-500 font-medium">No jobs found.</td></tr>
                                    ) : (
                                        jobs.map(job => {
                                            const cfg = statusConfig[job.status] || statusConfig.pending;
                                            return (
                                                <tr key={job.id} className="hover:bg-gray-50 transition-colors group">
                                                    <td className="p-3">
                                                        <Link href={`/admin/jobs/${job.id}`} className="font-bold text-sm text-gray-900 hover:text-[#7C3AED] transition-colors">
                                                            {job.jobName}
                                                        </Link>
                                                        <span className="text-[10px] text-gray-400 font-mono block">#{job.id}</span>
                                                    </td>
                                                    <td className="p-3">
                                                        <span className="text-xs font-bold text-gray-600 capitalize">{job.jobType.replace(/_/g, " ")}</span>
                                                    </td>
                                                    <td className="p-3">
                                                        <span className={cn("inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold uppercase border", cfg.bg, cfg.color)}>
                                                            <span className="material-symbols-outlined text-xs">{cfg.icon}</span>
                                                            {cfg.label}
                                                        </span>
                                                    </td>
                                                    <td className="p-3 text-xs font-mono text-gray-500">{getDuration(job)}</td>
                                                    <td className="p-3">
                                                        {job.status === "running" ? (
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-16 bg-gray-200 rounded-full h-1.5">
                                                                    <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${job.progressPercent}%` }}></div>
                                                                </div>
                                                                <span className="text-[10px] text-gray-500 font-bold">{job.progressPercent}%</span>
                                                            </div>
                                                        ) : job.status === "success" ? (
                                                            <span className="text-xs text-emerald-600 font-bold">100%</span>
                                                        ) : (
                                                            <span className="text-xs text-gray-400">-</span>
                                                        )}
                                                    </td>
                                                    <td className="p-3 text-xs text-gray-500">
                                                        {job.startedAt ? formatDistanceToNow(new Date(job.startedAt), { addSuffix: true }) : "-"}
                                                    </td>
                                                    <td className="p-3 text-right">
                                                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Link href={`/admin/jobs/${job.id}`}
                                                                className="p-1.5 text-gray-400 hover:text-[#7C3AED] hover:bg-[#F3E8FF] rounded-lg transition-colors" title="Details">
                                                                <span className="material-symbols-outlined text-lg">visibility</span>
                                                            </Link>
                                                            {job.status === "failed" && (
                                                                <button onClick={() => handleJobAction(job.id, "retry")}
                                                                    className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Retry">
                                                                    <span className="material-symbols-outlined text-lg">replay</span>
                                                                </button>
                                                            )}
                                                            {(job.status === "running" || job.status === "pending") && (
                                                                <button onClick={() => handleJobAction(job.id, "cancel")}
                                                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Cancel">
                                                                    <span className="material-symbols-outlined text-lg">cancel</span>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="p-3 border-t-2 border-gray-100 flex items-center justify-between bg-gray-50 text-sm">
                            <span className="text-gray-500 font-medium">
                                Showing {Math.min((pagination.page - 1) * pagination.limit + 1, pagination.total)}-{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                            </span>
                            <div className="flex items-center gap-2">
                                <button disabled={pagination.page <= 1} onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                                    className="px-3 py-1 bg-white border-2 border-gray-200 rounded-lg hover:border-gray-900 disabled:opacity-50 font-bold text-gray-700 transition-all">Prev</button>
                                <span className="px-3 font-bold text-gray-900">Page {pagination.page}</span>
                                <button disabled={pagination.page >= pagination.totalPages} onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                                    className="px-3 py-1 bg-white border-2 border-gray-200 rounded-lg hover:border-gray-900 disabled:opacity-50 font-bold text-gray-700 transition-all">Next</button>
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                /* Scheduled Jobs Tab */
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold text-gray-900">Scheduled Jobs</h2>
                        <button onClick={() => setShowAddSchedule(!showAddSchedule)}
                            className="btn-primary flex items-center gap-2 text-sm">
                            <span className="material-symbols-outlined text-lg">{showAddSchedule ? "close" : "add_circle"}</span>
                            {showAddSchedule ? "Cancel" : "Add Schedule"}
                        </button>
                    </div>

                    {/* Add New Schedule Form */}
                    {showAddSchedule && (
                        <div className="card-base p-6 bg-white space-y-4">
                            <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                <span className="material-symbols-outlined text-[#A78BFA]">schedule_send</span>
                                New Scheduled Job
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Job Name <span className="text-red-500">*</span></label>
                                    <input type="text" value={scheduleForm.name} onChange={(e) => setScheduleForm(p => ({ ...p, name: e.target.value }))}
                                        placeholder="e.g., Daily Rank Recalc" className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-gray-900 outline-none text-sm" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Job Type</label>
                                    <select value={scheduleForm.jobType} onChange={(e) => setScheduleForm(p => ({ ...p, jobType: e.target.value }))}
                                        className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-gray-900 outline-none bg-white text-sm font-medium">
                                        {jobTriggers.map(t => <option key={t.type} value={t.type}>{t.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Schedule (Cron)</label>
                                    <select value={scheduleForm.cronExpression} onChange={(e) => setScheduleForm(p => ({ ...p, cronExpression: e.target.value }))}
                                        className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-gray-900 outline-none bg-white text-sm font-medium">
                                        {Object.entries(cronPresets).map(([cron, label]) => (
                                            <option key={cron} value={cron}>{label} ({cron})</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Target Exam (Optional)</label>
                                    <select value={scheduleForm.examId} onChange={(e) => setScheduleForm(p => ({ ...p, examId: e.target.value }))}
                                        className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-gray-900 outline-none bg-white text-sm font-medium">
                                        <option value="">All Exams</option>
                                        {exams.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="flex justify-end">
                                <button onClick={handleCreateSchedule} disabled={creatingSchedule}
                                    className="btn-primary px-6 disabled:opacity-50">
                                    {creatingSchedule ? "Creating..." : "Create Schedule"}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Scheduled Jobs Table */}
                    <div className="card-base bg-white overflow-hidden p-0">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="p-3 text-xs font-bold text-gray-500 uppercase">Name</th>
                                    <th className="p-3 text-xs font-bold text-gray-500 uppercase">Type</th>
                                    <th className="p-3 text-xs font-bold text-gray-500 uppercase">Schedule</th>
                                    <th className="p-3 text-xs font-bold text-gray-500 uppercase">Next Run</th>
                                    <th className="p-3 text-xs font-bold text-gray-500 uppercase">Last Run</th>
                                    <th className="p-3 text-xs font-bold text-gray-500 uppercase">Status</th>
                                    <th className="p-3 text-xs font-bold text-gray-500 uppercase text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {scheduledJobs.length === 0 ? (
                                    <tr><td colSpan={7} className="p-12 text-center text-gray-500">No scheduled jobs configured.</td></tr>
                                ) : (
                                    scheduledJobs.map((job: any) => (
                                        <tr key={job.id} className="hover:bg-gray-50 transition-colors group">
                                            <td className="p-3 font-bold text-sm text-gray-900">{job.name}</td>
                                            <td className="p-3 text-xs font-bold text-gray-600 capitalize">{job.jobType.replace(/_/g, " ")}</td>
                                            <td className="p-3">
                                                <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-600">{job.cronExpression}</span>
                                                {cronPresets[job.cronExpression] && (
                                                    <span className="text-[10px] text-gray-400 block mt-0.5">{cronPresets[job.cronExpression]}</span>
                                                )}
                                            </td>
                                            <td className="p-3 text-xs text-gray-500">
                                                {job.nextRunAt ? formatDistanceToNow(new Date(job.nextRunAt), { addSuffix: true }) : "-"}
                                            </td>
                                            <td className="p-3 text-xs text-gray-500">
                                                {job.lastRunAt ? formatDistanceToNow(new Date(job.lastRunAt), { addSuffix: true }) : "Never"}
                                            </td>
                                            <td className="p-3">
                                                <span className={cn("inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold uppercase border",
                                                    job.isEnabled ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-gray-100 text-gray-500 border-gray-200"
                                                )}>
                                                    {job.isEnabled ? "Active" : "Disabled"}
                                                </span>
                                            </td>
                                            <td className="p-3 text-right">
                                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => handleToggleSchedule(job.id, job.isEnabled)}
                                                        className={cn("p-1.5 rounded-lg transition-colors",
                                                            job.isEnabled ? "text-amber-500 hover:bg-amber-50" : "text-emerald-500 hover:bg-emerald-50"
                                                        )} title={job.isEnabled ? "Disable" : "Enable"}>
                                                        <span className="material-symbols-outlined text-lg">{job.isEnabled ? "pause" : "play_arrow"}</span>
                                                    </button>
                                                    <button onClick={() => handleDeleteSchedule(job.id)}
                                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                                                        <span className="material-symbols-outlined text-lg">delete</span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Exam Selector Modal */}
            {examModal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setExamModal({ open: false, jobType: "", label: "" })}>
                    <div className="card-base bg-white p-6 w-full max-w-md mx-4 space-y-5" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <span className="material-symbols-outlined text-[#A78BFA]">
                                    {jobTriggers.find(t => t.type === examModal.jobType)?.icon || "work"}
                                </span>
                                {examModal.label}
                            </h3>
                            <button onClick={() => setExamModal({ open: false, jobType: "", label: "" })}
                                className="p-1 text-gray-400 hover:text-gray-900 transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Select Target Exam</label>
                            <select
                                value={selectedExamId}
                                onChange={(e) => setSelectedExamId(e.target.value)}
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-gray-900 outline-none bg-white text-sm font-medium"
                            >
                                <option value="all">🔄 All Active Exams</option>
                                {exams.map(exam => (
                                    <option key={exam.id} value={exam.id}>{exam.name}</option>
                                ))}
                            </select>
                            <p className="text-[10px] text-gray-400 mt-1.5 font-medium">
                                {selectedExamId === "all"
                                    ? "This will process all active exams sequentially."
                                    : "Only the selected exam will be processed."}
                            </p>
                        </div>

                        <div className="flex gap-2 pt-2">
                            <button onClick={() => setExamModal({ open: false, jobType: "", label: "" })}
                                className="flex-1 py-2.5 bg-white text-gray-700 font-bold rounded-xl border-2 border-gray-200 hover:border-gray-900 transition-all text-sm">
                                Cancel
                            </button>
                            <button
                                onClick={() => triggerJob(examModal.jobType, selectedExamId === "all" ? undefined : parseInt(selectedExamId))}
                                className="flex-1 py-2.5 bg-gray-900 text-white font-bold rounded-xl border-2 border-gray-900 hover:bg-gray-800 transition-all text-sm flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined text-lg">play_arrow</span>
                                Run Job
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
