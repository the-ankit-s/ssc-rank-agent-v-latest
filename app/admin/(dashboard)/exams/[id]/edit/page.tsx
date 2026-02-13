"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Loader2, Plus, X, AlertCircle, FileText, Settings, Layers, Calendar, ExternalLink } from "lucide-react";

interface SectionConfig {
    code: string;
    label: string;
    maxMarks: number;
    questions: number;
    positive: number;
    negative: number;
    order: number;
    isQualifying: boolean;
}

export default function EditExamPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [activeTab, setActiveTab] = useState("essentials");

    const [formData, setFormData] = useState({
        name: "", slug: "", agency: "SSC", year: new Date().getFullYear() + 1,
        tier: "Tier-I", totalMarks: 200, totalQuestions: 100, duration: 60,
        defaultPositive: 2, defaultNegative: 0.5, hasSectionalTiming: false,
        hasNormalization: true, allowMultipleSubmissions: false, isActive: true,
        status: "upcoming", analysisPhase: "collecting", isFeatured: false,
        priorityOrder: 0, metaDescription: "",
        examStartDate: "", examEndDate: "", answerKeyReleaseDate: "",
        answerKeyUrl: "", officialWebsite: "",
    });

    const [sections, setSections] = useState<SectionConfig[]>([]);

    useEffect(() => {
        async function fetchExam() {
            try {
                const res = await fetch(`/api/admin/exams/${id}`);
                if (!res.ok) throw new Error("Failed to fetch exam");
                const data = await res.json();
                const exam = data.exam;
                const formatDate = (dateString: string | null) => {
                    if (!dateString) return "";
                    return new Date(dateString).toISOString().split("T")[0];
                };
                setFormData({
                    name: exam.name, slug: exam.slug, agency: exam.agency, year: exam.year,
                    tier: exam.tier, totalMarks: exam.totalMarks, totalQuestions: exam.totalQuestions,
                    duration: exam.duration, defaultPositive: exam.defaultPositive,
                    defaultNegative: exam.defaultNegative, hasSectionalTiming: exam.hasSectionalTiming,
                    hasNormalization: exam.hasNormalization, allowMultipleSubmissions: exam.allowMultipleSubmissions,
                    isActive: exam.isActive, status: exam.status, analysisPhase: exam.analysisPhase,
                    isFeatured: exam.isFeatured, priorityOrder: exam.priorityOrder,
                    metaDescription: exam.metaDescription || "",
                    examStartDate: formatDate(exam.examStartDate),
                    examEndDate: formatDate(exam.examEndDate),
                    answerKeyReleaseDate: formatDate(exam.answerKeyReleaseDate),
                    answerKeyUrl: exam.answerKeyUrl || "",
                    officialWebsite: exam.officialWebsite || "",
                });
                const sectionConfig = exam.sectionConfig as Record<string, SectionConfig>;
                const parsedSections = Object.values(sectionConfig).sort((a, b) => a.order - b.order);
                setSections(parsedSections);
            } catch (err) { setError("Failed to load exam data"); console.error(err); }
            finally { setLoading(false); }
        }
        fetchExam();
    }, [id]);

    useEffect(() => {
        if (loading) return;
        const totalQ = sections.reduce((sum, sec) => sum + (sec.questions || 0), 0);
        const totalM = sections.reduce((sum, sec) => sum + (sec.maxMarks || 0), 0);
        setFormData(prev => ({ ...prev, totalQuestions: totalQ, totalMarks: totalM }));
    }, [sections, loading]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked :
                type === "number" ? parseFloat(value) : value,
        }));
    };

    const addSection = () => {
        setSections([...sections, {
            code: "", label: "", maxMarks: 25 * formData.defaultPositive, questions: 25,
            positive: formData.defaultPositive, negative: formData.defaultNegative,
            order: sections.length + 1, isQualifying: false,
        }]);
    };

    const removeSection = (index: number) => setSections(sections.filter((_, i) => i !== index));

    const updateSection = (index: number, field: keyof SectionConfig, value: string | number | boolean) => {
        setSections(sections.map((s, i) => {
            if (i !== index) return s;
            const updatedSection = { ...s, [field]: value };
            if (field === "questions" || field === "positive") {
                const q = field === "questions" ? (value as number) : s.questions;
                const p = field === "positive" ? (value as number) : s.positive;
                updatedSection.maxMarks = q * p;
            }
            return updatedSection;
        }));
    };

    const applyDefaultsToAll = () => {
        if (!window.confirm("Overwrite +ve/-ve marks for ALL sections?")) return;
        setSections(sections.map(s => ({
            ...s, positive: formData.defaultPositive, negative: formData.defaultNegative,
            maxMarks: s.questions * formData.defaultPositive,
        })));
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setSaving(true); setError("");
        try {
            const sectionConfig: Record<string, SectionConfig> = {};
            sections.forEach((s) => { sectionConfig[s.code] = s; });
            const res = await fetch(`/api/admin/exams/${id}`, {
                method: "PUT", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...formData, sectionConfig }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to update exam");
            router.push(`/admin/exams/${id}`); router.refresh();
        } catch (err) { setError(err instanceof Error ? err.message : "Something went wrong"); }
        finally { setSaving(false); }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-96 gap-3">
            <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
            <p className="text-sm text-gray-400 font-medium">Loading exam…</p>
        </div>
    );

    const inputClasses = "w-full h-9 px-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400 transition-all text-sm font-medium bg-white";
    const labelClasses = "block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5";

    const tabs = [
        { id: "essentials", label: "Essentials", icon: FileText },
        { id: "config", label: "Configuration", icon: Settings },
        { id: "sections", label: "Sections", icon: Layers },
        { id: "links", label: "Dates & Links", icon: Calendar },
    ];

    return (
        <div className="max-w-5xl mx-auto pb-24">
            {/* Header */}
            <div className="flex items-center justify-between gap-4 mb-6 pt-2">
                <div className="flex items-center gap-3">
                    <Link href={`/admin/exams/${id}`} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-xl font-black text-gray-900 leading-none">Edit Exam</h1>
                        <p className="text-xs text-gray-400 font-medium mt-1">{formData.name}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-extrabold uppercase px-2 py-1 rounded-lg border ${formData.isActive ? "bg-emerald-50 border-emerald-200 text-emerald-600" : "bg-red-50 border-red-200 text-red-500"}`}>
                        {formData.isActive ? "Active" : "Inactive"}
                    </span>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-1 rounded-lg border border-gray-200 bg-gray-50 text-gray-500">
                        {formData.status.replace("_", " ")}
                    </span>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 mb-4">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                </div>
            )}

            <div className="flex flex-col lg:flex-row gap-5">
                {/* Sidebar */}
                <div className="w-full lg:w-52 flex-shrink-0">
                    <div className="bg-white rounded-xl border border-gray-100 sticky top-6 overflow-hidden">
                        {tabs.map((tab) => (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                                className={`w-full flex items-center gap-2.5 px-4 py-3 text-xs font-bold border-l-2 transition-all ${activeTab === tab.id
                                    ? "bg-violet-50/50 border-violet-500 text-violet-700"
                                    : "border-transparent text-gray-400 hover:bg-gray-50 hover:text-gray-700"
                                    }`}>
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main */}
                <div className="flex-1 min-w-0">
                    <form onSubmit={handleSubmit} className="space-y-5">

                        {/* Essentials */}
                        {activeTab === "essentials" && (
                            <div className="bg-white p-6 rounded-xl border border-gray-100 space-y-5">
                                <h2 className="text-sm font-black text-gray-900 flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-violet-500" /> Basic Details
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">
                                        <label className={labelClasses}>Exam Name *</label>
                                        <input type="text" name="name" value={formData.name} onChange={handleChange} required className={inputClasses} />
                                    </div>
                                    <div>
                                        <label className={labelClasses}>Slug</label>
                                        <input type="text" value={formData.slug} readOnly className={`${inputClasses} bg-gray-50 text-gray-400 cursor-not-allowed`} />
                                    </div>
                                    <div>
                                        <label className={labelClasses}>Agency</label>
                                        <select name="agency" value={formData.agency} onChange={handleChange} className={inputClasses}>
                                            <option value="SSC">SSC</option><option value="RRB">RRB</option>
                                            <option value="IBPS">IBPS</option><option value="TCS">TCS</option>
                                            <option value="NTA">NTA</option><option value="STATE_GOVT">State Govt</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className={labelClasses}>Year</label>
                                        <input type="number" name="year" value={formData.year} onChange={handleChange} className={inputClasses} />
                                    </div>
                                    <div>
                                        <label className={labelClasses}>Tier / Phase</label>
                                        <input type="text" name="tier" value={formData.tier} onChange={handleChange} className={inputClasses} />
                                    </div>
                                    <div>
                                        <label className={labelClasses}>Status</label>
                                        <select name="status" value={formData.status} onChange={handleChange} className={inputClasses}>
                                            <option value="upcoming">Upcoming</option><option value="active">Active</option>
                                            <option value="answer_key_released">Answer Key Released</option><option value="closed">Closed</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Configuration */}
                        {activeTab === "config" && (
                            <div className="space-y-5">
                                <div className="bg-white p-6 rounded-xl border border-gray-100 space-y-5">
                                    <h2 className="text-sm font-black text-gray-900 flex items-center gap-2">
                                        <Settings className="w-4 h-4 text-violet-500" /> Exam Logic
                                    </h2>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        <div className="p-3 bg-gray-50/80 rounded-xl border border-gray-100">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase block">Total Marks</span>
                                            <span className="text-xl font-black text-gray-900">{formData.totalMarks}</span>
                                        </div>
                                        <div className="p-3 bg-gray-50/80 rounded-xl border border-gray-100">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase block">Questions</span>
                                            <span className="text-xl font-black text-gray-900">{formData.totalQuestions}</span>
                                        </div>
                                        <div>
                                            <label className={labelClasses}>Duration (min)</label>
                                            <input type="number" name="duration" value={formData.duration} onChange={handleChange} className={inputClasses} />
                                        </div>
                                        <div>
                                            <label className={labelClasses}>Priority</label>
                                            <input type="number" name="priorityOrder" value={formData.priorityOrder} onChange={handleChange} className={inputClasses} />
                                        </div>
                                    </div>

                                    <div className="p-4 rounded-xl border border-violet-100 bg-violet-50/30">
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="text-xs font-bold text-violet-800">Defaults for New Sections</h3>
                                            <button type="button" onClick={applyDefaultsToAll} className="text-[10px] font-bold text-violet-600 hover:underline hover:text-violet-800">
                                                Sync to all sections →
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className={labelClasses}>Default +ve</label>
                                                <input type="number" step="0.5" name="defaultPositive" value={formData.defaultPositive} onChange={handleChange} className={inputClasses} />
                                            </div>
                                            <div>
                                                <label className={labelClasses}>Default −ve</label>
                                                <input type="number" step="0.25" name="defaultNegative" value={formData.defaultNegative} onChange={handleChange} className={inputClasses} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        {[
                                            { name: "hasNormalization", label: "Normalization", desc: "Normalize scores across shifts" },
                                            { name: "hasSectionalTiming", label: "Sectional Timing", desc: "Time limits per section" },
                                            { name: "isFeatured", label: "Featured", desc: "Show on homepage" },
                                            { name: "isActive", label: "Active", desc: "Visible in public listings" },
                                        ].map((item) => (
                                            <label key={item.name} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 cursor-pointer hover:border-violet-200 hover:bg-violet-50/30 transition-all group">
                                                <input type="checkbox" name={item.name} checked={(formData as any)[item.name]} onChange={handleChange}
                                                    className="w-4 h-4 rounded accent-violet-500 border-gray-300" />
                                                <div>
                                                    <span className="font-bold text-xs text-gray-700 group-hover:text-gray-900">{item.label}</span>
                                                    <p className="text-[10px] text-gray-400">{item.desc}</p>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Sections */}
                        {activeTab === "sections" && (
                            <div className="bg-white p-6 rounded-xl border border-gray-100 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-sm font-black text-gray-900 flex items-center gap-2">
                                        <Layers className="w-4 h-4 text-violet-500" /> Sections ({sections.length})
                                    </h2>
                                    <button type="button" onClick={addSection}
                                        className="text-xs bg-gray-900 text-white px-3 py-2 rounded-lg hover:bg-gray-800 font-bold flex items-center gap-1 transition-colors">
                                        <Plus className="w-3.5 h-3.5" /> Add Section
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {sections.map((section, index) => (
                                        <div key={index} className="p-3.5 bg-white rounded-xl border border-gray-100 hover:border-violet-200 transition-all group">
                                            <div className="flex flex-col md:flex-row gap-3 items-center">
                                                <div className="flex items-center gap-2 w-full md:w-auto">
                                                    <div className="w-6 h-6 flex items-center justify-center bg-violet-50 text-violet-600 font-bold rounded-lg text-xs">
                                                        {index + 1}
                                                    </div>
                                                    <input type="text" value={section.code}
                                                        onChange={(e) => updateSection(index, "code", e.target.value)}
                                                        className="w-16 px-2 py-1.5 border border-gray-200 rounded-lg text-xs font-mono font-bold uppercase focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
                                                        placeholder="CODE" />
                                                </div>
                                                <input type="text" value={section.label}
                                                    onChange={(e) => updateSection(index, "label", e.target.value)}
                                                    className="flex-1 w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
                                                    placeholder="Section Label" />
                                                <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                                                    <div className="w-20 flex-shrink-0">
                                                        <label className="text-[9px] font-bold text-gray-400 uppercase block mb-0.5">Qs</label>
                                                        <input type="number" value={section.questions} onChange={(e) => updateSection(index, "questions", parseInt(e.target.value) || 0)}
                                                            className="w-full px-2 py-1 border border-gray-200 rounded-lg text-xs focus:border-violet-400 focus:outline-none" />
                                                    </div>
                                                    <div className="w-20 flex-shrink-0">
                                                        <label className="text-[9px] font-bold text-emerald-500 uppercase block mb-0.5">+ve</label>
                                                        <input type="number" step="0.5" value={section.positive} onChange={(e) => updateSection(index, "positive", parseFloat(e.target.value) || 0)}
                                                            className="w-full px-2 py-1 border border-emerald-200 rounded-lg text-xs focus:border-emerald-400 focus:outline-none bg-emerald-50/50" />
                                                    </div>
                                                    <div className="w-20 flex-shrink-0">
                                                        <label className="text-[9px] font-bold text-red-500 uppercase block mb-0.5">−ve</label>
                                                        <input type="number" step="0.25" value={section.negative} onChange={(e) => updateSection(index, "negative", parseFloat(e.target.value) || 0)}
                                                            className="w-full px-2 py-1 border border-red-200 rounded-lg text-xs focus:border-red-400 focus:outline-none bg-red-50/50" />
                                                    </div>
                                                    <div className="w-20 flex-shrink-0">
                                                        <label className="text-[9px] font-bold text-gray-400 uppercase block mb-0.5">Total</label>
                                                        <input type="number" value={section.maxMarks} readOnly
                                                            className="w-full px-2 py-1 border border-gray-200 rounded-lg text-xs bg-gray-50 text-gray-400 cursor-not-allowed font-bold" />
                                                    </div>
                                                </div>
                                                <button type="button" onClick={() => removeSection(index)}
                                                    className="p-1.5 text-gray-300 hover:text-red-500 rounded-lg transition-colors hover:bg-red-50" title="Remove Section">
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {sections.length === 0 && (
                                        <div className="text-center py-10 text-sm text-gray-400 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                                            No sections added yet
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Dates & Links */}
                        {activeTab === "links" && (
                            <div className="bg-white p-6 rounded-xl border border-gray-100 space-y-5">
                                <h2 className="text-sm font-black text-gray-900 flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-violet-500" /> Dates & Links
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <h3 className="text-xs font-bold text-gray-400 uppercase border-b border-gray-100 pb-2">Schedule</h3>
                                        <div>
                                            <label className={labelClasses}>Exam Start Date</label>
                                            <input type="date" name="examStartDate" value={formData.examStartDate} onChange={handleChange} className={inputClasses} />
                                        </div>
                                        <div>
                                            <label className={labelClasses}>Exam End Date</label>
                                            <input type="date" name="examEndDate" value={formData.examEndDate} onChange={handleChange} className={inputClasses} />
                                        </div>
                                        <div>
                                            <label className={labelClasses}>Answer Key Release</label>
                                            <input type="date" name="answerKeyReleaseDate" value={formData.answerKeyReleaseDate} onChange={handleChange} className={inputClasses} />
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <h3 className="text-xs font-bold text-gray-400 uppercase border-b border-gray-100 pb-2 flex items-center gap-1.5"><ExternalLink className="w-3 h-3" /> Resources</h3>
                                        <div>
                                            <label className={labelClasses}>Answer Key URL</label>
                                            <input type="url" name="answerKeyUrl" value={formData.answerKeyUrl} onChange={handleChange} className={inputClasses} placeholder="https://..." />
                                        </div>
                                        <div>
                                            <label className={labelClasses}>Official Website</label>
                                            <input type="url" name="officialWebsite" value={formData.officialWebsite} onChange={handleChange} className={inputClasses} placeholder="https://..." />
                                        </div>
                                        <div>
                                            <label className={labelClasses}>Meta Description</label>
                                            <textarea name="metaDescription" value={formData.metaDescription} onChange={handleChange} rows={3}
                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400 transition-all text-sm font-medium bg-white resize-none" placeholder="SEO description..." />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </form>
                </div>
            </div>

            {/* Sticky Save Bar */}
            <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
                <div className="bg-gray-900 text-white px-2 py-2 rounded-2xl shadow-2xl shadow-gray-900/30 flex items-center gap-1.5 border border-gray-700">
                    <Link href={`/admin/exams/${id}`}
                        className="px-4 py-2 text-xs font-bold hover:bg-gray-800 rounded-xl transition-colors text-gray-400 hover:text-white">
                        Cancel
                    </Link>
                    <button onClick={handleSubmit} disabled={saving}
                        className="px-6 py-2 bg-violet-500 text-white rounded-xl font-bold text-xs hover:bg-violet-600 transition-colors flex items-center gap-2 disabled:opacity-50">
                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}
