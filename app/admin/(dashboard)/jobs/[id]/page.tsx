"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";

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
    errorStack: string | null;
    metadata: any;
    triggeredBy: string;
}

const statusConfig: Record<string, { color: string; bg: string; icon: string; label: string }> = {
    pending: { color: "text-amber-700", bg: "bg-amber-50 border-amber-200", icon: "hourglass_empty", label: "Queued" },
    running: { color: "text-blue-700", bg: "bg-blue-50 border-blue-200", icon: "sync", label: "Running" },
    success: { color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", icon: "check_circle", label: "Completed" },
    failed: { color: "text-red-700", bg: "bg-red-50 border-red-200", icon: "error", label: "Failed" },
};

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [job, setJob] = useState<Job | null>(null);
    const [loading, setLoading] = useState(true);
    const [retrying, setRetrying] = useState(false);

    useEffect(() => {
        fetchJob();
        // Poll if running
        const interval = setInterval(() => {
            if (job?.status === "running") fetchJob();
        }, 3000);
        return () => clearInterval(interval);
    }, [id, job?.status]);

    async function fetchJob() {
        try {
            const res = await fetch(`/api/admin/jobs/${id}`);
            const data = await res.json();
            setJob(data.job);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }

    const handleAction = async (action: "retry" | "cancel") => {
        if (!confirm(`Are you sure you want to ${action} this job?`)) return;
        if (action === "retry") setRetrying(true);
        try {
            await fetch(`/api/admin/jobs/${id}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action }),
            });
            fetchJob();
        } catch { alert(`${action} failed`); }
        finally { setRetrying(false); }
    };

    const getDuration = () => {
        if (!job?.startedAt) return "-";
        const start = new Date(job.startedAt).getTime();
        const end = job.completedAt ? new Date(job.completedAt).getTime() : Date.now();
        const ms = end - start;
        const secs = Math.floor(ms / 1000);
        if (secs < 60) return `${secs} seconds`;
        const mins = Math.floor(secs / 60);
        const remSecs = secs % 60;
        return `${mins}m ${remSecs}s`;
    };

    const formatTS = (ts: string | null) => {
        if (!ts) return "-";
        return format(new Date(ts), "MMM d, yyyy HH:mm:ss");
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-[400px]">
            <span className="material-symbols-outlined text-4xl text-gray-400 animate-spin">progress_activity</span>
        </div>
    );

    if (!job) return (
        <div className="text-center py-20">
            <span className="material-symbols-outlined text-5xl text-gray-300 mb-4 block">search_off</span>
            <p className="text-gray-500 font-medium">Job not found.</p>
            <Link href="/admin/jobs" className="text-[#7C3AED] font-bold mt-2 inline-block">← Back to Jobs</Link>
        </div>
    );

    const cfg = statusConfig[job.status] || statusConfig.pending;

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-10">
            {/* Header */}
            <div className="flex items-start gap-4">
                <Link href="/admin/jobs" className="w-10 h-10 flex items-center justify-center rounded-xl border-2 border-gray-200 hover:border-gray-900 transition-all mt-1">
                    <span className="material-symbols-outlined">arrow_back</span>
                </Link>
                <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{job.jobName}</h1>
                        <span className={cn("inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase border", cfg.bg, cfg.color)}>
                            <span className="material-symbols-outlined text-sm">{cfg.icon}</span>
                            {cfg.label}
                        </span>
                    </div>
                    <p className="text-gray-500 text-sm font-mono mt-1">Job #{job.id}</p>
                </div>
                <div className="flex gap-2">
                    {job.status === "failed" && (
                        <button onClick={() => handleAction("retry")} disabled={retrying}
                            className="flex items-center gap-2 px-4 py-2 bg-amber-50 border-2 border-amber-200 text-amber-700 font-bold rounded-xl hover:border-amber-400 transition-all text-sm disabled:opacity-50">
                            <span className="material-symbols-outlined text-lg">replay</span>
                            {retrying ? "Retrying..." : "Retry"}
                        </button>
                    )}
                    {(job.status === "running" || job.status === "pending") && (
                        <button onClick={() => handleAction("cancel")}
                            className="flex items-center gap-2 px-4 py-2 bg-red-50 border-2 border-red-200 text-red-700 font-bold rounded-xl hover:border-red-400 transition-all text-sm">
                            <span className="material-symbols-outlined text-lg">cancel</span>
                            Cancel
                        </button>
                    )}
                </div>
            </div>

            {/* Progress Bar (if running) */}
            {job.status === "running" && (
                <div className="card-base p-4 bg-blue-50 border-blue-200">
                    <div className="flex justify-between text-sm font-bold mb-2">
                        <span className="text-blue-700">Processing...</span>
                        <span className="text-blue-900">{job.progressPercent}%</span>
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-3">
                        <div className="bg-blue-600 h-3 rounded-full transition-all duration-500" style={{ width: `${job.progressPercent}%` }}></div>
                    </div>
                    <p className="text-xs text-blue-600 mt-2 font-medium">
                        {job.recordsProcessed || 0} of {job.totalRecords || "unknown"} records processed
                    </p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Job Information */}
                <div className="card-base p-6 bg-white space-y-4">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#A78BFA]">info</span>
                        Job Information
                    </h2>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between py-2 border-b border-gray-100">
                            <span className="text-gray-500 font-medium">Job ID</span>
                            <span className="font-bold font-mono text-gray-900">#{job.id}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-100">
                            <span className="text-gray-500 font-medium">Job Type</span>
                            <span className="font-bold text-gray-900 capitalize">{job.jobType.replace(/_/g, " ")}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-100">
                            <span className="text-gray-500 font-medium">Triggered By</span>
                            <span className="font-bold text-gray-900 capitalize">{job.triggeredBy || "System"}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-100">
                            <span className="text-gray-500 font-medium">Created</span>
                            <span className="font-mono text-gray-700 text-xs">{job.scheduledAt ? formatTS(job.scheduledAt) : "-"}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-100">
                            <span className="text-gray-500 font-medium">Started</span>
                            <span className="font-mono text-gray-700 text-xs">{formatTS(job.startedAt)}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-100">
                            <span className="text-gray-500 font-medium">Completed</span>
                            <span className="font-mono text-gray-700 text-xs">{formatTS(job.completedAt)}</span>
                        </div>
                        <div className="flex justify-between py-2">
                            <span className="text-gray-500 font-medium">Duration</span>
                            <span className="font-bold text-gray-900">{getDuration()}</span>
                        </div>
                    </div>
                </div>

                {/* Execution Details */}
                <div className="card-base p-6 bg-white space-y-4">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <span className="material-symbols-outlined text-blue-500">monitoring</span>
                        Execution Details
                    </h2>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between py-2 border-b border-gray-100">
                            <span className="text-gray-500 font-medium">Total Records</span>
                            <span className="font-bold font-mono text-gray-900">{job.totalRecords ?? "-"}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-100">
                            <span className="text-gray-500 font-medium">Records Processed</span>
                            <span className="font-bold font-mono text-gray-900">{job.recordsProcessed ?? "-"}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-100">
                            <span className="text-gray-500 font-medium">Progress</span>
                            <span className="font-bold text-gray-900">{job.progressPercent}%</span>
                        </div>
                    </div>

                    {/* Results Summary */}
                    {job.status === "success" && job.metadata && (
                        <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                            <h3 className="text-xs font-bold text-emerald-700 uppercase mb-2">Results</h3>
                            <p className="text-sm text-emerald-800 font-medium">
                                {job.recordsProcessed || 0} records processed successfully.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Configuration / Metadata */}
            {job.metadata && Object.keys(job.metadata).length > 0 && (
                <div className="card-base p-6 bg-white space-y-4">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <span className="material-symbols-outlined text-amber-500">settings</span>
                        Configuration
                    </h2>
                    <pre className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs font-mono text-gray-700 overflow-auto max-h-60 whitespace-pre-wrap">
                        {JSON.stringify(job.metadata, null, 2)}
                    </pre>
                </div>
            )}

            {/* Error Information */}
            {job.status === "failed" && (
                <div className="card-base p-6 bg-red-50 border-red-200 space-y-4">
                    <h2 className="text-lg font-bold text-red-800 flex items-center gap-2">
                        <span className="material-symbols-outlined text-red-500">error</span>
                        Error Information
                    </h2>
                    {job.errorMessage && (
                        <div className="p-3 bg-white border border-red-200 rounded-xl">
                            <h3 className="text-xs font-bold text-red-600 uppercase mb-1">Error Message</h3>
                            <p className="text-sm text-red-800 font-medium">{job.errorMessage}</p>
                        </div>
                    )}
                    {job.errorStack && (
                        <div>
                            <h3 className="text-xs font-bold text-red-600 uppercase mb-1">Stack Trace</h3>
                            <pre className="bg-white border border-red-200 rounded-xl p-4 text-xs font-mono text-red-700 overflow-auto max-h-60 whitespace-pre-wrap">
                                {job.errorStack}
                            </pre>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
