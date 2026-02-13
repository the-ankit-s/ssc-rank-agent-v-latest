"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import {
    Activity, Zap, Calculator, Scale, Sparkles, BarChart3,
    Trash2, Database, Search, ChevronLeft, ChevronRight,
    Eye, RotateCcw, XCircle, RefreshCw, Plus, X, Play,
    Pause, Clock, CalendarClock, Timer, Lock, Check,
    ArrowRight, AlertTriangle
} from "lucide-react";
import {
    useJobs, useActiveJobs, useScheduledJobs, useJobReadiness,
    useTriggerJob, useJobAction, useScheduleAction
} from "@/hooks/admin/use-jobs";
import { useExamOptions } from "@/hooks/admin/use-submissions";
import { toast } from "sonner"; // Assuming sonner is available, or use alert fallback

// ─── Constants ───────────────────────────────────────────────────────────────

const statusCfg: Record<string, { bg: string; text: string; dot: string; label: string }> = {
    pending: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500", label: "Queued" },
    running: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500", label: "Running" },
    success: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", label: "Success" },
    failed: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500", label: "Failed" },
};

const triggerIcons: Record<string, any> = {
    rank_calculation: Calculator, normalization: Scale, cutoff_prediction: Sparkles,
    analytics: BarChart3, cleanup: Trash2, backup: Database,
};
const triggerColors: Record<string, { icon: string; bg: string }> = {
    rank_calculation: { icon: "text-blue-600", bg: "bg-blue-50" },
    normalization: { icon: "text-violet-600", bg: "bg-violet-50" },
    cutoff_prediction: { icon: "text-amber-600", bg: "bg-amber-50" },
    analytics: { icon: "text-emerald-600", bg: "bg-emerald-50" },
    cleanup: { icon: "text-pink-600", bg: "bg-pink-50" },
    backup: { icon: "text-gray-600", bg: "bg-gray-100" },
};

const utilityTriggers = [
    { type: "analytics", label: "Analytics Refresh", desc: "Refresh dashboard statistics" },
    { type: "cleanup", label: "Data Cleanup", desc: "Remove old records and optimize" },
    { type: "backup", label: "Database Backup", desc: "Create table manifest snapshot" },
];

const jobTriggers = [
    { type: "rank_calculation", label: "Rank Calculation", desc: "Re-calculate ranks for submissions", needsExam: true },
    { type: "normalization", label: "Normalization", desc: "Normalize scores across shifts", needsExam: true },
    { type: "cutoff_prediction", label: "Cutoff Prediction", desc: "Generate AI cutoff predictions", needsExam: true },
    { type: "analytics", label: "Analytics Refresh", desc: "Refresh dashboard statistics", needsExam: false },
    { type: "cleanup", label: "Data Cleanup", desc: "Remove orphaned records and optimize", needsExam: false },
    { type: "backup", label: "Database Backup", desc: "Create a full database backup", needsExam: false },
];

const cronPresets: Record<string, string> = {
    "0 2 * * *": "Daily at 2:00 AM", "0 3 * * *": "Daily at 3:00 AM", "0 * * * *": "Every hour",
    "0 */6 * * *": "Every 6 hours", "0 2 * * 0": "Weekly (Sun 2 AM)", "0 2 1 * *": "Monthly (1st at 2 AM)",
};

// ─── Components ──────────────────────────────────────────────────────────────

function PipelineStep({ step, index, total, onRun, running, disabled }: {
    step: { type: string; label: string; icon: any; color: { icon: string; bg: string }; status: "locked" | "ready" | "done" | "running"; message: string; stats?: any };
    index: number; total: number; onRun: () => void; running: boolean; disabled: boolean;
}) {
    const Icon = step.icon;
    const isLocked = step.status === "locked";
    const isDone = step.status === "done";
    const isRunning = step.status === "running";

    return (
        <div className="flex items-stretch">
            <div className={cn(
                "flex-1 rounded-xl border p-4 transition-all relative",
                isLocked ? "bg-gray-50 border-gray-100 opacity-60" :
                    isDone ? "bg-emerald-50/50 border-emerald-200" :
                        isRunning ? "bg-blue-50/50 border-blue-200" :
                            "bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm"
            )}>
                {/* Step number badge */}
                <div className="absolute -top-2.5 left-3">
                    <span className={cn(
                        "inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold",
                        isDone ? "bg-emerald-500 text-white" :
                            isRunning ? "bg-blue-500 text-white" :
                                isLocked ? "bg-gray-200 text-gray-400" :
                                    "bg-gray-900 text-white"
                    )}>
                        {isDone ? <Check className="w-3 h-3" /> : index + 1}
                    </span>
                </div>

                <div className="flex items-start gap-3 mt-1">
                    <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0",
                        isLocked ? "bg-gray-100" : step.color.bg)}>
                        {isLocked ? <Lock className="w-4 h-4 text-gray-400" /> :
                            isRunning ? <RefreshCw className={cn("w-4 h-4 animate-spin", step.color.icon)} /> :
                                isDone ? <Check className="w-4 h-4 text-emerald-600" /> :
                                    <Icon className={cn("w-4 h-4", step.color.icon)} />}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className={cn("font-bold text-xs", isLocked ? "text-gray-400" : "text-gray-900")}>{step.label}</h3>
                        <p className={cn("text-[10px] mt-0.5 leading-relaxed",
                            isDone ? "text-emerald-600" :
                                isLocked ? "text-gray-400" :
                                    isRunning ? "text-blue-600" : "text-gray-500"
                        )}>{step.message}</p>

                        {/* Stats */}
                        {step.stats && !isLocked && (
                            <div className="flex gap-3 mt-2">
                                {step.stats.normalized !== undefined && (
                                    <span className="text-[10px] font-semibold text-gray-500">
                                        {step.stats.normalized}/{step.stats.total} normalized ({step.stats.ratio}%)
                                    </span>
                                )}
                                {step.stats.ranked !== undefined && (
                                    <span className="text-[10px] font-semibold text-gray-500">
                                        {step.stats.ranked}/{step.stats.total} ranked ({step.stats.ratio}%)
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Action button */}
                        {!isLocked && !isDone && (
                            <button onClick={onRun} disabled={running || disabled}
                                className={cn(
                                    "mt-2.5 flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-lg transition-all disabled:opacity-50",
                                    isRunning
                                        ? "bg-blue-100 text-blue-700 cursor-not-allowed"
                                        : "bg-gray-900 text-white hover:bg-gray-800"
                                )}>
                                {isRunning ? (
                                    <><RefreshCw className="w-3 h-3 animate-spin" />Running…</>
                                ) : (
                                    <><Play className="w-3 h-3" />Run {step.label}</>
                                )}
                            </button>
                        )}

                        {isDone && (
                            <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                                <Check className="w-3 h-3" />Completed
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Connector arrow */}
            {index < total - 1 && (
                <div className="flex items-center px-1.5 flex-shrink-0">
                    <ArrowRight className={cn("w-4 h-4", isDone ? "text-emerald-400" : "text-gray-200")} />
                </div>
            )}
        </div>
    );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function JobsPage() {
    // State
    const [tab, setTab] = useState<"dashboard" | "scheduled">("dashboard");
    const [page, setPage] = useState(1);
    const [filters, setFilters] = useState({ status: "all", type: "all", search: "" });
    const [pipelineExamId, setPipelineExamId] = useState<string>("");
    const [showAddSchedule, setShowAddSchedule] = useState(false);
    const [scheduleForm, setScheduleForm] = useState({ jobType: "rank_calculation", examId: "", cronExpression: "0 2 * * *", name: "" });

    // Queries
    const { data: jobsData, isLoading: jobsLoading } = useJobs({ page, limit: 25, ...filters });
    const { data: activeJobs } = useActiveJobs();
    const { data: scheduledJobs } = useScheduledJobs();
    const { data: readiness, isLoading: readinessLoading, refetch: refetchReadiness } = useJobReadiness(pipelineExamId);

    // Mutations
    const triggerJob = useTriggerJob();
    const jobAction = useJobAction();
    const scheduleAction = useScheduleAction();

    // Fetch exams list
    const { data: examsRaw } = useExamOptions();
    const exams = examsRaw || [];

    // Handlers
    const handleTrigger = (type: string, examId?: number) => {
        triggerJob.mutate({ type, examId }, {
            onSuccess: () => toast.success("Job triggered successfully"),
            onError: () => toast.error("Failed to trigger job"),
        });
    };

    const handleJobAction = (id: number, action: "retry" | "cancel") => {
        if (!confirm(`Are you sure you want to ${action} this job?`)) return;
        jobAction.mutate({ id, action }, {
            onSuccess: () => toast.success(`Job ${action}ed successfully`),
            onError: () => toast.error(`Failed to ${action} job`),
        });
    };

    const handleCreateSchedule = () => {
        if (!scheduleForm.name) return toast.error("Job name is required");
        scheduleAction.mutate({
            type: "create",
            data: {
                jobName: scheduleForm.name,
                jobType: scheduleForm.jobType,
                cronExpression: scheduleForm.cronExpression,
                config: scheduleForm.examId ? { examId: parseInt(scheduleForm.examId) } : {}
            }
        }, {
            onSuccess: () => {
                toast.success("Schedule created");
                setShowAddSchedule(false);
                setScheduleForm({ jobType: "rank_calculation", examId: "", cronExpression: "0 2 * * *", name: "" });
            },
            onError: (err) => toast.error(err.message),
        });
    };

    const handleToggleSchedule = (id: number, isEnabled: boolean) => {
        scheduleAction.mutate({ type: "toggle", id, data: { isEnabled: !isEnabled } });
    };

    const handleDeleteSchedule = (id: number) => {
        if (!confirm("Delete this scheduled job?")) return;
        scheduleAction.mutate({ type: "delete", id });
    };

    // Derived State
    const isJobRunning = (type: string) => (activeJobs || []).some(j => j.jobType === type && j.status === "running");
    const triggeringType = triggerJob.isPending ? triggerJob.variables?.type : null;

    const pipelineSteps = readiness ? [
        {
            type: "normalization", label: "Normalize Scores", icon: Scale,
            color: triggerColors.normalization,
            status: isJobRunning("normalization") ? "running" as const :
                readiness.normalization.done ? "done" as const :
                    readiness.normalization.ready ? "ready" as const : "ready" as const,
            message: readiness.normalization.message,
            stats: readiness.normalization.stats,
        },
        {
            type: "rank_calculation", label: "Calculate Ranks", icon: Calculator,
            color: triggerColors.rank_calculation,
            status: isJobRunning("rank_calculation") ? "running" as const :
                readiness.ranks.done ? "done" as const :
                    readiness.ranks.ready ? "ready" as const : "locked" as const,
            message: readiness.ranks.message,
            stats: readiness.ranks.stats,
        },
        {
            type: "cutoff_prediction", label: "Predict Cutoffs", icon: Sparkles,
            color: triggerColors.cutoff_prediction,
            status: isJobRunning("cutoff_prediction") ? "running" as const :
                readiness.cutoffs.ready ? "ready" as const : "locked" as const,
            message: readiness.cutoffs.message,
            stats: readiness.cutoffs.stats,
        },
    ] : [];

    const inputCls = "w-full h-9 px-3 text-xs font-medium bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-300";

    return (
        <div className="space-y-5 max-w-[1600px] mx-auto pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-gray-900 flex items-center justify-center"><Activity className="w-4 h-4 text-white" /></div>
                    <div>
                        <h1 className="text-lg font-bold text-gray-900">Background Jobs</h1>
                        <p className="text-xs text-gray-400">Monitor, trigger, and schedule background tasks</p>
                    </div>
                </div>
                <div className="flex items-center gap-1.5">
                    {(["dashboard", "scheduled"] as const).map(t => (
                        <button key={t} onClick={() => setTab(t)}
                            className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                                tab === t ? "bg-gray-900 text-white shadow-sm" : "text-gray-500 hover:bg-gray-50 hover:text-gray-700")}>
                            {t === "dashboard" ? "Dashboard" : "Scheduled"}
                            {t === "scheduled" && (scheduledJobs?.length || 0) > 0 && (
                                <span className="ml-1.5 px-1 py-0.5 text-[9px] bg-indigo-500 text-white rounded-full">{scheduledJobs?.length}</span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {tab === "dashboard" ? (<>
                {/* Active Jobs */}
                {(activeJobs || []).length > 0 && (
                    <div className="space-y-2.5">
                        <h2 className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                            <span className="flex h-1.5 w-1.5 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" /><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500" /></span>
                            Active Jobs ({activeJobs?.length})
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                            {activeJobs?.map(job => (
                                <div key={job.id} className="bg-blue-50 rounded-xl border border-blue-200 p-3.5">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                                            <span className="font-bold text-xs text-gray-900">{job.jobName}</span>
                                        </div>
                                        <button onClick={() => handleJobAction(job.id, "cancel")} className="text-[10px] font-semibold text-red-500 hover:text-red-700 px-1.5 py-0.5 hover:bg-red-50 rounded transition-colors">Cancel</button>
                                    </div>
                                    <div className="w-full bg-blue-200 rounded-full h-1.5 mb-1.5">
                                        <div className="bg-blue-600 h-1.5 rounded-full transition-all duration-500" style={{ width: `${job.progressPercent || 0}%` }} />
                                    </div>
                                    <div className="flex justify-between text-[10px] text-gray-500 font-medium">
                                        <span>{job.progressPercent || 0}% complete</span>
                                        <span>{job.recordsProcessed || 0}/{job.totalRecords || "?"} records</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ═══════ Processing Pipeline ═══════ */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                            <Zap className="w-3 h-3" /> Processing Pipeline
                        </h2>
                        {readiness && (
                            <button onClick={() => refetchReadiness()} className="text-[10px] font-semibold text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors">
                                <RefreshCw className={cn("w-3 h-3", readinessLoading && "animate-spin")} />Refresh Status
                            </button>
                        )}
                    </div>

                    <div className="bg-white rounded-xl border border-gray-100 p-5">
                        {/* Exam selector */}
                        <div className="flex items-center gap-3 mb-5">
                            <label className="text-xs font-semibold text-gray-600 flex-shrink-0">Select Exam</label>
                            <select value={pipelineExamId} onChange={e => setPipelineExamId(e.target.value)}
                                className={inputCls + " max-w-xs cursor-pointer"}>
                                <option value="">Choose an exam to start…</option>
                                {(() => {
                                    const active = exams.filter((e: any) => e.isActive !== false && e.status !== "closed");
                                    const archived = exams.filter((e: any) => e.isActive === false || e.status === "closed");
                                    return (<>
                                        {active.length > 0 && <optgroup label="Active Exams">{active.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</optgroup>}
                                        {archived.length > 0 && <optgroup label="Archived / Closed">{archived.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</optgroup>}
                                    </>);
                                })()}
                            </select>
                            {readinessLoading && <RefreshCw className="w-3.5 h-3.5 text-gray-400 animate-spin" />}
                        </div>

                        {!pipelineExamId ? (
                            <div className="text-center py-8">
                                <Scale className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                                <p className="text-xs text-gray-400 font-medium">Select an exam above to see the processing pipeline</p>
                                <p className="text-[10px] text-gray-300 mt-1">The pipeline ensures jobs run in the correct order: Normalize → Rank → Cutoff</p>
                            </div>
                        ) : readiness ? (
                            <>
                                {/* Pipeline info bar */}
                                <div className="flex items-center gap-4 mb-4 pb-3 border-b border-gray-100">
                                    <div className="flex items-center gap-1.5">
                                        <Database className="w-3.5 h-3.5 text-gray-400" />
                                        <span className="text-[11px] font-semibold text-gray-600">{readiness.examName}</span>
                                    </div>
                                    <span className="text-[10px] text-gray-400">•</span>
                                    <span className="text-[10px] font-semibold text-gray-500">{readiness.totalSubmissions.toLocaleString()} submissions</span>
                                    {readiness.totalSubmissions === 0 && (
                                        <span className="ml-auto flex items-center gap-1 text-[10px] font-semibold text-amber-600">
                                            <AlertTriangle className="w-3 h-3" />No submissions found — upload data first
                                        </span>
                                    )}
                                </div>

                                {/* 3-step stepper */}
                                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto_1fr] gap-0 items-stretch">
                                    {pipelineSteps.map((step, i) => (
                                        <PipelineStep key={step.type} step={step} index={i} total={pipelineSteps.length}
                                            onRun={() => handleTrigger(step.type, parseInt(pipelineExamId))}
                                            running={isJobRunning(step.type) || (triggeringType === step.type && triggerJob.isPending)}
                                            disabled={triggerJob.isPending} />
                                    ))}
                                </div>
                            </>
                        ) : null}
                    </div>
                </div>

                {/* ═══════ Utility Quick Triggers ═══════ */}
                <div>
                    <h2 className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2.5">Utility Jobs</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        {utilityTriggers.map(trigger => {
                            const Icon = triggerIcons[trigger.type] || Zap;
                            const colors = triggerColors[trigger.type] || { icon: "text-gray-600", bg: "bg-gray-100" };
                            return (
                                <button key={trigger.type} onClick={() => handleTrigger(trigger.type)} disabled={triggerJob.isPending}
                                    className="bg-white rounded-xl border border-gray-100 p-3.5 text-left hover:border-gray-200 hover:shadow-sm transition-all group disabled:opacity-50">
                                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mb-2.5", colors.bg)}>
                                        {triggeringType === trigger.type ? <RefreshCw className={cn("w-4 h-4 animate-spin", colors.icon)} /> : <Icon className={cn("w-4 h-4", colors.icon)} />}
                                    </div>
                                    <h3 className="font-bold text-[11px] text-gray-900 leading-tight">{trigger.label}</h3>
                                    <p className="text-[10px] text-gray-400 mt-0.5 leading-relaxed">{trigger.desc}</p>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Job History */}
                <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                    {/* Filters */}
                    <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap gap-2 items-center">
                        <h2 className="text-sm font-bold text-gray-900 mr-auto">Job History</h2>
                        <div className="relative">
                            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input type="text" placeholder="Search…" className="pl-8 pr-3 h-8 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-300 w-36 text-xs"
                                value={filters.search} onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))} />
                        </div>
                        <select className="h-8 px-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-300 bg-white text-xs font-semibold text-gray-700"
                            value={filters.status} onChange={e => setFilters(prev => ({ ...prev, status: e.target.value }))}>
                            <option value="all">All Status</option><option value="pending">Queued</option><option value="running">Running</option><option value="success">Success</option><option value="failed">Failed</option>
                        </select>
                        <select className="h-8 px-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-300 bg-white text-xs font-semibold text-gray-700"
                            value={filters.type} onChange={e => setFilters(prev => ({ ...prev, type: e.target.value }))}>
                            <option value="all">All Types</option>
                            {jobTriggers.map(t => <option key={t.type} value={t.type}>{t.label}</option>)}
                        </select>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50/50">
                                    <th className="py-2.5 px-4 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Job</th>
                                    <th className="py-2.5 pr-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Type</th>
                                    <th className="py-2.5 pr-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                                    <th className="py-2.5 pr-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Duration</th>
                                    <th className="py-2.5 pr-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Progress</th>
                                    <th className="py-2.5 pr-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Started</th>
                                    <th className="py-2.5 pr-3 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody>{jobsLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">{Array.from({ length: 7 }).map((_, j) => (<td key={j} className="py-3 px-4"><div className="h-4 bg-gray-100 rounded w-16" /></td>))}</tr>
                                ))
                            ) : jobsData?.jobs.length === 0 ? (
                                <tr><td colSpan={7} className="py-12 text-center text-gray-400 text-xs font-medium">No jobs found.</td></tr>
                            ) : (
                                jobsData?.jobs.map(job => {
                                    const cfg = statusCfg[job.status] || statusCfg.pending;
                                    const getDuration = (job: any) => {
                                        if (!job.startedAt) return "-";
                                        const secs = Math.round(((job.completedAt ? new Date(job.completedAt).getTime() : Date.now()) - new Date(job.startedAt).getTime()) / 1000);
                                        return secs < 60 ? `${secs}s` : `${Math.floor(secs / 60)}m ${secs % 60}s`;
                                    };
                                    return (
                                        <tr key={job.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors group">
                                            <td className="py-2.5 px-4">
                                                <Link href={`/admin/jobs/${job.id}`} className="font-bold text-xs text-gray-900 hover:text-indigo-600 transition-colors">{job.jobName}</Link>
                                                <span className="text-[10px] text-gray-400 font-mono block">#{job.id}</span>
                                            </td>
                                            <td className="py-2.5 pr-3"><span className="text-xs font-semibold text-gray-600 capitalize">{job.jobType.replace(/_/g, " ")}</span></td>
                                            <td className="py-2.5 pr-3">
                                                <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold capitalize", cfg.bg, cfg.text)}>
                                                    <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />{cfg.label}
                                                </span>
                                            </td>
                                            <td className="py-2.5 pr-3 font-mono text-gray-500 text-[11px]">{getDuration(job)}</td>
                                            <td className="py-2.5 pr-3">
                                                {job.status === "running" ? (
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="w-14 bg-gray-200 rounded-full h-1"><div className="bg-blue-600 h-1 rounded-full" style={{ width: `${job.progressPercent}%` }} /></div>
                                                        <span className="text-[10px] text-gray-500 font-bold">{job.progressPercent}%</span>
                                                    </div>
                                                ) : job.status === "success" ? (
                                                    <span className="text-[11px] text-emerald-600 font-bold">100%</span>
                                                ) : <span className="text-[11px] text-gray-300">-</span>}
                                            </td>
                                            <td className="py-2.5 pr-3 text-[11px] text-gray-500">{job.startedAt ? formatDistanceToNow(new Date(job.startedAt), { addSuffix: true }) : "-"}</td>
                                            <td className="py-2.5 pr-3 text-right">
                                                <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Link href={`/admin/jobs/${job.id}`} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Details"><Eye className="w-3.5 h-3.5" /></Link>
                                                    {job.status === "failed" && <button onClick={() => handleJobAction(job.id, "retry")} className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Retry"><RotateCcw className="w-3.5 h-3.5" /></button>}
                                                    {(job.status === "running" || job.status === "pending") && <button onClick={() => handleJobAction(job.id, "cancel")} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Cancel"><XCircle className="w-3.5 h-3.5" /></button>}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}</tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {jobsData && (
                        <div className="px-4 py-2.5 border-t border-gray-100 flex items-center justify-between bg-gray-50/30 text-xs">
                            <span className="text-[11px] text-gray-400 font-medium">
                                {Math.min((jobsData.pagination.page - 1) * jobsData.pagination.limit + 1, jobsData.pagination.total)}–{Math.min(jobsData.pagination.page * jobsData.pagination.limit, jobsData.pagination.total)} of {jobsData.pagination.total}
                            </span>
                            <div className="flex items-center gap-1">
                                <button disabled={jobsData.pagination.page <= 1} onClick={() => setPage(p => p - 1)}
                                    className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 transition-colors"><ChevronLeft className="w-3.5 h-3.5 text-gray-500" /></button>
                                <span className="px-2 text-[11px] font-bold text-gray-700">Page {jobsData.pagination.page}</span>
                                <button disabled={jobsData.pagination.page >= jobsData.pagination.totalPages} onClick={() => setPage(p => p + 1)}
                                    className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 transition-colors"><ChevronRight className="w-3.5 h-3.5 text-gray-500" /></button>
                            </div>
                        </div>
                    )}
                </div>
            </>) : (
                /* Scheduled Jobs Tab */
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-bold text-gray-900">Scheduled Jobs</h2>
                        <button onClick={() => setShowAddSchedule(!showAddSchedule)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors">
                            {showAddSchedule ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                            {showAddSchedule ? "Cancel" : "Add Schedule"}
                        </button>
                    </div>

                    {/* Add New Schedule Form */}
                    {showAddSchedule && (
                        <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
                            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2"><CalendarClock className="w-4 h-4 text-indigo-500" />New Scheduled Job</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Job Name <span className="text-red-500">*</span></label>
                                    <input type="text" value={scheduleForm.name} onChange={e => setScheduleForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g., Daily Rank Recalc" className={inputCls} />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Job Type</label>
                                    <select value={scheduleForm.jobType} onChange={e => setScheduleForm(p => ({ ...p, jobType: e.target.value }))} className={inputCls + " cursor-pointer"}>
                                        {jobTriggers.map(t => <option key={t.type} value={t.type}>{t.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Schedule (Cron)</label>
                                    <select value={scheduleForm.cronExpression} onChange={e => setScheduleForm(p => ({ ...p, cronExpression: e.target.value }))} className={inputCls + " cursor-pointer"}>
                                        {Object.entries(cronPresets).map(([cron, label]) => (<option key={cron} value={cron}>{label} ({cron})</option>))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Target Exam (Optional)</label>
                                    <select value={scheduleForm.examId} onChange={e => setScheduleForm(p => ({ ...p, examId: e.target.value }))} className={inputCls + " cursor-pointer"}>
                                        <option value="">All Exams</option>
                                        {(() => {
                                            const active = exams.filter((e: any) => e.isActive !== false && e.status !== "closed");
                                            const archived = exams.filter((e: any) => e.isActive === false || e.status === "closed");
                                            return (<>
                                                {active.length > 0 && <optgroup label="Active">{active.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</optgroup>}
                                                {archived.length > 0 && <optgroup label="Archived">{archived.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</optgroup>}
                                            </>);
                                        })()}
                                    </select>
                                </div>
                            </div>
                            <div className="flex justify-end">
                                <button onClick={handleCreateSchedule} disabled={scheduleAction.isPending}
                                    className="px-4 py-2 text-xs font-semibold text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50">
                                    {scheduleAction.isPending ? "Creating…" : "Create Schedule"}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Scheduled Jobs Table */}
                    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50/50">
                                    <th className="py-2.5 px-4 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Name</th>
                                    <th className="py-2.5 pr-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Type</th>
                                    <th className="py-2.5 pr-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Schedule</th>
                                    <th className="py-2.5 pr-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Next Run</th>
                                    <th className="py-2.5 pr-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Last Run</th>
                                    <th className="py-2.5 pr-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                                    <th className="py-2.5 pr-3 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody>{scheduledJobs?.length === 0 ? (
                                <tr><td colSpan={7} className="py-12 text-center text-xs text-gray-400">No scheduled jobs configured.</td></tr>
                            ) : (
                                scheduledJobs?.map((job: any) => (
                                    <tr key={job.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors group">
                                        <td className="py-2.5 px-4 font-bold text-xs text-gray-900">{job.name}</td>
                                        <td className="py-2.5 pr-3 text-xs font-semibold text-gray-600 capitalize">{job.jobType.replace(/_/g, " ")}</td>
                                        <td className="py-2.5 pr-3">
                                            <span className="text-[10px] font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">{job.cronExpression}</span>
                                            {cronPresets[job.cronExpression] && <span className="text-[10px] text-gray-400 block mt-0.5">{cronPresets[job.cronExpression]}</span>}
                                        </td>
                                        <td className="py-2.5 pr-3 text-[11px] text-gray-500">{job.nextRunAt ? formatDistanceToNow(new Date(job.nextRunAt), { addSuffix: true }) : "-"}</td>
                                        <td className="py-2.5 pr-3 text-[11px] text-gray-500">{job.lastRunAt ? formatDistanceToNow(new Date(job.lastRunAt), { addSuffix: true }) : "Never"}</td>
                                        <td className="py-2.5 pr-3">
                                            <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold",
                                                job.isEnabled ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500")}>
                                                <span className={cn("w-1.5 h-1.5 rounded-full", job.isEnabled ? "bg-emerald-500" : "bg-gray-400")} />
                                                {job.isEnabled ? "Active" : "Disabled"}
                                            </span>
                                        </td>
                                        <td className="py-2.5 pr-3 text-right">
                                            <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleToggleSchedule(job.id, job.isEnabled)}
                                                    className={cn("p-1.5 rounded-lg transition-colors", job.isEnabled ? "text-amber-500 hover:bg-amber-50" : "text-emerald-500 hover:bg-emerald-50")}
                                                    title={job.isEnabled ? "Disable" : "Enable"}>
                                                    {job.isEnabled ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                                                </button>
                                                <button onClick={() => handleDeleteSchedule(job.id)}
                                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}</tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
