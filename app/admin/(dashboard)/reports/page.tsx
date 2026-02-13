"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
    Download, Users, BarChart3, Shield, Clock, CheckCircle,
    AlertTriangle, X, FileSpreadsheet,
    Loader2, TrendingUp, Database, FileJson, Activity
} from "lucide-react";
import { useExamOptions } from "@/hooks/admin/use-submissions";

/* ─── Types ─── */
interface ReportType {
    id: string;
    title: string;
    description: string;
    icon: any;
    color: string;
    bgColor: string;
    apiType: string;
    formats: ("csv" | "json")[];
    requiresExam: boolean;
    category: "data" | "analytics" | "system";
}

interface GeneratedReport {
    id: string;
    type: string;
    title: string;
    examName?: string;
    format: string;
    generatedAt: string;
    status: "completed" | "failed";
    size?: string;
}

/* ─── Report definitions ─── */
const REPORT_TYPES: ReportType[] = [
    {
        id: "exam_summary",
        title: "Exam Results Summary",
        description: "Full results with scores, ranks, percentiles, and category breakdown for each candidate.",
        icon: Users,
        color: "text-blue-600",
        bgColor: "bg-blue-50",
        apiType: "exam_summary",
        formats: ["csv"],
        requiresExam: false,
        category: "data",
    },
    {
        id: "category_performance",
        title: "Category Performance",
        description: "Aggregate statistics by reservation category — average, min, max scores and candidate count.",
        icon: BarChart3,
        color: "text-violet-600",
        bgColor: "bg-violet-50",
        apiType: "category_performance",
        formats: ["csv"],
        requiresExam: false,
        category: "analytics",
    },
    {
        id: "system_logs",
        title: "System Logs Export",
        description: "Export all system logs with timestamps, levels, components, and request context.",
        icon: Activity,
        color: "text-emerald-600",
        bgColor: "bg-emerald-50",
        apiType: "system_logs",
        formats: ["csv", "json"],
        requiresExam: false,
        category: "system",
    },
    {
        id: "audit_trail",
        title: "Audit Trail",
        description: "Administrative action history with user, timestamp, entity, and change details.",
        icon: Shield,
        color: "text-amber-600",
        bgColor: "bg-amber-50",
        apiType: "audit_trail",
        formats: ["csv", "json"],
        requiresExam: false,
        category: "system",
    },
];

/* ─── Main Page ─── */
export default function ReportsPage() {
    // Queries
    const { data: examsData } = useExamOptions();
    const exams = examsData || [];

    // State
    const [selectedExam, setSelectedExam] = useState<number | null>(null);
    const [generatingId, setGeneratingId] = useState<string | null>(null);
    const [reportHistory, setReportHistory] = useState<GeneratedReport[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>("all");
    const [error, setError] = useState<string | null>(null);

    /* ── Generate report ── */
    const generateReport = async (report: ReportType, fmt: "csv" | "json") => {
        setGeneratingId(report.id + "_" + fmt);
        setError(null);

        try {
            let blob: Blob;
            let filename: string;

            if (report.apiType === "system_logs") {
                // Use the logs export endpoint
                const params = new URLSearchParams({ format: fmt });
                const res = await fetch(`/api/admin/logs/export?${params}`);
                if (!res.ok) throw new Error("Failed to export logs");
                blob = await res.blob();
                filename = `system_logs_${Date.now()}.${fmt}`;
            } else if (report.apiType === "audit_trail") {
                // Use the audit logs endpoint 
                const res = await fetch(`/api/admin/audit-logs?limit=10000`);
                if (!res.ok) throw new Error("Failed to export audit logs");
                const data = await res.json();
                const logs = data.logs || [];

                if (fmt === "json") {
                    blob = new Blob([JSON.stringify(logs, null, 2)], { type: "application/json" });
                } else {
                    // CSV
                    const headers = ["Timestamp", "Admin", "Action", "Entity", "Entity ID", "IP"];
                    const rows = logs.map((l: any) => [
                        l.timestamp ? format(new Date(l.timestamp), "yyyy-MM-dd HH:mm:ss") : "",
                        `"${l.adminUser?.name || "Unknown"}"`,
                        l.action,
                        l.entity,
                        l.entityId,
                        l.ip || "",
                    ].join(","));
                    blob = new Blob([headers.join(",") + "\n" + rows.join("\n")], { type: "text/csv" });
                }
                filename = `audit_trail_${Date.now()}.${fmt}`;
            } else {
                // Use the reports generate endpoint
                const body: any = { reportType: report.apiType };
                if (selectedExam) body.examId = selectedExam;

                const res = await fetch("/api/admin/reports/generate", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body),
                });

                if (!res.ok) {
                    const err = await res.json().catch(() => ({ error: "Export failed" }));
                    throw new Error(err.error || "Export failed");
                }

                blob = await res.blob();
                filename = `${report.apiType}_${selectedExam || "all"}_${Date.now()}.csv`;
            }

            // Download
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            // Add to history
            const examName = selectedExam ? exams.find(e => e.id === selectedExam)?.name : "All Exams";
            setReportHistory(prev => [{
                id: Date.now().toString(),
                type: report.id,
                title: report.title,
                examName: examName || undefined,
                format: fmt.toUpperCase(),
                generatedAt: new Date().toISOString(),
                status: "completed" as const,
                size: `${(blob.size / 1024).toFixed(1)} KB`,
            }, ...prev].slice(0, 20));

        } catch (err: any) {
            setError(err.message || "Failed to generate report");
            setReportHistory(prev => [{
                id: Date.now().toString(),
                type: report.id,
                title: report.title,
                format: fmt.toUpperCase(),
                generatedAt: new Date().toISOString(),
                status: "failed" as const,
            }, ...prev].slice(0, 20));
        } finally {
            setGeneratingId(null);
        }
    };

    const filteredReports = selectedCategory === "all"
        ? REPORT_TYPES
        : REPORT_TYPES.filter(r => r.category === selectedCategory);

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto pb-20">

            {/* ── Header ── */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Reports</h1>
                    <p className="text-gray-500 text-sm mt-1">Generate, download, and manage data exports.</p>
                </div>
            </div>

            {/* ── Config bar ── */}
            <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-wrap gap-3 items-center">
                {/* Exam selector */}
                <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Exam:</span>
                    <select
                        className="h-9 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-300 min-w-[200px]"
                        value={selectedExam || ""}
                        onChange={(e) => setSelectedExam(e.target.value ? parseInt(e.target.value) : null)}
                    >
                        <option value="">All Exams</option>
                        {exams.map(exam => (
                            <option key={exam.id} value={exam.id}>
                                {exam.name} {exam.year ? `(${exam.year})` : ""}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="w-px h-6 bg-gray-200" />

                {/* Category filter */}
                <div className="flex items-center gap-1.5">
                    {[
                        { key: "all", label: "All" },
                        { key: "data", label: "Data" },
                        { key: "analytics", label: "Analytics" },
                        { key: "system", label: "System" },
                    ].map((cat) => (
                        <button
                            key={cat.key}
                            onClick={() => setSelectedCategory(cat.key)}
                            className={cn(
                                "px-3 py-1.5 text-[11px] font-semibold rounded-lg transition-colors border",
                                selectedCategory === cat.key
                                    ? "bg-gray-900 text-white border-gray-900"
                                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                            )}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Error banner ── */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                        <span className="text-sm text-red-700">{error}</span>
                    </div>
                    <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* ── Report cards ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredReports.map((report) => (
                    <div key={report.id} className="bg-white rounded-xl border border-gray-100 p-5 hover:border-gray-200 hover:shadow-sm transition-all group">
                        <div className="flex items-start gap-4">
                            <div className={cn("p-2.5 rounded-xl flex-shrink-0", report.bgColor)}>
                                <report.icon className={cn("w-5 h-5", report.color)} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-base font-bold text-gray-900">{report.title}</h3>
                                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{report.description}</p>

                                {report.requiresExam && !selectedExam && (
                                    <p className="text-[10px] text-amber-600 font-medium mt-2 flex items-center gap-1">
                                        <AlertTriangle className="w-3 h-3" /> Select an exam above for filtered results
                                    </p>
                                )}

                                {/* Download buttons */}
                                <div className="flex items-center gap-2 mt-3">
                                    {report.formats.map(fmt => {
                                        const isGenerating = generatingId === `${report.id}_${fmt}`;
                                        return (
                                            <button
                                                key={fmt}
                                                disabled={isGenerating}
                                                onClick={() => generateReport(report, fmt)}
                                                className={cn(
                                                    "h-8 px-3 text-xs font-semibold rounded-lg border flex items-center gap-1.5 transition-all",
                                                    isGenerating
                                                        ? "bg-gray-100 text-gray-400 border-gray-200 cursor-wait"
                                                        : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                                                )}
                                            >
                                                {isGenerating ? (
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                ) : fmt === "csv" ? (
                                                    <FileSpreadsheet className="w-3.5 h-3.5" />
                                                ) : (
                                                    <FileJson className="w-3.5 h-3.5" />
                                                )}
                                                {isGenerating ? "Generating..." : `Export ${fmt.toUpperCase()}`}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Report History ── */}
            {reportHistory.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
                        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-400" />
                            Recent Exports
                        </h3>
                        <button
                            onClick={() => setReportHistory([])}
                            className="text-[10px] text-gray-400 hover:text-gray-600 font-medium"
                        >
                            Clear
                        </button>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {reportHistory.map((item) => (
                            <div key={item.id} className="px-5 py-3 flex items-center gap-4">
                                <div className={cn(
                                    "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                                    item.status === "completed" ? "bg-emerald-50" : "bg-red-50"
                                )}>
                                    {item.status === "completed" ? (
                                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                                    ) : (
                                        <AlertTriangle className="w-4 h-4 text-red-500" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                                    <p className="text-[10px] text-gray-400 mt-0.5">
                                        {item.examName && <span>{item.examName} · </span>}
                                        {format(new Date(item.generatedAt), "MMM d, HH:mm:ss")}
                                    </p>
                                </div>
                                <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                                    {item.format}
                                </span>
                                {item.size && (
                                    <span className="text-[10px] text-gray-400 font-mono">{item.size}</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
