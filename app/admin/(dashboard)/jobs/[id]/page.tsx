"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import {
    ArrowLeft, Info, BarChart3, Settings, AlertTriangle,
    RefreshCw, RotateCcw, XCircle, CheckCircle2, Clock,
    Hash, User, Timer, Layers, Activity, SearchX,
} from "lucide-react";

interface Job {
    id: number; jobName: string; jobType: string;
    status: "pending" | "running" | "success" | "failed";
    scheduledAt: string | null; startedAt: string | null; completedAt: string | null;
    totalRecords: number | null; recordsProcessed: number; progressPercent: number;
    errorMessage: string | null; errorStack: string | null; metadata: any; triggeredBy: string;
}

const statusCfg: Record<string, { bg: string; text: string; dot: string; label: string }> = {
    pending: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500", label: "Queued" },
    running: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500", label: "Running" },
    success: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", label: "Completed" },
    failed: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500", label: "Failed" },
};

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [job, setJob] = useState<Job | null>(null);
    const [loading, setLoading] = useState(true);
    const [retrying, setRetrying] = useState(false);

    useEffect(() => {
        fetchJob();
        const interval = setInterval(() => { if (job?.status === "running") fetchJob(); }, 3000);
        return () => clearInterval(interval);
    }, [id, job?.status]);

    async function fetchJob() {
        try { const res = await fetch(`/api/admin/jobs/${id}`); const data = await res.json(); setJob(data.job); }
        catch (e) { console.error(e); }
        finally { setLoading(false); }
    }

    const handleAction = async (action: "retry" | "cancel") => {
        if (!confirm(`Are you sure you want to ${action} this job?`)) return;
        if (action === "retry") setRetrying(true);
        try { await fetch(`/api/admin/jobs/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) }); fetchJob(); }
        catch { alert(`${action} failed`); }
        finally { setRetrying(false); }
    };

    const getDuration = () => {
        if (!job?.startedAt) return "-";
        const ms = (job.completedAt ? new Date(job.completedAt).getTime() : Date.now()) - new Date(job.startedAt).getTime();
        const secs = Math.floor(ms / 1000);
        if (secs < 60) return `${secs} seconds`;
        return `${Math.floor(secs / 60)}m ${secs % 60}s`;
    };

    const formatTS = (ts: string | null) => ts ? format(new Date(ts), "MMM d, yyyy HH:mm:ss") : "-";

    if (loading) return (
        <div className="flex items-center justify-center min-h-[400px]">
            <RefreshCw className="w-6 h-6 text-gray-300 animate-spin" />
        </div>
    );

    if (!job) return (
        <div className="text-center py-20">
            <SearchX className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-500">Job not found.</p>
            <Link href="/admin/jobs" className="text-indigo-600 font-bold text-xs mt-2 inline-block">← Back to Jobs</Link>
        </div>
    );

    const cfg = statusCfg[job.status] || statusCfg.pending;

    const InfoRow = ({ label, value, mono }: { label: string; value: string; mono?: boolean }) => (
        <div className="flex justify-between py-2 border-b border-gray-50 last:border-b-0">
            <span className="text-[11px] text-gray-400 font-medium">{label}</span>
            <span className={cn("text-[11px] font-semibold text-gray-700", mono && "font-mono")}>{value}</span>
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto space-y-4 pb-10">
            {/* Header */}
            <div className="flex items-start gap-3">
                <Link href="/admin/jobs" className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors mt-0.5">
                    <ArrowLeft className="w-4 h-4 text-gray-500" />
                </Link>
                <div className="flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                        <h1 className="text-lg font-bold text-gray-900">{job.jobName}</h1>
                        <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold capitalize", cfg.bg, cfg.text)}>
                            <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />{cfg.label}
                        </span>
                    </div>
                    <p className="text-[11px] text-gray-400 font-mono mt-0.5">Job #{job.id}</p>
                </div>
                <div className="flex gap-1.5">
                    {job.status === "failed" && (
                        <button onClick={() => handleAction("retry")} disabled={retrying}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-700 font-semibold rounded-lg hover:border-amber-300 transition-all text-xs disabled:opacity-50">
                            <RotateCcw className="w-3.5 h-3.5" />{retrying ? "Retrying…" : "Retry"}
                        </button>
                    )}
                    {(job.status === "running" || job.status === "pending") && (
                        <button onClick={() => handleAction("cancel")}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-200 text-red-700 font-semibold rounded-lg hover:border-red-300 transition-all text-xs">
                            <XCircle className="w-3.5 h-3.5" />Cancel
                        </button>
                    )}
                </div>
            </div>

            {/* Progress Bar (if running) */}
            {job.status === "running" && (
                <div className="bg-blue-50 rounded-xl border border-blue-200 p-3.5">
                    <div className="flex justify-between text-xs font-semibold mb-1.5">
                        <span className="text-blue-700 flex items-center gap-1.5"><RefreshCw className="w-3 h-3 animate-spin" />Processing…</span>
                        <span className="text-blue-900">{job.progressPercent}%</span>
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full transition-all duration-500" style={{ width: `${job.progressPercent}%` }} />
                    </div>
                    <p className="text-[10px] text-blue-600 mt-1.5 font-medium">{job.recordsProcessed || 0} of {job.totalRecords || "unknown"} records processed</p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Job Information */}
                <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-1">
                    <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2 mb-3"><Info className="w-4 h-4 text-indigo-500" />Job Information</h2>
                    <InfoRow label="Job ID" value={`#${job.id}`} mono />
                    <InfoRow label="Job Type" value={job.jobType.replace(/_/g, " ")} />
                    <InfoRow label="Triggered By" value={job.triggeredBy || "System"} />
                    <InfoRow label="Created" value={job.scheduledAt ? formatTS(job.scheduledAt) : "-"} mono />
                    <InfoRow label="Started" value={formatTS(job.startedAt)} mono />
                    <InfoRow label="Completed" value={formatTS(job.completedAt)} mono />
                    <InfoRow label="Duration" value={getDuration()} />
                </div>

                {/* Execution Details */}
                <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-1">
                    <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2 mb-3"><Activity className="w-4 h-4 text-blue-500" />Execution Details</h2>
                    <InfoRow label="Total Records" value={String(job.totalRecords ?? "-")} mono />
                    <InfoRow label="Records Processed" value={String(job.recordsProcessed ?? "-")} mono />
                    <InfoRow label="Progress" value={`${job.progressPercent}%`} />

                    {job.status === "success" && job.metadata && (
                        <div className="mt-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                            <h3 className="text-[10px] font-bold text-emerald-700 uppercase mb-1">Results</h3>
                            <p className="text-xs text-emerald-800 font-medium">{job.recordsProcessed || 0} records processed successfully.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Configuration / Metadata */}
            {job.metadata && Object.keys(job.metadata).length > 0 && (
                <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
                    <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2"><Settings className="w-4 h-4 text-amber-500" />Configuration</h2>
                    <pre className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-[11px] font-mono text-gray-700 overflow-auto max-h-60 whitespace-pre-wrap">
                        {JSON.stringify(job.metadata, null, 2)}
                    </pre>
                </div>
            )}

            {/* Error Information */}
            {job.status === "failed" && (
                <div className="bg-red-50 rounded-xl border border-red-200 p-5 space-y-3">
                    <h2 className="text-sm font-bold text-red-800 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-red-500" />Error Information</h2>
                    {job.errorMessage && (
                        <div className="p-2.5 bg-white border border-red-200 rounded-lg">
                            <h3 className="text-[10px] font-bold text-red-600 uppercase mb-1">Error Message</h3>
                            <p className="text-xs text-red-800 font-medium">{job.errorMessage}</p>
                        </div>
                    )}
                    {job.errorStack && (
                        <div>
                            <h3 className="text-[10px] font-bold text-red-600 uppercase mb-1">Stack Trace</h3>
                            <pre className="bg-white border border-red-200 rounded-lg p-3 text-[11px] font-mono text-red-700 overflow-auto max-h-60 whitespace-pre-wrap">
                                {job.errorStack}
                            </pre>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
