"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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

    // Form state
    const [formData, setFormData] = useState({
        name: "",
        slug: "",
        agency: "SSC",
        year: new Date().getFullYear() + 1,
        tier: "Tier-I",
        totalMarks: 200,
        totalQuestions: 100,
        duration: 60,
        defaultPositive: 2,
        defaultNegative: 0.5,
        hasSectionalTiming: false,
        hasNormalization: true,
        allowMultipleSubmissions: false,
        isActive: true,
        status: "upcoming",
        analysisPhase: "collecting",
        isFeatured: false,
        priorityOrder: 0,
        metaDescription: "",
        examStartDate: "",
        examEndDate: "",
        answerKeyReleaseDate: "",
        answerKeyUrl: "",
        officialWebsite: "",
    });

    const [sections, setSections] = useState<SectionConfig[]>([]);

    // Fetch existing exam data
    useEffect(() => {
        async function fetchExam() {
            try {
                const res = await fetch(`/api/admin/exams/${id}`);
                if (!res.ok) throw new Error("Failed to fetch exam");
                const data = await res.json();

                const exam = data.exam;

                // Format dates for input fields
                const formatDate = (dateString: string | null) => {
                    if (!dateString) return "";
                    return new Date(dateString).toISOString().split("T")[0];
                };

                setFormData({
                    name: exam.name,
                    slug: exam.slug,
                    agency: exam.agency,
                    year: exam.year,
                    tier: exam.tier,
                    totalMarks: exam.totalMarks,
                    totalQuestions: exam.totalQuestions,
                    duration: exam.duration,
                    defaultPositive: exam.defaultPositive,
                    defaultNegative: exam.defaultNegative,
                    hasSectionalTiming: exam.hasSectionalTiming,
                    hasNormalization: exam.hasNormalization,
                    allowMultipleSubmissions: exam.allowMultipleSubmissions,
                    isActive: exam.isActive,
                    status: exam.status,
                    analysisPhase: exam.analysisPhase,
                    isFeatured: exam.isFeatured,
                    priorityOrder: exam.priorityOrder,
                    metaDescription: exam.metaDescription || "",
                    examStartDate: formatDate(exam.examStartDate),
                    examEndDate: formatDate(exam.examEndDate),
                    answerKeyReleaseDate: formatDate(exam.answerKeyReleaseDate),
                    answerKeyUrl: exam.answerKeyUrl || "",
                    officialWebsite: exam.officialWebsite || "",
                });

                // Parse section config
                const sectionConfig = exam.sectionConfig as Record<string, SectionConfig>;
                const parsedSections = Object.values(sectionConfig).sort((a, b) => a.order - b.order);
                setSections(parsedSections);

            } catch (err) {
                setError("Failed to load exam data");
                console.error(err);
            } finally {
                setLoading(false);
            }
        }

        fetchExam();
    }, [id]);

    // Auto-calculate totals when sections change
    useEffect(() => {
        if (loading) return; // Skip initial calculation during load
        const totalQ = sections.reduce((sum, sec) => sum + (sec.questions || 0), 0);
        const totalM = sections.reduce((sum, sec) => sum + (sec.maxMarks || 0), 0);

        setFormData(prev => ({
            ...prev,
            totalQuestions: totalQ,
            totalMarks: totalM
        }));
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
        setSections([
            ...sections,
            {
                code: "",
                label: "",
                maxMarks: 25 * formData.defaultPositive,
                questions: 25,
                positive: formData.defaultPositive,
                negative: formData.defaultNegative,
                order: sections.length + 1,
                isQualifying: false
            },
        ]);
    };

    const removeSection = (index: number) => {
        setSections(sections.filter((_, i) => i !== index));
    };

    const updateSection = (index: number, field: keyof SectionConfig, value: string | number | boolean) => {
        setSections(sections.map((s, i) => {
            if (i !== index) return s;

            const updatedSection = { ...s, [field]: value };

            // Auto-calculate max marks if questions or positive marks change
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
            ...s,
            positive: formData.defaultPositive,
            negative: formData.defaultNegative,
            maxMarks: s.questions * formData.defaultPositive // Recalculate max marks
        })));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError("");

        try {
            const sectionConfig: Record<string, SectionConfig> = {};
            sections.forEach((s) => {
                sectionConfig[s.code] = s;
            });

            const res = await fetch(`/api/admin/exams/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...formData, sectionConfig }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to update exam");
            }

            router.push(`/admin/exams/${id}`);
            router.refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <span className="material-symbols-outlined text-4xl text-black animate-spin">autorenew</span>
            </div>
        );
    }

    const inputClasses = "w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all text-sm font-medium bg-white";
    const labelClasses = "block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1";

    const tabs = [
        { id: "essentials", label: "Essentials", icon: "dataset" },
        { id: "config", label: "Configuration", icon: "tune" },
        { id: "sections", label: "Sections", icon: "view_list" },
        { id: "links", label: "Dates & Links", icon: "calendar_month" },
    ];

    return (
        <div className="max-w-6xl mx-auto pb-20">
            {/* Compact Header */}
            <div className="flex items-center justify-between gap-4 mb-6 pt-2">
                <div className="flex items-center gap-3">
                    <Link href={`/admin/exams/${id}`} className="p-2 bg-white border border-gray-300 rounded-lg hover:border-black transition-all text-gray-600 hover:text-black">
                        <span className="material-symbols-outlined block text-lg">arrow_back</span>
                    </Link>
                    <div>
                        <h1 className="text-xl font-black text-gray-900 leading-none">Edit Exam</h1>
                        <p className="text-xs text-gray-500 font-medium mt-1">{formData.name}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <span className={`px-2 py-1 rounded border font-bold text-[10px] uppercase tracking-wider ${formData.isActive ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"}`}>
                        {formData.isActive ? "Active" : "Inactive"}
                    </span>
                    <span className="px-2 py-1 rounded border border-gray-200 bg-gray-50 font-bold text-[10px] uppercase tracking-wider text-gray-600">
                        {formData.status.replace("_", " ")}
                    </span>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 mb-4">
                    <span className="material-symbols-outlined text-lg">error</span>
                    {error}
                </div>
            )}

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Sidebar Navigation */}
                <div className="w-full lg:w-64 flex-shrink-0">
                    <div className="bg-white rounded-xl border-2 border-black shadow-brutal-sm sticky top-6 overflow-hidden">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold border-l-4 transition-all ${activeTab === tab.id
                                        ? "bg-gray-50 border-black text-black"
                                        : "border-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                                    }`}
                            >
                                <span className="material-symbols-outlined text-lg">{tab.icon}</span>
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1">
                    <form onSubmit={handleSubmit} className="space-y-6">

                        {/* Tab: Essentials */}
                        {activeTab === "essentials" && (
                            <div className="bg-white p-6 rounded-xl border-2 border-black shadow-brutal-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <h2 className="text-lg font-black mb-4 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-xl">dataset</span>
                                    Basic Details
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">
                                        <label className={labelClasses}>Exam Name *</label>
                                        <input
                                            type="text"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleChange}
                                            required
                                            className={inputClasses}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClasses}>Slug</label>
                                        <input
                                            type="text"
                                            value={formData.slug}
                                            readOnly
                                            className={`${inputClasses} bg-gray-50 text-gray-500 cursor-not-allowed`}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClasses}>Agency</label>
                                        <select name="agency" value={formData.agency} onChange={handleChange} className={inputClasses}>
                                            <option value="SSC">SSC</option>
                                            <option value="RRB">RRB</option>
                                            <option value="IBPS">IBPS</option>
                                            <option value="TCS">TCS</option>
                                            <option value="NTA">NTA</option>
                                            <option value="STATE_GOVT">State Govt</option>
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
                                            <option value="upcoming">Upcoming</option>
                                            <option value="active">Active</option>
                                            <option value="answer_key_released">Answer Key Released</option>
                                            <option value="closed">Closed</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Tab: Configuration */}
                        {activeTab === "config" && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="bg-white p-6 rounded-xl border-2 border-black shadow-brutal-sm">
                                    <h2 className="text-lg font-black mb-4 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-xl">tune</span>
                                        Exam Logic
                                    </h2>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase block">Total Marks</span>
                                            <span className="text-xl font-black text-gray-900">{formData.totalMarks}</span>
                                        </div>
                                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
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

                                    <div className="p-4 rounded-lg border border-blue-100 bg-blue-50/30 mb-6">
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="text-sm font-bold text-blue-900">Defaults for New Sections</h3>
                                            <button type="button" onClick={applyDefaultsToAll} className="text-[10px] font-bold text-blue-600 hover:underline hover:text-blue-800">
                                                Sync to all sections
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className={labelClasses}>Default +ve</label>
                                                <input type="number" step="0.5" name="defaultPositive" value={formData.defaultPositive} onChange={handleChange} className={inputClasses} />
                                            </div>
                                            <div>
                                                <label className={labelClasses}>Default -ve</label>
                                                <input type="number" step="0.25" name="defaultNegative" value={formData.defaultNegative} onChange={handleChange} className={inputClasses} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        {[
                                            { name: "hasNormalization", label: "Normalization" },
                                            { name: "hasSectionalTiming", label: "Sectional Timing" },
                                            { name: "isFeatured", label: "Featured" },
                                            { name: "isActive", label: "Active" },
                                        ].map((item) => (
                                            <label key={item.name} className="flex items-center gap-2 p-3 rounded-lg border border-gray-200 cursor-pointer hover:border-black hover:bg-gray-50 transition-all">
                                                <input
                                                    type="checkbox"
                                                    name={item.name}
                                                    checked={(formData as any)[item.name]}
                                                    onChange={handleChange}
                                                    className="w-4 h-4 accent-black"
                                                />
                                                <span className="font-bold text-xs text-gray-700">{item.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Tab: Sections */}
                        {activeTab === "sections" && (
                            <div className="bg-white p-6 rounded-xl border-2 border-black shadow-brutal-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-lg font-black flex items-center gap-2">
                                        <span className="material-symbols-outlined text-xl">view_list</span>
                                        Sections ({sections.length})
                                    </h2>
                                    <button
                                        type="button"
                                        onClick={addSection}
                                        className="text-xs bg-black text-white px-3 py-2 rounded-lg hover:bg-gray-800 font-bold flex items-center gap-1 shadow-sm"
                                    >
                                        <span className="material-symbols-outlined text-sm">add</span>
                                        Add Section
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {sections.map((section, index) => (
                                        <div key={index} className="p-3 bg-white rounded-lg border border-gray-200 hover:border-black transition-all group">
                                            <div className="flex flex-col md:flex-row gap-3 items-center">
                                                <div className="flex items-center gap-2 w-full md:w-auto">
                                                    <div className="w-6 h-6 flex items-center justify-center bg-gray-100 text-gray-600 font-bold rounded text-xs border border-gray-200">
                                                        {index + 1}
                                                    </div>
                                                    <input
                                                        type="text"
                                                        value={section.code}
                                                        onChange={(e) => updateSection(index, "code", e.target.value)}
                                                        className="w-16 px-2 py-1.5 border border-gray-300 rounded text-xs font-mono font-bold uppercase focus:border-black focus:outline-none"
                                                        placeholder="CODE"
                                                    />
                                                </div>
                                                <input
                                                    type="text"
                                                    value={section.label}
                                                    onChange={(e) => updateSection(index, "label", e.target.value)}
                                                    className="flex-1 w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:border-black focus:outline-none"
                                                    placeholder="Section Label"
                                                />

                                                <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                                                    <div className="w-20 flex-shrink-0">
                                                        <label className="text-[9px] font-bold text-gray-400 uppercase block mb-0.5">Qs</label>
                                                        <input type="number" value={section.questions} onChange={(e) => updateSection(index, "questions", parseInt(e.target.value) || 0)} className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:border-black focus:outline-none" />
                                                    </div>
                                                    <div className="w-20 flex-shrink-0">
                                                        <label className="text-[9px] font-bold text-green-600 uppercase block mb-0.5">+ve</label>
                                                        <input type="number" step="0.5" value={section.positive} onChange={(e) => updateSection(index, "positive", parseFloat(e.target.value) || 0)} className="w-full px-2 py-1 border border-green-200 rounded text-xs focus:border-green-500 focus:outline-none bg-green-50/50" />
                                                    </div>
                                                    <div className="w-20 flex-shrink-0">
                                                        <label className="text-[9px] font-bold text-red-600 uppercase block mb-0.5">-ve</label>
                                                        <input type="number" step="0.25" value={section.negative} onChange={(e) => updateSection(index, "negative", parseFloat(e.target.value) || 0)} className="w-full px-2 py-1 border border-red-200 rounded text-xs focus:border-red-500 focus:outline-none bg-red-50/50" />
                                                    </div>
                                                    <div className="w-20 flex-shrink-0 relative">
                                                        <label className="text-[9px] font-bold text-gray-400 uppercase block mb-0.5">Total</label>
                                                        <input type="number" value={section.maxMarks} readOnly className="w-full px-2 py-1 border border-gray-200 rounded text-xs bg-gray-100 text-gray-500 cursor-not-allowed font-bold" />
                                                    </div>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() => removeSection(index)}
                                                    className="p-1.5 text-gray-400 hover:text-red-600 rounded transition-colors"
                                                    title="Remove Section"
                                                >
                                                    <span className="material-symbols-outlined text-lg">close</span>
                                                </button>
                                            </div>
                                        </div>
                                    ))}

                                    {sections.length === 0 && (
                                        <div className="text-center py-8 text-sm text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                                            No sections added yet.
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Tab: Dates & Links */}
                        {activeTab === "links" && (
                            <div className="bg-white p-6 rounded-xl border-2 border-black shadow-brutal-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <h2 className="text-lg font-black mb-4 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-xl">calendar_month</span>
                                    Dates & Links
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <h3 className="text-xs font-bold text-gray-400 uppercase border-b pb-2">Schedule</h3>
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
                                        <h3 className="text-xs font-bold text-gray-400 uppercase border-b pb-2">Resources</h3>
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
                                            <textarea name="metaDescription" value={formData.metaDescription} onChange={handleChange} rows={3} className={inputClasses} placeholder="SEO description..." />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                    </form>
                </div>
            </div>

            {/* Sticky Minimal Action Bar */}
            <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-black text-white px-1.5 py-1.5 rounded-full shadow-2xl flex items-center gap-1 z-50">
                <Link
                    href={`/admin/exams/${id}`}
                    className="px-4 py-2 text-xs font-bold hover:bg-gray-800 rounded-full transition-colors text-gray-300 hover:text-white"
                >
                    Cancel
                </Link>
                <button
                    onClick={handleSubmit}
                    disabled={saving}
                    className="px-6 py-2 bg-white text-black rounded-full font-bold text-xs hover:bg-gray-100 transition-colors flex items-center gap-2"
                >
                    {saving ? (
                        <span className="material-symbols-outlined animate-spin text-sm">autorenew</span>
                    ) : (
                        <span className="material-symbols-outlined text-sm">save</span>
                    )}
                    Save Changes
                </button>
            </div>
        </div>
    );
}
