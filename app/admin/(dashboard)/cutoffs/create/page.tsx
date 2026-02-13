"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    ArrowLeft, Info, Target, History, Brain, Eye, Hash, X, Plus,
} from "lucide-react";

interface Exam { id: number; name: string; year: number }

/* ── Shared form styles ── */
const label = "block text-xs font-semibold text-gray-600 mb-1.5";
const input = "w-full h-9 px-3 text-xs font-medium bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-300";
const selectCls = input + " cursor-pointer";
const sectionCls = "bg-white rounded-xl border border-gray-100 p-5 space-y-4";

export default function CreateCutoffPage() {
    const router = useRouter();
    const [exams, setExams] = useState<Exam[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [factorsInput, setFactorsInput] = useState("");
    const [formData, setFormData] = useState({
        examId: "", category: "UR", postCode: "", postName: "",
        expectedCutoff: "", safeScore: "", minimumScore: "",
        previousYearCutoff: "", previousYearVacancy: "", currentYearVacancy: "",
        confidenceLevel: "medium", dataPoints: "", methodology: "",
        factors: [] as string[], isPublished: false, priorityOrder: "0",
    });

    useEffect(() => {
        fetch("/api/admin/exams?limit=100").then(r => r.json()).then(d => setExams(d.exams || [])).catch(console.error);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); setSubmitting(true);
        try {
            const body: any = {
                examId: parseInt(formData.examId), category: formData.category,
                postCode: formData.postCode || "GEN", postName: formData.postName || "General Post",
                expectedCutoff: parseFloat(formData.expectedCutoff),
                safeScore: formData.safeScore ? parseFloat(formData.safeScore) : null,
                minimumScore: formData.minimumScore ? parseFloat(formData.minimumScore) : null,
                previousYearCutoff: formData.previousYearCutoff ? parseFloat(formData.previousYearCutoff) : null,
                previousYearVacancy: formData.previousYearVacancy ? parseInt(formData.previousYearVacancy) : null,
                currentYearVacancy: formData.currentYearVacancy ? parseInt(formData.currentYearVacancy) : null,
                confidenceLevel: formData.confidenceLevel, isPublished: formData.isPublished,
                priorityOrder: parseInt(formData.priorityOrder) || 0,
            };
            if (formData.dataPoints || formData.methodology || formData.factors.length > 0) {
                body.predictionBasis = { dataPoints: formData.dataPoints ? parseInt(formData.dataPoints) : 0, methodology: formData.methodology || "", factors: formData.factors };
            }
            const res = await fetch("/api/admin/cutoffs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
            if (res.ok) router.push("/admin/cutoffs"); else alert("Failed to create cutoff");
        } catch { alert("Error creating cutoff"); }
        finally { setSubmitting(false); }
    };

    const addFactor = () => { const t = factorsInput.trim(); if (t && !formData.factors.includes(t)) { set("factors", [...formData.factors, t]); setFactorsInput(""); } };
    const removeFactor = (f: string) => set("factors", formData.factors.filter(x => x !== f));
    const set = (key: string, value: any) => setFormData(prev => ({ ...prev, [key]: value }));

    return (
        <div className="max-w-3xl mx-auto space-y-4 pb-10">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Link href="/admin/cutoffs" className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                    <ArrowLeft className="w-4 h-4 text-gray-500" />
                </Link>
                <div>
                    <h1 className="text-lg font-bold text-gray-900">Add New Cutoff</h1>
                    <p className="text-xs text-gray-400">Create a new cutoff prediction entry</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Basic Information */}
                <div className={sectionCls}>
                    <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2"><Info className="w-4 h-4 text-indigo-500" />Basic Information</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="md:col-span-2">
                            <label className={label}>Exam <span className="text-red-500">*</span></label>
                            <select required value={formData.examId} onChange={e => set("examId", e.target.value)} className={selectCls}>
                                <option value="">Select Exam…</option>
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
                            <label className={label}>Category <span className="text-red-500">*</span></label>
                            <select required value={formData.category} onChange={e => set("category", e.target.value)} className={selectCls}>
                                {["UR", "OBC", "SC", "ST", "EWS"].map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={label}>Post Code <span className="text-red-500">*</span></label>
                            <input required type="text" value={formData.postCode} onChange={e => set("postCode", e.target.value)} placeholder="e.g., AAO" className={input} />
                        </div>
                        <div className="md:col-span-2">
                            <label className={label}>Post Name <span className="text-red-500">*</span></label>
                            <input required type="text" value={formData.postName} onChange={e => set("postName", e.target.value)} placeholder="e.g., Assistant Audit Officer" className={input} />
                        </div>
                    </div>
                </div>

                {/* Cutoff Scores */}
                <div className={sectionCls}>
                    <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2"><Target className="w-4 h-4 text-blue-500" />Cutoff Scores</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                            <label className={label}>Expected Cutoff <span className="text-red-500">*</span></label>
                            <input required type="number" step="0.01" value={formData.expectedCutoff} onChange={e => set("expectedCutoff", e.target.value)} className={input + " font-mono"} />
                        </div>
                        <div>
                            <label className={label}>Safe Score <span className="text-red-500">*</span></label>
                            <input required type="number" step="0.01" value={formData.safeScore} onChange={e => set("safeScore", e.target.value)} className={input + " font-mono"} />
                        </div>
                        <div>
                            <label className={label}>Minimum Score <span className="text-red-500">*</span></label>
                            <input required type="number" step="0.01" value={formData.minimumScore} onChange={e => set("minimumScore", e.target.value)} className={input + " font-mono"} />
                        </div>
                    </div>
                </div>

                {/* Reference Data */}
                <div className={sectionCls}>
                    <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2"><History className="w-4 h-4 text-amber-500" />Reference Data</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                            <label className={label}>Previous Year Cutoff</label>
                            <input type="number" step="0.01" value={formData.previousYearCutoff} onChange={e => set("previousYearCutoff", e.target.value)} className={input + " font-mono"} />
                        </div>
                        <div>
                            <label className={label}>Previous Year Vacancy</label>
                            <input type="number" value={formData.previousYearVacancy} onChange={e => set("previousYearVacancy", e.target.value)} className={input} />
                        </div>
                        <div>
                            <label className={label}>Current Year Vacancy</label>
                            <input type="number" value={formData.currentYearVacancy} onChange={e => set("currentYearVacancy", e.target.value)} className={input} />
                        </div>
                    </div>
                </div>

                {/* Prediction Metadata */}
                <div className={sectionCls}>
                    <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2"><Brain className="w-4 h-4 text-emerald-500" />Prediction Metadata</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label className={label}>Confidence Level <span className="text-red-500">*</span></label>
                            <select required value={formData.confidenceLevel} onChange={e => set("confidenceLevel", e.target.value)} className={selectCls}>
                                <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
                            </select>
                        </div>
                        <div>
                            <label className={label}>Data Points Used</label>
                            <input type="number" value={formData.dataPoints} onChange={e => set("dataPoints", e.target.value)} placeholder="Number of submissions analyzed" className={input} />
                        </div>
                        <div className="md:col-span-2">
                            <label className={label}>Methodology Notes</label>
                            <textarea value={formData.methodology} onChange={e => set("methodology", e.target.value)} rows={3} placeholder="Describe the prediction methodology…"
                                className="w-full px-3 py-2 text-xs font-medium bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-300 resize-none" />
                        </div>
                        <div className="md:col-span-2">
                            <label className={label}>Factors Considered</label>
                            <div className="flex gap-2 mb-2">
                                <input type="text" value={factorsInput} onChange={e => setFactorsInput(e.target.value)}
                                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addFactor(); } }}
                                    placeholder="Type a factor and press Enter" className={input + " flex-1"} />
                                <button type="button" onClick={addFactor} className="h-9 px-3 text-xs font-semibold bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-1">
                                    <Plus className="w-3 h-3" />Add
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {formData.factors.map(f => (
                                    <span key={f} className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded-full">
                                        {f}
                                        <button type="button" onClick={() => removeFactor(f)} className="hover:text-red-500 transition-colors"><X className="w-3 h-3" /></button>
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Display Settings */}
                <div className={sectionCls}>
                    <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2"><Eye className="w-4 h-4 text-violet-500" />Display Settings</h2>
                    <div className="flex items-center gap-3">
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={formData.isPublished} onChange={e => set("isPublished", e.target.checked)} className="sr-only peer" />
                            <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600" />
                        </label>
                        <span className="text-xs font-semibold text-gray-700">Show on Public Page</span>
                    </div>
                    <div className="mt-2">
                        <label className={label}>Priority Order</label>
                        <input type="number" value={formData.priorityOrder} onChange={e => set("priorityOrder", e.target.value)} className={input + " w-28"} />
                        <p className="text-[10px] text-gray-400 mt-1">Higher values appear first. Default: 0</p>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={() => router.back()} className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
                    <button type="submit" disabled={submitting} className="px-5 py-2 text-xs font-semibold text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50">
                        {submitting ? "Creating…" : "Create Cutoff"}
                    </button>
                </div>
            </form>
        </div>
    );
}
