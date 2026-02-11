"use client";

import { useState, useEffect } from "react";
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

export default function CreateExamPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [activeTab, setActiveTab] = useState("essentials");

    // Form state
    const [formData, setFormData] = useState({
        name: `SSC CGL ${new Date().getFullYear() + 1}`,
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

    const [sections, setSections] = useState<SectionConfig[]>([
        { code: "GI", label: "General Intelligence", maxMarks: 50, questions: 25, positive: 2, negative: 0.5, order: 1, isQualifying: false },
        { code: "QA", label: "Quantitative Aptitude", maxMarks: 50, questions: 25, positive: 2, negative: 0.5, order: 2, isQualifying: false },
        { code: "EN", label: "English Comprehension", maxMarks: 50, questions: 25, positive: 2, negative: 0.5, order: 3, isQualifying: false },
        { code: "GA", label: "General Awareness", maxMarks: 50, questions: 25, positive: 2, negative: 0.5, order: 4, isQualifying: false },
    ]);

    // Auto-calculate totals when sections change
    useEffect(() => {
        const totalQ = sections.reduce((sum, sec) => sum + (sec.questions || 0), 0);
        const totalM = sections.reduce((sum, sec) => sum + (sec.maxMarks || 0), 0);

        setFormData(prev => ({
            ...prev,
            totalQuestions: totalQ,
            totalMarks: totalM
        }));
    }, [sections]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked :
                type === "number" ? parseFloat(value) : value,
        }));

        // Auto-generate slug from name
        if (name === "name") {
            setFormData((prev) => ({
                ...prev,
                slug: value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
            }));
        }
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

    // Helper: auto-generate slug on blur if empty
    const handleNameBlur = () => {
        if (!formData.slug && formData.name) {
            setFormData((prev) => ({
                ...prev,
                slug: prev.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
            }));
        }
    }

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
        setLoading(true);
        setError("");

        try {
            const sectionConfig: Record<string, SectionConfig> = {};
            sections.forEach((s) => {
                sectionConfig[s.code] = s;
            });

            const res = await fetch("/api/admin/exams", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...formData, sectionConfig }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to create exam");
            }

            router.push(`/admin/exams/${data.exam.id}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    const inputClasses = "w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all text-sm font-medium bg-gray-50/50 hover:bg-white";
    const labelClasses = "block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5";

    const tabs = [
        { id: "essentials", label: "Essentials", icon: "dataset" },
        { id: "config", label: "Configuration", icon: "tune" },
        { id: "sections", label: "Sections", icon: "view_list" },
        { id: "links", label: "Dates & Links", icon: "calendar_month" },
    ];

    return (
        <div className="max-w-6xl mx-auto pb-24">
            {/* Header */}
            <div className="flex items-center justify-between gap-4 mb-8 pt-2">
                <div className="flex items-center gap-4">
                    <Link href="/admin/exams" className="p-2.5 bg-white border border-gray-200 rounded-xl hover:border-violet-500 hover:text-violet-600 transition-all text-gray-400 shadow-sm">
                        <span className="material-symbols-outlined block text-xl">arrow_back</span>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 leading-none tracking-tight">Create Exam</h1>
                        <p className="text-sm text-gray-500 font-medium mt-1">Configure a new examination lifecycle</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <span className={`px-3 py-1.5 rounded-lg border font-bold text-xs uppercase tracking-wider flex items-center gap-2 ${formData.isActive ? "bg-emerald-50 border-emerald-100 text-emerald-700" : "bg-red-50 border-red-100 text-red-700"}`}>
                        <span className={`w-2 h-2 rounded-full ${formData.isActive ? "bg-emerald-500" : "bg-red-500"}`}></span>
                        {formData.isActive ? "Active" : "Inactive"}
                    </span>
                    <span className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white font-bold text-xs uppercase tracking-wider text-gray-600">
                        {formData.status.replace("_", " ")}
                    </span>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-100 text-red-700 px-6 py-4 rounded-2xl text-sm font-medium flex items-center gap-3 mb-6 shadow-sm">
                    <span className="material-symbols-outlined text-xl">error</span>
                    {error}
                </div>
            )}

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Sidebar Navigation */}
                <div className="w-full lg:w-64 flex-shrink-0">
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-100/50 sticky top-24 overflow-hidden p-2">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full flex items-center gap-3 px-4 py-3.5 text-sm font-bold rounded-xl transition-all mb-1 ${activeTab === tab.id
                                    ? "bg-violet-600 text-white shadow-lg shadow-violet-200"
                                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                                    }`}
                            >
                                <span className={`material-symbols-outlined text-xl ${activeTab === tab.id ? "text-white" : "text-gray-400"}`}>{tab.icon}</span>
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
                            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl shadow-gray-100/50 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-gray-900">
                                    <span className="p-2 bg-violet-50 text-violet-600 rounded-lg">
                                        <span className="material-symbols-outlined text-xl">dataset</span>
                                    </span>
                                    Basic Details
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2">
                                        <label className={labelClasses}>Exam Name *</label>
                                        <input
                                            type="text"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleChange}
                                            onBlur={handleNameBlur}
                                            required
                                            className={inputClasses}
                                            placeholder="e.g. SSC CGL 2024"
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClasses}>Slug</label>
                                        <input
                                            type="text"
                                            name="slug"
                                            value={formData.slug}
                                            onChange={handleChange}
                                            className={`${inputClasses} bg-gray-100 text-gray-500 cursor-not-allowed`}
                                            placeholder="auto-generated"
                                            readOnly
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClasses}>Agency</label>
                                        <div className="relative">
                                            <select name="agency" value={formData.agency} onChange={handleChange} className={`${inputClasses} appearance-none`}>
                                                <option value="SSC">SSC</option>
                                                <option value="RRB">RRB</option>
                                                <option value="IBPS">IBPS</option>
                                                <option value="TCS">TCS</option>
                                                <option value="NTA">NTA</option>
                                                <option value="STATE_GOVT">State Govt</option>
                                            </select>
                                            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">expand_more</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className={labelClasses}>Year</label>
                                        <input type="number" name="year" value={formData.year} onChange={handleChange} className={inputClasses} />
                                    </div>
                                    <div>
                                        <label className={labelClasses}>Tier / Phase</label>
                                        <input type="text" name="tier" value={formData.tier} onChange={handleChange} className={inputClasses} placeholder="Tier-I" />
                                    </div>
                                    <div>
                                        <label className={labelClasses}>Status</label>
                                        <div className="relative">
                                            <select name="status" value={formData.status} onChange={handleChange} className={`${inputClasses} appearance-none`}>
                                                <option value="upcoming">Upcoming</option>
                                                <option value="active">Active</option>
                                                <option value="answer_key_released">Answer Key Released</option>
                                                <option value="closed">Closed</option>
                                            </select>
                                            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">expand_more</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Tab: Configuration */}
                        {activeTab === "config" && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl shadow-gray-100/50">
                                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-gray-900">
                                        <span className="p-2 bg-violet-50 text-violet-600 rounded-lg">
                                            <span className="material-symbols-outlined text-xl">tune</span>
                                        </span>
                                        Exam Logic
                                    </h2>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                                        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-violet-200 transition-colors">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Total Marks</span>
                                            <span className="text-2xl font-black text-gray-900">{formData.totalMarks}</span>
                                        </div>
                                        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-violet-200 transition-colors">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Questions</span>
                                            <span className="text-2xl font-black text-gray-900">{formData.totalQuestions}</span>
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

                                    <div className="p-6 rounded-2xl border border-blue-100 bg-blue-50/50 mb-8">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-sm font-bold text-blue-900 flex items-center gap-2">
                                                <span className="material-symbols-outlined text-lg">settings_suggest</span>
                                                Defaults for New Sections
                                            </h3>
                                            <button type="button" onClick={applyDefaultsToAll} className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-white px-3 py-1.5 rounded-lg border border-blue-200 shadow-sm hover:shadow-md transition-all">
                                                Sync to all sections
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-6">
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

                                    <div className="grid grid-cols-2 gap-4">
                                        {[
                                            { name: "hasNormalization", label: "Normalization" },
                                            { name: "hasSectionalTiming", label: "Sectional Timing" },
                                            { name: "isFeatured", label: "Featured" },
                                            { name: "isActive", label: "Active" },
                                        ].map((item) => (
                                            <label key={item.name} className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 cursor-pointer hover:border-violet-500 hover:bg-violet-50 transition-all group">
                                                <div className="relative flex items-center">
                                                    <input
                                                        type="checkbox"
                                                        name={item.name}
                                                        checked={(formData as any)[item.name]}
                                                        onChange={handleChange}
                                                        className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-gray-300 transition-all checked:border-violet-600 checked:bg-violet-600 focus:outline-none"
                                                    />
                                                    <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                        </svg>
                                                    </span>
                                                </div>
                                                <span className="font-bold text-sm text-gray-600 group-hover:text-violet-700">{item.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Tab: Sections */}
                        {activeTab === "sections" && (
                            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl shadow-gray-100/50 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-xl font-bold flex items-center gap-2 text-gray-900">
                                        <span className="p-2 bg-violet-50 text-violet-600 rounded-lg">
                                            <span className="material-symbols-outlined text-xl">view_list</span>
                                        </span>
                                        Sections ({sections.length})
                                    </h2>
                                    <button
                                        type="button"
                                        onClick={addSection}
                                        className="text-xs bg-gray-900 text-white px-4 py-2.5 rounded-xl hover:bg-black font-bold flex items-center gap-2 shadow-lg hover:shadow-xl transition-all"
                                    >
                                        <span className="material-symbols-outlined text-sm">add</span>
                                        Add Section
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {sections.map((section, index) => (
                                        <div key={index} className="p-4 bg-white rounded-2xl border border-gray-200 hover:border-violet-300 hover:shadow-md transition-all group">
                                            <div className="flex flex-col md:flex-row gap-4 items-center">
                                                <div className="flex items-center gap-3 w-full md:w-auto">
                                                    <div className="w-8 h-8 flex items-center justify-center bg-gray-100 text-gray-500 font-bold rounded-lg text-xs border border-gray-200 group-hover:bg-violet-50 group-hover:text-violet-600 group-hover:border-violet-100 transition-colors">
                                                        {index + 1}
                                                    </div>
                                                    <input
                                                        type="text"
                                                        value={section.code}
                                                        onChange={(e) => updateSection(index, "code", e.target.value)}
                                                        className="w-20 px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono font-bold uppercase focus:border-violet-500 focus:outline-none bg-gray-50/50"
                                                        placeholder="CODE"
                                                    />
                                                </div>
                                                <input
                                                    type="text"
                                                    value={section.label}
                                                    onChange={(e) => updateSection(index, "label", e.target.value)}
                                                    className="flex-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium focus:border-violet-500 focus:outline-none bg-gray-50/50"
                                                    placeholder="Section Label"
                                                />

                                                <div className="flex gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                                                    <div className="w-20 flex-shrink-0">
                                                        <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Qs</label>
                                                        <input type="number" value={section.questions} onChange={(e) => updateSection(index, "questions", parseInt(e.target.value) || 0)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-violet-500 focus:outline-none bg-gray-50/50" />
                                                    </div>
                                                    <div className="w-20 flex-shrink-0">
                                                        <label className="text-[10px] font-bold text-emerald-600 uppercase block mb-1">+ve</label>
                                                        <input type="number" step="0.5" value={section.positive} onChange={(e) => updateSection(index, "positive", parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 border border-emerald-100 rounded-lg text-sm focus:border-emerald-500 focus:outline-none bg-emerald-50/30" />
                                                    </div>
                                                    <div className="w-20 flex-shrink-0">
                                                        <label className="text-[10px] font-bold text-rose-600 uppercase block mb-1">-ve</label>
                                                        <input type="number" step="0.25" value={section.negative} onChange={(e) => updateSection(index, "negative", parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 border border-rose-100 rounded-lg text-sm focus:border-rose-500 focus:outline-none bg-rose-50/30" />
                                                    </div>
                                                    <div className="w-20 flex-shrink-0 relative">
                                                        <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Total</label>
                                                        <input type="number" value={section.maxMarks} readOnly className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-100 text-gray-500 cursor-not-allowed font-bold" />
                                                    </div>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() => removeSection(index)}
                                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                    title="Remove Section"
                                                >
                                                    <span className="material-symbols-outlined text-xl">delete</span>
                                                </button>
                                            </div>
                                        </div>
                                    ))}

                                    {sections.length === 0 && (
                                        <div className="text-center py-12 text-sm text-gray-500 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                                            <p className="font-medium">No sections added yet.</p>
                                            <button onClick={addSection} className="mt-2 text-violet-600 hover:underline">Add your first section</button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Tab: Dates & Links */}
                        {activeTab === "links" && (
                            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl shadow-gray-100/50 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-gray-900">
                                    <span className="p-2 bg-violet-50 text-violet-600 rounded-lg">
                                        <span className="material-symbols-outlined text-xl">calendar_month</span>
                                    </span>
                                    Dates & Links
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-6">
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
                                            <label className={labelClasses}>Answer Key Release Expectation</label>
                                            <input type="date" name="answerKeyReleaseDate" value={formData.answerKeyReleaseDate} onChange={handleChange} className={inputClasses} />
                                        </div>
                                    </div>
                                    <div className="space-y-6">
                                        <h3 className="text-xs font-bold text-gray-400 uppercase border-b border-gray-100 pb-2">Resources</h3>
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

            {/* Sticky Modern Action Bar */}
            <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur-md border border-gray-200 rounded-full shadow-2xl p-1.5 flex items-center gap-2 z-50 animate-in slide-in-from-bottom-10 fade-in duration-500">
                <Link
                    href="/admin/exams"
                    className="px-5 py-2.5 text-xs font-bold hover:bg-gray-100 rounded-full transition-colors text-gray-600"
                >
                    Cancel
                </Link>
                <div className="w-px h-6 bg-gray-200"></div>
                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="px-6 py-2.5 bg-gray-900 text-white rounded-full font-bold text-xs hover:bg-black hover:shadow-lg hover:shadow-gray-900/20 transition-all flex items-center gap-2"
                >
                    {loading ? (
                        <span className="material-symbols-outlined animate-spin text-sm">autorenew</span>
                    ) : (
                        <span className="material-symbols-outlined text-sm">save</span>
                    )}
                    Create Exam
                </button>
            </div>

            {/* Background decoration */}
            <div className="fixed top-0 left-0 right-0 h-64 bg-gradient-to-b from-gray-50 to-transparent -z-10 pointer-events-none"></div>
        </div>
    );
}
