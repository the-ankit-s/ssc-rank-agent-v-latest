"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
    ArrowLeft, Sparkles, Settings2, RefreshCw, CheckCircle2, Send,
    BarChart3, TrendingUp, Minus, TrendingDown, Database, Atom,
    Users, Check, AlertTriangle, Scale,
} from "lucide-react";

interface Prediction {
    category: string; postCode: string; postName: string;
    expectedCutoff: number; safeScore: number; minimumScore: number;
    confidenceLevel: "low" | "medium" | "high"; dataPoints: number;
    methodology: string; factors: string[]; approved?: boolean;
}

const confCfg: Record<string, { bg: string; text: string; dot: string }> = {
    high: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
    medium: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
    low: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
};

export default function PredictionsPage() {
    const [exams, setExams] = useState<any[]>([]);
    const [selectedExam, setSelectedExam] = useState("");
    const [predictions, setPredictions] = useState<Prediction[]>([]);
    const [loading, setLoading] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [examInfo, setExamInfo] = useState<{ examName: string; normalizationMethod: string; totalSubmissions: number } | null>(null);
    const [message, setMessage] = useState("");
    const [minSubmissions, setMinSubmissions] = useState(50);
    const [confidenceThreshold, setConfidenceThreshold] = useState<"low" | "medium" | "high">("low");
    const [normWarning, setNormWarning] = useState<string | null>(null);
    const [normReady, setNormReady] = useState(true);

    useEffect(() => { fetch("/api/admin/exams?limit=100").then(r => r.json()).then(data => setExams(data.exams || [])); }, []);

    // Check readiness when exam is selected
    useEffect(() => {
        if (!selectedExam) { setNormWarning(null); setNormReady(true); return; }
        setNormWarning(null); setNormReady(true);
        fetch(`/api/admin/jobs/readiness?examId=${selectedExam}`)
            .then(r => r.json())
            .then(data => {
                if (data.normalization && !data.normalization.done) {
                    setNormWarning(data.normalization.message || "Normalization not complete for this exam.");
                    setNormReady(false);
                } else {
                    setNormWarning(null);
                    setNormReady(true);
                }
            })
            .catch(() => { });
    }, [selectedExam]);

    const runPrediction = async () => {
        if (!selectedExam) return;
        setLoading(true); setMessage(""); setPredictions([]);
        try {
            const res = await fetch("/api/admin/cutoffs/predict", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ examId: selectedExam, minSubmissions, confidenceThreshold }),
            });
            const data = await res.json();
            if (data.message) setMessage(data.message);
            setExamInfo({ examName: data.examName || "", normalizationMethod: data.normalizationMethod || "z_score", totalSubmissions: data.totalSubmissions || 0 });
            setPredictions((data.predictions || []).map((p: Prediction) => ({ ...p, approved: false })));
        } catch { setMessage("Failed to run prediction. Check the console for errors."); }
        finally { setLoading(false); }
    };

    const toggleApprove = (idx: number) => setPredictions(prev => prev.map((p, i) => i === idx ? { ...p, approved: !p.approved } : p));
    const approveAll = () => setPredictions(prev => prev.map(p => ({ ...p, approved: true })));

    const publishApproved = async () => {
        const approved = predictions.filter(p => p.approved);
        if (approved.length === 0) return;
        setPublishing(true);
        try {
            const savedIds: number[] = [];
            for (const pred of approved) {
                const res = await fetch("/api/admin/cutoffs", {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        examId: parseInt(selectedExam), category: pred.category,
                        postCode: pred.postCode, postName: pred.postName,
                        expectedCutoff: pred.expectedCutoff, safeScore: pred.safeScore,
                        minimumScore: pred.minimumScore, confidenceLevel: pred.confidenceLevel,
                        predictionFactors: pred.factors, predictionMethodology: pred.methodology,
                    }),
                });
                const data = await res.json();
                if (data.cutoff?.id) savedIds.push(data.cutoff.id);
            }
            if (savedIds.length > 0) {
                await fetch("/api/admin/cutoffs/publish", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: savedIds }) });
            }
            setMessage(`✅ ${savedIds.length} cutoff(s) saved and published.`);
            setPredictions(prev => prev.map(p => p.approved ? { ...p, approved: false } : p));
        } catch { setMessage("Failed to publish. Check the console for errors."); }
        finally { setPublishing(false); }
    };

    const approvedCount = predictions.filter(p => p.approved).length;

    const inputCls = "w-full h-9 px-3 text-xs font-medium bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-300";

    return (
        <div className="space-y-4 max-w-[1400px] mx-auto pb-10">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Link href="/admin/cutoffs" className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                        <ArrowLeft className="w-4 h-4 text-gray-500" />
                    </Link>
                    <div>
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-amber-500" />
                            <h1 className="text-lg font-bold text-gray-900">AI Cutoff Predictions</h1>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5 ml-7">Run AI-based cutoff analysis with configurable parameters</p>
                    </div>
                </div>
            </div>

            {/* Algorithm Controls */}
            <div className="bg-white rounded-xl border border-gray-100 p-5">
                <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2 mb-4">
                    <Settings2 className="w-4 h-4 text-gray-500" />Algorithm Controls
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Select Exam <span className="text-red-500">*</span></label>
                        <select value={selectedExam} onChange={e => setSelectedExam(e.target.value)} className={inputCls + " cursor-pointer"}>
                            <option value="">Choose exam…</option>
                            {(() => {
                                const active = exams.filter((e: any) => e.isActive !== false && e.status !== "closed");
                                const archived = exams.filter((e: any) => e.isActive === false || e.status === "closed");
                                return (<>
                                    {active.length > 0 && <optgroup label="Active Exams">{active.map(e => <option key={e.id} value={e.id}>{e.name} ({e.year})</option>)}</optgroup>}
                                    {archived.length > 0 && <optgroup label="Archived / Closed">{archived.map(e => <option key={e.id} value={e.id}>{e.name} ({e.year})</option>)}</optgroup>}
                                </>);
                            })()}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Min Submissions</label>
                        <input type="number" value={minSubmissions} onChange={e => setMinSubmissions(parseInt(e.target.value) || 10)} min={10} max={10000} className={inputCls} />
                        <p className="text-[10px] text-gray-400 mt-1">Minimum per category</p>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Confidence Threshold</label>
                        <select value={confidenceThreshold} onChange={e => setConfidenceThreshold(e.target.value as any)} className={inputCls + " cursor-pointer"}>
                            <option value="low">Low (show all)</option>
                            <option value="medium">Medium+</option>
                            <option value="high">High only</option>
                        </select>
                        <p className="text-[10px] text-gray-400 mt-1">Filter by confidence</p>
                    </div>
                </div>
                <button onClick={runPrediction} disabled={!selectedExam || loading || !normReady}
                    className="mt-4 flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50">
                    {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    {loading ? "Running Prediction…" : "Run Prediction"}
                </button>
            </div>

            {/* Normalization Warning */}
            {normWarning && (
                <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50">
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <h3 className="text-xs font-bold text-amber-800">Normalization Required</h3>
                        <p className="text-[11px] text-amber-700 mt-0.5">{normWarning}</p>
                        <p className="text-[10px] text-amber-600 mt-1.5">Go to <a href="/admin/jobs" className="underline font-semibold hover:text-amber-800">Background Jobs → Processing Pipeline</a> and run normalization first.</p>
                    </div>
                </div>
            )}

            {/* Message */}
            {message && (
                <div className={cn("p-3 rounded-lg border text-xs font-semibold",
                    message.includes("✅") ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-amber-50 border-amber-200 text-amber-700")}>
                    {message}
                </div>
            )}

            {/* Exam Info KPIs */}
            {examInfo && predictions.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white rounded-xl border border-gray-100 p-3 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center"><BarChart3 className="w-4 h-4 text-indigo-600" /></div>
                        <div><p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Exam</p><p className="text-sm font-bold text-gray-900">{examInfo.examName}</p></div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-100 p-3 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center"><Atom className="w-4 h-4 text-violet-600" /></div>
                        <div><p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Normalization</p><p className="text-sm font-bold text-gray-900 capitalize">{examInfo.normalizationMethod.replace("_", " ")}</p></div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-100 p-3 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center"><Database className="w-4 h-4 text-emerald-600" /></div>
                        <div><p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Data Points</p><p className="text-sm font-bold text-gray-900">{examInfo.totalSubmissions.toLocaleString()}</p></div>
                    </div>
                </div>
            )}

            {/* Predictions Table */}
            {predictions.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                    {/* Action bar */}
                    <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/30">
                        <div className="flex items-center gap-3">
                            <button onClick={approveAll} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-white border border-gray-200 rounded-lg hover:border-emerald-400 transition-colors text-emerald-600">
                                <Check className="w-3.5 h-3.5" />Approve All
                            </button>
                            <span className="text-[11px] text-gray-400 font-semibold">
                                {approvedCount > 0 ? `${approvedCount} approved` : "None approved yet"}
                            </span>
                        </div>
                        <button onClick={publishApproved} disabled={approvedCount === 0 || publishing}
                            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50">
                            <Send className="w-3.5 h-3.5" />
                            {publishing ? "Publishing…" : `Publish ${approvedCount} Cutoff(s)`}
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50/50">
                                    <th className="py-3 px-4 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Approve</th>
                                    <th className="py-3 pr-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Category</th>
                                    <th className="py-3 pr-3 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Expected</th>
                                    <th className="py-3 pr-3 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Safe</th>
                                    <th className="py-3 pr-3 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Minimum</th>
                                    <th className="py-3 pr-3 text-center text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Confidence</th>
                                    <th className="py-3 pr-3 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Data Points</th>
                                    <th className="py-3 pr-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Factors</th>
                                </tr>
                            </thead>
                            <tbody>{predictions.map((p, idx) => {
                                const c = confCfg[p.confidenceLevel];
                                return (
                                    <tr key={idx} className={cn("border-b border-gray-50 hover:bg-gray-50/50 transition-colors", p.approved && "bg-emerald-50/30")}>
                                        <td className="py-2.5 px-4">
                                            <button onClick={() => toggleApprove(idx)}
                                                className={cn("w-7 h-7 rounded-lg border flex items-center justify-center transition-all",
                                                    p.approved ? "bg-emerald-500 border-emerald-500 text-white" : "border-gray-300 text-gray-300 hover:border-emerald-400")}>
                                                {p.approved && <Check className="w-3.5 h-3.5" />}
                                            </button>
                                        </td>
                                        <td className="py-2.5 pr-3">
                                            <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-[10px] font-semibold">{p.category}</span>
                                        </td>
                                        <td className="py-2.5 pr-3 text-right font-bold text-indigo-700 text-sm">{p.expectedCutoff.toFixed(2)}</td>
                                        <td className="py-2.5 pr-3 text-right font-semibold text-emerald-600">{p.safeScore.toFixed(2)}</td>
                                        <td className="py-2.5 pr-3 text-right font-semibold text-amber-600">{p.minimumScore.toFixed(2)}</td>
                                        <td className="py-2.5 pr-3 text-center">
                                            <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold capitalize", c.bg, c.text)}>
                                                <span className={cn("w-1.5 h-1.5 rounded-full", c.dot)} />
                                                {p.confidenceLevel}
                                            </span>
                                        </td>
                                        <td className="py-2.5 pr-3 text-right font-mono text-gray-600">{p.dataPoints.toLocaleString()}</td>
                                        <td className="py-2.5 pr-3">
                                            <div className="flex flex-wrap gap-1">
                                                {p.factors.map((f, fi) => (
                                                    <span key={fi} className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{f}</span>
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}</tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Empty state */}
            {!loading && predictions.length === 0 && !message && (
                <div className="bg-white rounded-xl border border-dashed border-gray-200 p-12 text-center">
                    <Sparkles className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                    <h3 className="text-sm font-bold text-gray-400">No predictions yet</h3>
                    <p className="text-[11px] text-gray-400 mt-1">Select an exam and run the prediction to see AI-generated cutoff estimates.</p>
                </div>
            )}
        </div>
    );
}
