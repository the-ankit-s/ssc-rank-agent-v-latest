"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, Pencil, Copy, Archive, ArchiveRestore, Eye, Loader2, Users, Clock, Award, BarChart3, FileText, TrendingUp, ExternalLink, CheckCircle2, XCircle, Star, Layers, Timer, Calculator, Activity, ChevronRight, Info, AlertTriangle, ToggleLeft, ToggleRight, Save, RefreshCw } from "lucide-react";
import { Dialog, StatCard, InfoRow, StatusBadge, PhaseBadge, SectionCard } from "@/components/admin/ui";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Exam {
    id: number; name: string; slug: string; agency: string; year: number;
    tier: string | null; status: string; isActive: boolean; totalMarks: number;
    totalQuestions: number; duration: number; defaultPositive: number;
    defaultNegative: number; hasNormalization: boolean; hasSectionalTiming: boolean;
    isFeatured: boolean; totalSubmissions: number; totalShifts: number;
    analysisPhase?: string; sectionConfig: Record<string, any>;
    examStartDate: string | null; examEndDate: string | null;
    answerKeyUrl: string | null; officialWebsite: string | null;
    normalizationMethod?: string; createdAt: string; updatedAt?: string;
}

// ─── Toggle Switch ──────────────────────────────────────────────────────────

function Toggle({ checked, onChange, disabled, label }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; label?: string }) {
    return (
        <button type="button" disabled={disabled} onClick={() => onChange(!checked)}
            className={cn("relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-violet-200 disabled:opacity-50 disabled:cursor-not-allowed",
                checked ? "bg-violet-500" : "bg-gray-300")}>
            <span className={cn("inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform",
                checked ? "translate-x-[18px]" : "translate-x-[3px]")} />
        </button>
    );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function ExamDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const examId = params.id as string;
    const [exam, setExam] = useState<Exam | null>(null);
    const [stats, setStats] = useState({ shifts: 0, submissions: 0 });
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("overview");

    // Analytics
    const [analyticsData, setAnalyticsData] = useState<any>(null);
    const [loadingAnalytics, setLoadingAnalytics] = useState(false);
    const [analyticsError, setAnalyticsError] = useState<string | null>(null);

    // Archive
    const [archiveInfo, setArchiveInfo] = useState<any>(null);
    const [archiving, setArchiving] = useState(false);
    const [restoring, setRestoring] = useState(false);

    // Quick edit
    const [quickSaving, setQuickSaving] = useState(false);
    const [quickEdits, setQuickEdits] = useState<Record<string, any>>({});
    const hasQuickEdits = Object.keys(quickEdits).length > 0;

    // Modal
    const [modal, setModal] = useState<"archive" | "restore" | "result" | "duplicate" | null>(null);
    const [modalResult, setModalResult] = useState<{ success: boolean; message: string; details?: string } | null>(null);

    // ── Fetchers ─────────────────────────────────────────────────────────────

    const fetchExam = useCallback(async () => {
        try {
            const res = await fetch(`/api/admin/exams/${examId}`);
            const data = await res.json();
            setExam(data.exam);
            setStats(data.stats || { shifts: 0, submissions: 0 });
        } catch (e) { console.error("Fetch exam error:", e); }
        finally { setLoading(false); }
    }, [examId]);

    async function fetchAnalytics() {
        setLoadingAnalytics(true);
        setAnalyticsError(null);
        try {
            const res = await fetch(`/api/admin/exams/${examId}/analytics`);
            if (!res.ok) throw new Error(res.status === 401 ? "Unauthorized" : "Failed to load");
            const data = await res.json();
            if (data.analytics) setAnalyticsData(data.analytics);
            else setAnalyticsError("No analytics data available yet.");
        } catch (err: any) { setAnalyticsError(err.message || "Failed to load analytics"); }
        finally { setLoadingAnalytics(false); }
    }

    async function checkArchive() {
        try {
            const res = await fetch(`/api/admin/exams/${examId}/archive`);
            const data = await res.json();
            setArchiveInfo(data.archive);
        } catch { }
    }

    useEffect(() => { if (examId) { fetchExam(); checkArchive(); } }, [examId, fetchExam]);
    useEffect(() => { if (activeTab === "analytics" && !analyticsData) fetchAnalytics(); }, [activeTab]);

    // ── Quick Edit ───────────────────────────────────────────────────────────

    const setQuickEdit = (field: string, value: any) => {
        setQuickEdits(prev => {
            // If value is same as original, remove the edit
            if (exam && (exam as any)[field] === value) {
                const { [field]: _, ...rest } = prev;
                return rest;
            }
            return { ...prev, [field]: value };
        });
    };

    const getFieldValue = (field: string) => {
        if (field in quickEdits) return quickEdits[field];
        return exam ? (exam as any)[field] : undefined;
    };

    const saveQuickEdits = async () => {
        if (!hasQuickEdits) return;
        setQuickSaving(true);
        try {
            const res = await fetch(`/api/admin/exams/${examId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(quickEdits),
            });
            if (res.ok) {
                setQuickEdits({});
                fetchExam();
                setModalResult({ success: true, message: "Changes saved!" });
                setModal("result");
            } else {
                setModalResult({ success: false, message: "Save failed" });
                setModal("result");
            }
        } catch { setModalResult({ success: false, message: "Save failed" }); setModal("result"); }
        finally { setQuickSaving(false); }
    };

    const discardQuickEdits = () => setQuickEdits({});

    // ── Actions ──────────────────────────────────────────────────────────────

    const confirmArchive = async () => {
        setModal(null); setArchiving(true);
        try {
            const res = await fetch(`/api/admin/exams/${examId}/archive`, { method: "POST" });
            const data = await res.json();
            if (data.success) {
                setModalResult({ success: true, message: "Exam archived!", details: `${data.archive.submissionsArchived?.toLocaleString()} submissions → ${data.archive.fileSizeMB} MB file` });
                fetchExam(); checkArchive();
            } else setModalResult({ success: false, message: "Archive failed", details: data.error });
        } catch { setModalResult({ success: false, message: "Archive request failed" }); }
        finally { setArchiving(false); setModal("result"); }
    };

    const confirmRestore = async () => {
        setModal(null); setRestoring(true);
        try {
            const res = await fetch(`/api/admin/exams/${examId}/restore`, { method: "POST" });
            const data = await res.json();
            if (data.success) {
                setModalResult({ success: true, message: "Restored!", details: `${data.submissionsRestored?.toLocaleString()} submissions re-imported` });
                fetchExam(); setArchiveInfo(null);
            } else setModalResult({ success: false, message: "Restore failed", details: data.error });
        } catch { setModalResult({ success: false, message: "Restore request failed" }); }
        finally { setRestoring(false); setModal("result"); }
    };

    const handleDuplicate = async () => {
        setModal(null);
        try {
            const res = await fetch(`/api/admin/exams/${examId}/duplicate`, { method: "POST" });
            const data = await res.json();
            if (res.ok) setModalResult({ success: true, message: "Exam duplicated!", details: data.exam ? `New exam ID: ${data.exam.id}` : undefined });
            else setModalResult({ success: false, message: "Duplicate failed" });
        } catch { setModalResult({ success: false, message: "Duplicate request failed" }); }
        setModal("result");
    };

    // ── Loading & Error ──────────────────────────────────────────────────────

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-96 gap-3">
            <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
            <p className="text-sm text-gray-400 font-medium">Loading exam…</p>
        </div>
    );

    if (!exam) return (
        <div className="text-center py-16">
            <XCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Exam not found</p>
            <Link href="/admin/exams" className="text-violet-600 text-sm font-bold mt-2 inline-block hover:underline">← Back to exams</Link>
        </div>
    );

    const isProcessing = archiving || restoring;
    const canArchive = (!exam.isActive || exam.status === "closed") && !archiveInfo?.exists && stats.submissions > 0;
    const sections = Object.entries(exam.sectionConfig || {});

    const tabs = [
        { id: "overview", label: "Overview", icon: Info },
        { id: "quick-edit", label: "Quick Edit", icon: Pencil },
        { id: "shifts", label: "Shifts", icon: Clock },
        { id: "submissions", label: "Submissions", icon: FileText },
        { id: "analytics", label: "Analytics", icon: BarChart3 },
        { id: "cutoffs", label: "Cutoffs", icon: TrendingUp },
    ];

    return (
        <div className="space-y-5 max-w-[1400px] mx-auto pb-10">
            {/* ── Header ── */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                    <Link href="/admin/exams" className="mt-1 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors shrink-0">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-2xl font-black text-gray-900">{exam.name}</h1>
                            <StatusBadge status={getFieldValue("status")} />
                            {exam.analysisPhase && <PhaseBadge phase={exam.analysisPhase} />}
                            {getFieldValue("isFeatured") && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200 inline-flex items-center gap-0.5">
                                    <Star className="w-2.5 h-2.5" /> Featured
                                </span>
                            )}
                            {!getFieldValue("isActive") && (
                                <span className="text-[9px] uppercase font-extrabold bg-red-50 text-red-500 px-1.5 py-0.5 rounded border border-red-200">Inactive</span>
                            )}
                            {archiveInfo?.exists && (
                                <span className="text-[9px] uppercase font-extrabold bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded border border-amber-200 inline-flex items-center gap-0.5">
                                    <Archive className="w-2.5 h-2.5" /> {archiveInfo.fileSizeMB} MB
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-gray-500 mt-0.5">
                            {exam.agency} • {exam.year}{exam.tier ? ` • ${exam.tier}` : ""} • <span className="font-mono text-xs text-gray-400">/{exam.slug}</span>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    {canArchive && <button onClick={() => setModal("archive")} disabled={isProcessing} className="px-3 py-2 text-amber-600 bg-amber-50 border border-amber-200 rounded-xl text-xs font-bold hover:bg-amber-100 transition-colors disabled:opacity-40 flex items-center gap-1.5">
                        {archiving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Archive className="w-3.5 h-3.5" />} Archive
                    </button>}
                    {archiveInfo?.exists && (<>
                        <button onClick={() => setModal("restore")} disabled={isProcessing} className="px-3 py-2 text-green-600 bg-green-50 border border-green-200 rounded-xl text-xs font-bold hover:bg-green-100 transition-colors disabled:opacity-40 flex items-center gap-1.5">
                            {restoring ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArchiveRestore className="w-3.5 h-3.5" />} Restore
                        </button>
                        <a href={`/api/archive/${exam.slug}?type=summary`} target="_blank" className="px-3 py-2 text-blue-600 bg-blue-50 border border-blue-200 rounded-xl text-xs font-bold hover:bg-blue-100 transition-colors flex items-center gap-1.5">
                            <Eye className="w-3.5 h-3.5" /> View Data
                        </a>
                    </>)}
                    <button onClick={() => setModal("duplicate")} className="px-3 py-2 text-gray-600 bg-white border border-gray-200 rounded-xl text-xs font-bold hover:bg-gray-50 transition-colors flex items-center gap-1.5">
                        <Copy className="w-3.5 h-3.5" /> Duplicate
                    </button>
                    <Link href={`/admin/exams/${examId}/edit`} className="px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-gray-800 transition-colors flex items-center gap-1.5 shadow-lg shadow-gray-900/20">
                        <Pencil className="w-3.5 h-3.5" /> Full Edit
                    </Link>
                </div>
            </div>

            {/* ── Stats Cards ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard icon={Users} label="Submissions" value={stats.submissions.toLocaleString()} color="bg-blue-50 text-blue-600" />
                <StatCard icon={Layers} label="Shifts" value={stats.shifts} color="bg-violet-50 text-violet-600" />
                <StatCard icon={Award} label="Total Marks" value={exam.totalMarks} color="bg-emerald-50 text-emerald-600" />
                <StatCard icon={Timer} label="Duration" value={`${exam.duration} min`} color="bg-amber-50 text-amber-600" />
            </div>

            {/* ── Quick Edit Save Bar ── */}
            {hasQuickEdits && (
                <div className="bg-violet-50 border border-violet-200 rounded-xl p-3 flex items-center justify-between animate-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center gap-2 text-sm">
                        <div className="w-2 h-2 bg-violet-500 rounded-full animate-pulse" />
                        <span className="font-bold text-violet-800">Unsaved changes</span>
                        <span className="text-violet-600 text-xs">({Object.keys(quickEdits).length} field{Object.keys(quickEdits).length > 1 ? "s" : ""})</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={discardQuickEdits} className="px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-white border border-gray-200 rounded-lg transition-colors">Discard</button>
                        <button onClick={saveQuickEdits} disabled={quickSaving} className="px-4 py-1.5 bg-violet-600 text-white text-xs font-bold rounded-lg hover:bg-violet-700 transition-colors flex items-center gap-1.5 disabled:opacity-50">
                            {quickSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save
                        </button>
                    </div>
                </div>
            )}

            {/* ── Tabs ── */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="border-b border-gray-100 flex overflow-x-auto">
                    {tabs.map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                            className={cn("flex items-center gap-1.5 px-5 py-3 text-xs font-bold whitespace-nowrap transition-colors border-b-2",
                                activeTab === tab.id ? "border-violet-500 text-violet-700 bg-violet-50/50" : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                            )}>
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                            {tab.id === "quick-edit" && hasQuickEdits && <span className="w-1.5 h-1.5 bg-violet-500 rounded-full" />}
                        </button>
                    ))}
                </div>

                <div className="p-5">
                    {/* ── Overview Tab ── */}
                    {activeTab === "overview" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="bg-gray-50/50 rounded-xl p-4 border border-gray-100">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Basic Information</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <InfoRow label="Slug" value={exam.slug} mono />
                                    <InfoRow label="Agency" value={exam.agency} />
                                    <InfoRow label="Year" value={exam.year} />
                                    <InfoRow label="Tier" value={exam.tier || "—"} />
                                    <InfoRow label="Active" value={<span className={cn("text-sm font-bold", exam.isActive ? "text-emerald-600" : "text-red-500")}>{exam.isActive ? "Yes" : "No"}</span>} />
                                    <InfoRow label="Featured" value={<span className={cn("text-sm font-bold", exam.isFeatured ? "text-amber-600" : "text-gray-400")}>{exam.isFeatured ? "Yes" : "No"}</span>} />
                                </div>
                            </div>
                            <div className="bg-gray-50/50 rounded-xl p-4 border border-gray-100">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Configuration</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <InfoRow label="Total Questions" value={exam.totalQuestions} />
                                    <InfoRow label="Total Marks" value={exam.totalMarks} />
                                    <InfoRow label="+ve Marks" value={<span className="text-emerald-600 font-bold text-sm">+{exam.defaultPositive}</span>} />
                                    <InfoRow label="−ve Marks" value={<span className="text-red-500 font-bold text-sm">−{exam.defaultNegative}</span>} />
                                    <InfoRow label="Normalization" value={<span className={cn("text-sm font-bold", exam.hasNormalization ? "text-emerald-600" : "text-gray-400")}>{exam.hasNormalization ? "Enabled" : "Disabled"}</span>} />
                                    <InfoRow label="Sectional Timing" value={<span className={cn("text-sm font-bold", exam.hasSectionalTiming ? "text-emerald-600" : "text-gray-400")}>{exam.hasSectionalTiming ? "Yes" : "No"}</span>} />
                                </div>
                            </div>
                            <div className="bg-gray-50/50 rounded-xl p-4 border border-gray-100">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Important Dates</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <InfoRow label="Start Date" value={exam.examStartDate ? new Date(exam.examStartDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"} />
                                    <InfoRow label="End Date" value={exam.examEndDate ? new Date(exam.examEndDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"} />
                                    <InfoRow label="Created" value={exam.createdAt ? formatDistanceToNow(new Date(exam.createdAt), { addSuffix: true }) : "—"} />
                                    <InfoRow label="Updated" value={exam.updatedAt ? formatDistanceToNow(new Date(exam.updatedAt), { addSuffix: true }) : "—"} />
                                </div>
                            </div>
                            <div className="bg-gray-50/50 rounded-xl p-4 border border-gray-100">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">External Links</h3>
                                <div className="space-y-2">
                                    {exam.answerKeyUrl ? <a href={exam.answerKeyUrl} target="_blank" className="flex items-center gap-2 text-sm text-violet-600 hover:underline font-medium"><ExternalLink className="w-3.5 h-3.5" /> Answer Key</a> : <p className="text-xs text-gray-400">No answer key URL</p>}
                                    {exam.officialWebsite ? <a href={exam.officialWebsite} target="_blank" className="flex items-center gap-2 text-sm text-violet-600 hover:underline font-medium"><ExternalLink className="w-3.5 h-3.5" /> Official Website</a> : <p className="text-xs text-gray-400">No official website</p>}
                                </div>
                            </div>
                            {sections.length > 0 && (
                                <div className="md:col-span-2 bg-gray-50/50 rounded-xl p-4 border border-gray-100">
                                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Section Configuration ({sections.length} sections)</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{sections.map(([code, config]) => <SectionCard key={code} code={code} config={config} />)}</div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Quick Edit Tab ── */}
                    {activeTab === "quick-edit" && (
                        <div className="max-w-2xl space-y-5">
                            <div className="bg-gray-50/50 rounded-xl p-4 border border-gray-100">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Status & Visibility</h3>
                                <div className="space-y-3">
                                    {/* Active toggle */}
                                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
                                        <div>
                                            <p className="text-sm font-bold text-gray-900">Active</p>
                                            <p className="text-[11px] text-gray-400 mt-0.5">When active, exam appears in public listings</p>
                                        </div>
                                        <Toggle checked={getFieldValue("isActive")} onChange={v => setQuickEdit("isActive", v)} />
                                    </div>
                                    {/* Featured toggle */}
                                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
                                        <div>
                                            <p className="text-sm font-bold text-gray-900">Featured</p>
                                            <p className="text-[11px] text-gray-400 mt-0.5">Feature this exam on the homepage</p>
                                        </div>
                                        <Toggle checked={getFieldValue("isFeatured")} onChange={v => setQuickEdit("isFeatured", v)} />
                                    </div>
                                    {/* Normalization toggle */}
                                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
                                        <div>
                                            <p className="text-sm font-bold text-gray-900">Normalization</p>
                                            <p className="text-[11px] text-gray-400 mt-0.5">Enable score normalization across shifts</p>
                                        </div>
                                        <Toggle checked={getFieldValue("hasNormalization")} onChange={v => setQuickEdit("hasNormalization", v)} />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gray-50/50 rounded-xl p-4 border border-gray-100">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Status & Phase</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Status</label>
                                        <select value={getFieldValue("status")} onChange={e => setQuickEdit("status", e.target.value)}
                                            className="w-full h-9 px-3 border border-gray-200 rounded-lg bg-white text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400">
                                            <option value="upcoming">Upcoming</option>
                                            <option value="active">Active</option>
                                            <option value="answer_key_released">Answer Key Released</option>
                                            <option value="closed">Closed</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Analysis Phase</label>
                                        <select value={getFieldValue("analysisPhase") || ""} onChange={e => setQuickEdit("analysisPhase", e.target.value)}
                                            className="w-full h-9 px-3 border border-gray-200 rounded-lg bg-white text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400">
                                            <option value="collecting">Collecting</option>
                                            <option value="analyzing">Analyzing</option>
                                            <option value="normalizing">Normalizing</option>
                                            <option value="publishing">Publishing</option>
                                            <option value="completed">Completed</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Priority Order</label>
                                        <input type="number" value={getFieldValue("priorityOrder") || 0} onChange={e => setQuickEdit("priorityOrder", parseInt(e.target.value) || 0)}
                                            className="w-full h-9 px-3 border border-gray-200 rounded-lg bg-white text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400" />
                                    </div>
                                </div>
                            </div>

                            <p className="text-[11px] text-gray-400 text-center">
                                For full editing (name, sections, dates, marks), use <Link href={`/admin/exams/${examId}/edit`} className="text-violet-600 hover:underline font-bold">Full Edit →</Link>
                            </p>
                        </div>
                    )}

                    {/* ── Shifts Tab ── */}
                    {activeTab === "shifts" && (
                        <div className="text-center py-10">
                            <Clock className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                            <p className="text-sm text-gray-500 font-medium">View and manage shifts for this exam</p>
                            <Link href={`/admin/shifts?examId=${examId}`} className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-gray-800 transition-colors">
                                View All Shifts <ChevronRight className="w-3.5 h-3.5" />
                            </Link>
                        </div>
                    )}

                    {/* ── Submissions Tab ── */}
                    {activeTab === "submissions" && (
                        <div className="text-center py-10">
                            <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                            <p className="text-sm text-gray-500 font-medium">View all submissions for this exam</p>
                            <Link href={`/admin/submissions?examId=${examId}`} className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-gray-800 transition-colors">
                                View Submissions <ChevronRight className="w-3.5 h-3.5" />
                            </Link>
                        </div>
                    )}

                    {/* ── Analytics Tab ── */}
                    {activeTab === "analytics" && (
                        <div className="space-y-5">
                            {!analyticsData ? (
                                <div className="text-center py-12">
                                    {analyticsError && <div className="mb-4 text-red-500 font-medium text-sm flex flex-col items-center gap-1"><XCircle className="w-6 h-6" />{analyticsError}</div>}
                                    <button onClick={fetchAnalytics} disabled={loadingAnalytics}
                                        className="px-6 py-3 bg-gray-900 text-white font-bold text-sm rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50 inline-flex items-center gap-2">
                                        {loadingAnalytics && <Loader2 className="w-4 h-4 animate-spin" />}
                                        {loadingAnalytics ? "Loading…" : "Load Analytics"}
                                    </button>
                                </div>
                            ) : (<>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <StatCard icon={BarChart3} label="Avg Score" value={analyticsData.avgScore} color="bg-blue-50 text-blue-600" />
                                    <StatCard icon={TrendingUp} label="Max Score" value={analyticsData.maxScore} color="bg-emerald-50 text-emerald-600" />
                                    <StatCard icon={Activity} label="Min Score" value={analyticsData.minScore} color="bg-red-50 text-red-600" />
                                    <StatCard icon={Users} label="Samples" value={analyticsData.totalSubmissions?.toLocaleString()} color="bg-violet-50 text-violet-600" />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="bg-gray-50/50 rounded-xl p-5 border border-gray-100">
                                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-1.5"><BarChart3 className="w-3.5 h-3.5" /> Score Distribution</h3>
                                        <div className="space-y-2.5">
                                            {analyticsData.scoreDistribution?.length > 0 ? analyticsData.scoreDistribution.map((item: any) => (
                                                <div key={item.range}>
                                                    <div className="flex justify-between text-xs mb-1">
                                                        <span className="font-bold text-gray-700">{item.range}</span>
                                                        <span className="text-gray-400">{item.count}</span>
                                                    </div>
                                                    <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                                                        <div className="h-full bg-gradient-to-r from-violet-400 to-violet-600 rounded-full transition-all"
                                                            style={{ width: `${Math.max(2, (item.count / analyticsData.totalSubmissions) * 100)}%` }} />
                                                    </div>
                                                </div>
                                            )) : <p className="text-xs text-gray-400 text-center py-4">No data</p>}
                                        </div>
                                    </div>
                                    <div className="bg-gray-50/50 rounded-xl p-5 border border-gray-100">
                                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-1.5"><Calculator className="w-3.5 h-3.5" /> Category Breakdown</h3>
                                        <div className="space-y-2">
                                            {analyticsData.categoryBreakdown?.map((item: any) => (
                                                <div key={item.category} className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-gray-100">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-bold px-1.5 py-0.5 bg-gray-900 text-white rounded">{item.category}</span>
                                                        <span className="text-xs text-gray-500">{item.count} students</span>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-xs font-bold text-gray-900">{item.avgScore}</p>
                                                        <p className="text-[10px] text-gray-400">avg</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </>)}
                        </div>
                    )}

                    {/* ── Cutoffs Tab ── */}
                    {activeTab === "cutoffs" && (
                        <div className="text-center py-10">
                            <TrendingUp className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                            <p className="text-sm text-gray-500 font-medium">Cutoff predictions for this exam</p>
                            <Link href={`/admin/cutoffs?examId=${examId}`} className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-gray-800 transition-colors">
                                Manage Cutoffs <ChevronRight className="w-3.5 h-3.5" />
                            </Link>
                        </div>
                    )}
                </div>
            </div>

            {/* ═══════════ MODALS ═══════════ */}

            <Dialog open={modal === "archive"} onClose={() => setModal(null)}>
                <div className="p-6">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-4"><Archive className="w-6 h-6 text-amber-600" /></div>
                    <h3 className="text-lg font-black text-gray-900 text-center">Archive Exam</h3>
                    <p className="text-sm text-gray-500 text-center mt-1">{exam.name}</p>
                    <div className="mt-5 space-y-3">
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                            <div className="flex items-start gap-2"><AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                                <div className="text-xs text-amber-800"><p className="font-bold">This will:</p>
                                    <ul className="mt-1 space-y-0.5 list-disc list-inside text-amber-700">
                                        <li>Export <strong>{stats.submissions.toLocaleString()}</strong> submissions to SQLite</li>
                                        <li><strong>Delete</strong> submissions from PostgreSQL</li><li>Mark exam as inactive</li>
                                    </ul></div></div>
                        </div>
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800"><p className="font-bold">Reversible</p><p className="text-blue-700 mt-0.5">You can restore from the archive anytime.</p></div>
                    </div>
                    <div className="mt-6 flex gap-3">
                        <button onClick={() => setModal(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
                        <button onClick={confirmArchive} className="flex-1 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-bold hover:bg-amber-600 transition-colors flex items-center justify-center gap-2"><Archive className="w-4 h-4" /> Archive</button>
                    </div>
                </div>
            </Dialog>

            <Dialog open={modal === "restore"} onClose={() => setModal(null)}>
                <div className="p-6">
                    <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-4"><ArchiveRestore className="w-6 h-6 text-green-600" /></div>
                    <h3 className="text-lg font-black text-gray-900 text-center">Restore Exam</h3>
                    <p className="text-sm text-gray-500 text-center mt-1">{exam.name}</p>
                    <div className="mt-5 bg-gray-50 rounded-xl p-3 space-y-2">
                        <div className="flex justify-between text-xs"><span className="text-gray-500">Archive size</span><span className="font-bold">{archiveInfo?.fileSizeMB || "?"} MB</span></div>
                        <div className="flex justify-between text-xs"><span className="text-gray-500">Submissions</span><span className="font-bold">{(archiveInfo?.submissionCount || 0).toLocaleString()}</span></div>
                    </div>
                    <p className="text-xs text-gray-500 text-center mt-3">Submissions re-imported. Archive file deleted after success.</p>
                    <div className="mt-6 flex gap-3">
                        <button onClick={() => setModal(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
                        <button onClick={confirmRestore} className="flex-1 py-2.5 bg-green-500 text-white rounded-xl text-sm font-bold hover:bg-green-600 transition-colors flex items-center justify-center gap-2"><ArchiveRestore className="w-4 h-4" /> Restore</button>
                    </div>
                </div>
            </Dialog>

            <Dialog open={modal === "duplicate"} onClose={() => setModal(null)}>
                <div className="p-6">
                    <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center mx-auto mb-4"><Copy className="w-6 h-6 text-violet-600" /></div>
                    <h3 className="text-lg font-black text-gray-900 text-center">Duplicate Exam</h3>
                    <p className="text-sm text-gray-500 text-center mt-2">Create a copy of <strong>{exam.name}</strong> with all config?</p>
                    <div className="mt-6 flex gap-3">
                        <button onClick={() => setModal(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
                        <button onClick={handleDuplicate} className="flex-1 py-2.5 bg-violet-500 text-white rounded-xl text-sm font-bold hover:bg-violet-600 transition-colors flex items-center justify-center gap-2"><Copy className="w-4 h-4" /> Duplicate</button>
                    </div>
                </div>
            </Dialog>

            <Dialog open={modal === "result"} onClose={() => { setModal(null); setModalResult(null); }}>
                <div className="p-6 text-center">
                    <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4", modalResult?.success ? "bg-green-50" : "bg-red-50")}>
                        {modalResult?.success ? <CheckCircle2 className="w-7 h-7 text-green-600" /> : <XCircle className="w-7 h-7 text-red-600" />}
                    </div>
                    <h3 className="text-lg font-black text-gray-900">{modalResult?.message}</h3>
                    {modalResult?.details && <p className="text-sm text-gray-500 mt-2">{modalResult.details}</p>}
                    <button onClick={() => { setModal(null); setModalResult(null); }} className="mt-6 w-full py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-colors">Done</button>
                </div>
            </Dialog>
        </div>
    );
}
