"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Exam { id: number; name: string; year: number; }

export default function CreateCutoffPage() {
    const router = useRouter();
    const [exams, setExams] = useState<Exam[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [factorsInput, setFactorsInput] = useState("");
    const [formData, setFormData] = useState({
        examId: "",
        category: "UR",
        postCode: "",
        postName: "",
        expectedCutoff: "",
        safeScore: "",
        minimumScore: "",
        previousYearCutoff: "",
        previousYearVacancy: "",
        currentYearVacancy: "",
        confidenceLevel: "medium",
        dataPoints: "",
        methodology: "",
        factors: [] as string[],
        isPublished: false,
    });

    useEffect(() => {
        fetch("/api/admin/exams?limit=100")
            .then(r => r.json())
            .then(d => setExams(d.exams || []))
            .catch(console.error);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const body: any = {
                examId: parseInt(formData.examId),
                category: formData.category,
                postCode: formData.postCode || "GEN",
                postName: formData.postName || "General Post",
                expectedCutoff: parseFloat(formData.expectedCutoff),
                safeScore: formData.safeScore ? parseFloat(formData.safeScore) : null,
                minimumScore: formData.minimumScore ? parseFloat(formData.minimumScore) : null,
                previousYearCutoff: formData.previousYearCutoff ? parseFloat(formData.previousYearCutoff) : null,
                previousYearVacancy: formData.previousYearVacancy ? parseInt(formData.previousYearVacancy) : null,
                currentYearVacancy: formData.currentYearVacancy ? parseInt(formData.currentYearVacancy) : null,
                confidenceLevel: formData.confidenceLevel,
                isPublished: formData.isPublished,
            };

            if (formData.dataPoints || formData.methodology || formData.factors.length > 0) {
                body.predictionBasis = {
                    dataPoints: formData.dataPoints ? parseInt(formData.dataPoints) : 0,
                    methodology: formData.methodology || "",
                    factors: formData.factors,
                };
            }

            const res = await fetch("/api/admin/cutoffs", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            if (res.ok) {
                router.push("/admin/cutoffs");
            } else {
                alert("Failed to create cutoff");
            }
        } catch (error) {
            console.error(error);
            alert("Error creating cutoff");
        } finally {
            setSubmitting(false);
        }
    };

    const addFactor = () => {
        const trimmed = factorsInput.trim();
        if (trimmed && !formData.factors.includes(trimmed)) {
            setFormData(prev => ({ ...prev, factors: [...prev.factors, trimmed] }));
            setFactorsInput("");
        }
    };

    const removeFactor = (f: string) => {
        setFormData(prev => ({ ...prev, factors: prev.factors.filter(x => x !== f) }));
    };

    const set = (key: string, value: any) => setFormData(prev => ({ ...prev, [key]: value }));

    return (
        <div className="max-w-3xl mx-auto space-y-6 pb-10">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/admin/cutoffs" className="w-10 h-10 flex items-center justify-center rounded-xl border-2 border-gray-200 hover:border-gray-900 transition-all">
                    <span className="material-symbols-outlined">arrow_back</span>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Add New Cutoff</h1>
                    <p className="text-gray-500 text-sm font-medium">Create a new cutoff prediction entry.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information */}
                <div className="card-base p-6 bg-white space-y-4">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#A78BFA]">info</span>
                        Basic Information
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-gray-700 mb-1">Exam <span className="text-red-500">*</span></label>
                            <select required value={formData.examId} onChange={(e) => set("examId", e.target.value)}
                                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-gray-900 outline-none bg-white text-sm font-medium">
                                <option value="">Select Exam...</option>
                                {exams.map(e => <option key={e.id} value={e.id}>{e.name} ({e.year})</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Category <span className="text-red-500">*</span></label>
                            <select required value={formData.category} onChange={(e) => set("category", e.target.value)}
                                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-gray-900 outline-none bg-white text-sm font-medium">
                                {["UR", "OBC", "SC", "ST", "EWS"].map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Post Code <span className="text-red-500">*</span></label>
                            <input required type="text" value={formData.postCode} onChange={(e) => set("postCode", e.target.value)}
                                placeholder="e.g., AAO" className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-gray-900 outline-none text-sm" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-gray-700 mb-1">Post Name <span className="text-red-500">*</span></label>
                            <input required type="text" value={formData.postName} onChange={(e) => set("postName", e.target.value)}
                                placeholder="e.g., Assistant Audit Officer" className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-gray-900 outline-none text-sm" />
                        </div>
                    </div>
                </div>

                {/* Cutoff Scores */}
                <div className="card-base p-6 bg-white space-y-4">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <span className="material-symbols-outlined text-blue-500">score</span>
                        Cutoff Scores
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Expected Cutoff <span className="text-red-500">*</span></label>
                            <input required type="number" step="0.01" value={formData.expectedCutoff} onChange={(e) => set("expectedCutoff", e.target.value)}
                                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-gray-900 outline-none text-sm font-mono" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Safe Score <span className="text-red-500">*</span></label>
                            <input required type="number" step="0.01" value={formData.safeScore} onChange={(e) => set("safeScore", e.target.value)}
                                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-gray-900 outline-none text-sm font-mono" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Minimum Score <span className="text-red-500">*</span></label>
                            <input required type="number" step="0.01" value={formData.minimumScore} onChange={(e) => set("minimumScore", e.target.value)}
                                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-gray-900 outline-none text-sm font-mono" />
                        </div>
                    </div>
                </div>

                {/* Reference Data */}
                <div className="card-base p-6 bg-white space-y-4">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <span className="material-symbols-outlined text-amber-500">history</span>
                        Reference Data
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Previous Year Cutoff</label>
                            <input type="number" step="0.01" value={formData.previousYearCutoff} onChange={(e) => set("previousYearCutoff", e.target.value)}
                                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-gray-900 outline-none text-sm font-mono" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Previous Year Vacancy</label>
                            <input type="number" value={formData.previousYearVacancy} onChange={(e) => set("previousYearVacancy", e.target.value)}
                                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-gray-900 outline-none text-sm" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Current Year Vacancy</label>
                            <input type="number" value={formData.currentYearVacancy} onChange={(e) => set("currentYearVacancy", e.target.value)}
                                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-gray-900 outline-none text-sm" />
                        </div>
                    </div>
                </div>

                {/* Prediction Metadata */}
                <div className="card-base p-6 bg-white space-y-4">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <span className="material-symbols-outlined text-emerald-500">psychology</span>
                        Prediction Metadata
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Confidence Level <span className="text-red-500">*</span></label>
                            <select required value={formData.confidenceLevel} onChange={(e) => set("confidenceLevel", e.target.value)}
                                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-gray-900 outline-none bg-white text-sm font-medium">
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Data Points Used</label>
                            <input type="number" value={formData.dataPoints} onChange={(e) => set("dataPoints", e.target.value)}
                                placeholder="Number of submissions analyzed"
                                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-gray-900 outline-none text-sm" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-gray-700 mb-1">Methodology Notes</label>
                            <textarea value={formData.methodology} onChange={(e) => set("methodology", e.target.value)}
                                rows={3} placeholder="Describe the prediction methodology..."
                                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-gray-900 outline-none text-sm resize-none" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-gray-700 mb-1">Factors Considered</label>
                            <div className="flex gap-2 mb-2">
                                <input type="text" value={factorsInput} onChange={(e) => setFactorsInput(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addFactor(); } }}
                                    placeholder="Type a factor and press Enter"
                                    className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-gray-900 outline-none text-sm" />
                                <button type="button" onClick={addFactor}
                                    className="px-4 py-2 bg-gray-100 border-2 border-gray-200 rounded-xl hover:border-gray-900 transition-all text-sm font-bold">
                                    Add
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {formData.factors.map(f => (
                                    <span key={f} className="inline-flex items-center gap-1 px-3 py-1 bg-[#F3E8FF] text-[#7C3AED] text-xs font-bold rounded-full border border-[#DDD6FE]">
                                        {f}
                                        <button type="button" onClick={() => removeFactor(f)} className="hover:text-red-500 transition-colors">
                                            <span className="material-symbols-outlined text-sm">close</span>
                                        </button>
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Display Settings */}
                <div className="card-base p-6 bg-white space-y-4">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <span className="material-symbols-outlined text-pink-500">visibility</span>
                        Display Settings
                    </h2>
                    <div className="flex items-center gap-3">
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={formData.isPublished} onChange={(e) => set("isPublished", e.target.checked)}
                                className="sr-only peer" />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#7C3AED]"></div>
                        </label>
                        <span className="text-sm font-bold text-gray-700">Show on Public Page</span>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3">
                    <button type="button" onClick={() => router.back()}
                        className="px-6 py-2.5 font-bold border-2 border-gray-200 rounded-xl hover:border-gray-900 transition-all text-gray-700">
                        Cancel
                    </button>
                    <button type="submit" disabled={submitting}
                        className="btn-primary px-8 disabled:opacity-50">
                        {submitting ? "Creating..." : "Create Cutoff"}
                    </button>
                </div>
            </form>
        </div>
    );
}
