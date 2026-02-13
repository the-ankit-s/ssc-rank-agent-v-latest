"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";

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

const tabs = [
    { id: "essentials", label: "Essentials", icon: "dataset", step: 1 },
    { id: "config", label: "Configuration", icon: "tune", step: 2 },
    { id: "sections", label: "Sections", icon: "view_list", step: 3 },
    { id: "links", label: "Dates & Links", icon: "calendar_month", step: 4 },
];

export default function CreateExamPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [activeTab, setActiveTab] = useState("essentials");

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

    useEffect(() => {
        const totalQ = sections.reduce((sum, sec) => sum + (sec.questions || 0), 0);
        const totalM = sections.reduce((sum, sec) => sum + (sec.maxMarks || 0), 0);
        setFormData(prev => ({ ...prev, totalQuestions: totalQ, totalMarks: totalM }));
    }, [sections]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked :
                type === "number" ? parseFloat(value) : value,
        }));
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
            { code: "", label: "", maxMarks: 25 * formData.defaultPositive, questions: 25, positive: formData.defaultPositive, negative: formData.defaultNegative, order: sections.length + 1, isQualifying: false },
        ]);
    };

    const removeSection = (index: number) => {
        setSections(sections.filter((_, i) => i !== index));
    };

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

    const handleNameBlur = () => {
        if (!formData.slug && formData.name) {
            setFormData((prev) => ({
                ...prev,
                slug: prev.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
            }));
        }
    };

    const applyDefaultsToAll = () => {
        if (!window.confirm("Overwrite +ve/-ve marks for ALL sections?")) return;
        setSections(sections.map(s => ({
            ...s, positive: formData.defaultPositive, negative: formData.defaultNegative,
            maxMarks: s.questions * formData.defaultPositive,
        })));
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        setLoading(true);
        setError("");
        try {
            const sectionConfig: Record<string, SectionConfig> = {};
            sections.forEach((s) => { sectionConfig[s.code] = s; });
            const res = await fetch("/api/admin/exams", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...formData, sectionConfig }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to create exam");
            router.push(`/admin/exams/${data.exam.id}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    const inputCls = "w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-900 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/20 transition-all placeholder:text-gray-400 hover:bg-white";
    const labelCls = "block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5";

    // Tab completion check
    const tabComplete: Record<string, boolean> = {
        essentials: !!(formData.name && formData.agency && formData.year),
        config: formData.totalMarks > 0 && formData.duration > 0,
        sections: sections.length > 0 && sections.every(s => s.code && s.label),
        links: !!(formData.examStartDate),
    };

    const currentTabIndex = tabs.findIndex(t => t.id === activeTab);

    return (
        <div className="max-w-5xl mx-auto pb-24">
            {/* Header */}
            <div className="flex items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <Link href="/admin/exams" className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all">
                        <span className="material-symbols-outlined text-xl">arrow_back</span>
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 tracking-tight">Create Exam</h1>
                        <p className="text-xs text-gray-500 mt-0.5">Configure a new examination lifecycle</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className={cn("px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5",
                        formData.isActive ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"
                    )}>
                        <span className={cn("w-1.5 h-1.5 rounded-full", formData.isActive ? "bg-emerald-500" : "bg-red-500")} />
                        {formData.isActive ? "Active" : "Inactive"}
                    </span>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-2 mb-6">
                    <span className="material-symbols-outlined text-lg">error</span>
                    {error}
                </div>
            )}

            {/* Progress Stepper */}
            <div className="flex items-center gap-1 mb-6 bg-white border border-gray-200 rounded-xl p-1.5">
                {tabs.map((tab, i) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold transition-all relative",
                            activeTab === tab.id
                                ? "bg-indigo-600 text-white shadow-sm"
                                : tabComplete[tab.id]
                                    ? "text-emerald-600 bg-emerald-50/50 hover:bg-emerald-50"
                                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                        )}
                    >
                        {activeTab === tab.id ? (
                            <span className="material-symbols-outlined text-base">{tab.icon}</span>
                        ) : tabComplete[tab.id] ? (
                            <span className="material-symbols-outlined text-base text-emerald-500">check_circle</span>
                        ) : (
                            <span className="w-5 h-5 rounded-full border-2 border-current flex items-center justify-center text-[10px] font-bold">{tab.step}</span>
                        )}
                        <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                ))}
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Main Content */}
                <div className="flex-1">
                    <form onSubmit={handleSubmit}>

                        {/* Tab: Essentials */}
                        {activeTab === "essentials" && (
                            <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-200">
                                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-lg text-indigo-500">dataset</span>
                                    Basic Details
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="md:col-span-2">
                                        <label className={labelCls}>Exam Name *</label>
                                        <input type="text" name="name" value={formData.name} onChange={handleChange} onBlur={handleNameBlur} required className={inputCls} placeholder="e.g. SSC CGL 2024" />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Slug</label>
                                        <input type="text" name="slug" value={formData.slug} readOnly className={cn(inputCls, "bg-gray-100 text-gray-500 cursor-not-allowed")} placeholder="auto-generated" />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Agency</label>
                                        <div className="relative">
                                            <select name="agency" value={formData.agency} onChange={handleChange} className={cn(inputCls, "appearance-none cursor-pointer")}>
                                                <option value="SSC">SSC</option>
                                                <option value="RRB">RRB</option>
                                                <option value="IBPS">IBPS</option>
                                                <option value="TCS">TCS</option>
                                                <option value="NTA">NTA</option>
                                                <option value="STATE_GOVT">State Govt</option>
                                            </select>
                                            <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">expand_more</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className={labelCls}>Year</label>
                                        <input type="number" name="year" value={formData.year} onChange={handleChange} className={inputCls} />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Tier / Phase</label>
                                        <input type="text" name="tier" value={formData.tier} onChange={handleChange} className={inputCls} placeholder="Tier-I" />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Status</label>
                                        <div className="relative">
                                            <select name="status" value={formData.status} onChange={handleChange} className={cn(inputCls, "appearance-none cursor-pointer")}>
                                                <option value="upcoming">Upcoming</option>
                                                <option value="active">Active</option>
                                                <option value="answer_key_released">Answer Key Released</option>
                                                <option value="closed">Closed</option>
                                            </select>
                                            <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">expand_more</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Tab: Configuration */}
                        {activeTab === "config" && (
                            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-200">
                                <div className="bg-white border border-gray-200 rounded-xl p-6">
                                    <h2 className="text-base font-bold text-gray-900 flex items-center gap-2 mb-5">
                                        <span className="material-symbols-outlined text-lg text-indigo-500">tune</span>
                                        Exam Logic
                                    </h2>

                                    {/* Summary stats */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                                        {[
                                            { label: "Total Marks", value: formData.totalMarks, color: "text-indigo-600" },
                                            { label: "Questions", value: formData.totalQuestions, color: "text-violet-600" },
                                        ].map((stat) => (
                                            <div key={stat.label} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                                                <span className="text-[10px] font-semibold text-gray-400 uppercase">{stat.label}</span>
                                                <p className={cn("text-xl font-bold", stat.color)}>{stat.value}</p>
                                            </div>
                                        ))}
                                        <div>
                                            <label className={labelCls}>Duration (min)</label>
                                            <input type="number" name="duration" value={formData.duration} onChange={handleChange} className={inputCls} />
                                        </div>
                                        <div>
                                            <label className={labelCls}>Priority</label>
                                            <input type="number" name="priorityOrder" value={formData.priorityOrder} onChange={handleChange} className={inputCls} />
                                        </div>
                                    </div>

                                    {/* Defaults for sections */}
                                    <div className="p-4 rounded-lg border border-indigo-200 bg-indigo-50/50 mb-6">
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="text-xs font-bold text-indigo-800 flex items-center gap-1.5">
                                                <span className="material-symbols-outlined text-sm">settings_suggest</span>
                                                Section Defaults
                                            </h3>
                                            <button type="button" onClick={applyDefaultsToAll} className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-white px-2.5 py-1 rounded-md border border-indigo-200 hover:shadow-sm transition-all">
                                                Sync to all
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className={labelCls}>Default +ve</label>
                                                <input type="number" step="0.5" name="defaultPositive" value={formData.defaultPositive} onChange={handleChange} className={inputCls} />
                                            </div>
                                            <div>
                                                <label className={labelCls}>Default -ve</label>
                                                <input type="number" step="0.25" name="defaultNegative" value={formData.defaultNegative} onChange={handleChange} className={inputCls} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Toggles */}
                                    <div className="grid grid-cols-2 gap-3">
                                        {[
                                            { name: "hasNormalization", label: "Normalization", icon: "equalizer" },
                                            { name: "hasSectionalTiming", label: "Sectional Timing", icon: "timer" },
                                            { name: "isFeatured", label: "Featured", icon: "star" },
                                            { name: "isActive", label: "Active", icon: "power_settings_new" },
                                        ].map(item => (
                                            <label key={item.name} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition-all group">
                                                <div className="relative flex items-center">
                                                    <input
                                                        type="checkbox"
                                                        name={item.name}
                                                        checked={(formData as any)[item.name]}
                                                        onChange={handleChange}
                                                        className="peer h-4 w-4 cursor-pointer appearance-none rounded border border-gray-300 transition-all checked:border-indigo-600 checked:bg-indigo-600 focus:outline-none"
                                                    />
                                                    <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5" viewBox="0 0 20 20" fill="currentColor">
                                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                        </svg>
                                                    </span>
                                                </div>
                                                <span className="material-symbols-outlined text-sm text-gray-400 group-hover:text-indigo-500">{item.icon}</span>
                                                <span className="font-semibold text-xs text-gray-600 group-hover:text-gray-900">{item.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Tab: Sections */}
                        {activeTab === "sections" && (
                            <div className="bg-white border border-gray-200 rounded-xl p-6 animate-in fade-in slide-in-from-bottom-2 duration-200">
                                <div className="flex items-center justify-between mb-5">
                                    <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-lg text-indigo-500">view_list</span>
                                        Sections ({sections.length})
                                    </h2>
                                    <button type="button" onClick={addSection} className="flex items-center gap-1.5 px-3 py-2 bg-gray-900 text-white rounded-lg text-xs font-semibold hover:bg-black transition-all shadow-sm">
                                        <span className="material-symbols-outlined text-sm">add</span>
                                        Add Section
                                    </button>
                                </div>

                                <div className="space-y-2">
                                    {sections.map((section, index) => (
                                        <div key={index} className="p-3 bg-gray-50/50 rounded-lg border border-gray-200 hover:border-indigo-200 transition-all group">
                                            <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
                                                <div className="flex items-center gap-2 w-full md:w-auto">
                                                    {/* Drag handle visual */}
                                                    <span className="material-symbols-outlined text-gray-300 text-sm cursor-grab">drag_indicator</span>
                                                    <div className="w-6 h-6 flex items-center justify-center rounded text-[10px] font-bold bg-gray-200 text-gray-600 shrink-0">{index + 1}</div>
                                                    <input
                                                        type="text"
                                                        value={section.code}
                                                        onChange={(e) => updateSection(index, "code", e.target.value)}
                                                        className="w-16 px-2 py-1.5 border border-gray-200 rounded-md text-xs font-mono font-bold uppercase focus:border-indigo-400 focus:outline-none bg-white"
                                                        placeholder="CODE"
                                                    />
                                                </div>
                                                <input
                                                    type="text"
                                                    value={section.label}
                                                    onChange={(e) => updateSection(index, "label", e.target.value)}
                                                    className="flex-1 w-full px-2.5 py-1.5 border border-gray-200 rounded-md text-xs font-medium focus:border-indigo-400 focus:outline-none bg-white"
                                                    placeholder="Section Label"
                                                />

                                                <div className="flex gap-2 w-full md:w-auto flex-wrap md:flex-nowrap">
                                                    <div className="w-16 shrink-0">
                                                        <label className="text-[9px] font-bold text-gray-400 uppercase block mb-0.5">Qs</label>
                                                        <input type="number" value={section.questions} onChange={(e) => updateSection(index, "questions", parseInt(e.target.value) || 0)} className="w-full px-2 py-1.5 border border-gray-200 rounded-md text-xs focus:border-indigo-400 focus:outline-none bg-white" />
                                                    </div>
                                                    <div className="w-16 shrink-0">
                                                        <label className="text-[9px] font-bold text-emerald-600 uppercase block mb-0.5">+ve</label>
                                                        <input type="number" step="0.5" value={section.positive} onChange={(e) => updateSection(index, "positive", parseFloat(e.target.value) || 0)} className="w-full px-2 py-1.5 border border-emerald-200 rounded-md text-xs focus:border-emerald-500 focus:outline-none bg-emerald-50/30" />
                                                    </div>
                                                    <div className="w-16 shrink-0">
                                                        <label className="text-[9px] font-bold text-rose-600 uppercase block mb-0.5">-ve</label>
                                                        <input type="number" step="0.25" value={section.negative} onChange={(e) => updateSection(index, "negative", parseFloat(e.target.value) || 0)} className="w-full px-2 py-1.5 border border-rose-200 rounded-md text-xs focus:border-rose-500 focus:outline-none bg-rose-50/30" />
                                                    </div>
                                                    <div className="w-16 shrink-0">
                                                        <label className="text-[9px] font-bold text-gray-400 uppercase block mb-0.5">Total</label>
                                                        <input type="number" value={section.maxMarks} readOnly className="w-full px-2 py-1.5 border border-gray-200 rounded-md text-xs bg-gray-100 text-gray-500 cursor-not-allowed font-bold" />
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-1 shrink-0">
                                                    {/* Qualifying badge */}
                                                    <button
                                                        type="button"
                                                        onClick={() => updateSection(index, "isQualifying", !section.isQualifying)}
                                                        className={cn(
                                                            "px-2 py-1 rounded text-[9px] font-bold uppercase transition-all",
                                                            section.isQualifying
                                                                ? "bg-amber-100 text-amber-700 border border-amber-200"
                                                                : "bg-gray-100 text-gray-400 border border-gray-200 hover:bg-amber-50 hover:text-amber-600"
                                                        )}
                                                        title="Toggle qualifying section"
                                                    >
                                                        Q
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeSection(index)}
                                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all"
                                                        title="Remove"
                                                    >
                                                        <span className="material-symbols-outlined text-base">close</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {sections.length === 0 && (
                                        <div className="text-center py-10 text-sm text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                                            <span className="material-symbols-outlined text-3xl text-gray-300 mb-2 block">view_list</span>
                                            <p className="font-medium">No sections added yet.</p>
                                            <button type="button" onClick={addSection} className="mt-2 text-indigo-600 hover:underline text-xs font-semibold">Add your first section</button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Tab: Dates & Links */}
                        {activeTab === "links" && (
                            <div className="bg-white border border-gray-200 rounded-xl p-6 animate-in fade-in slide-in-from-bottom-2 duration-200">
                                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2 mb-5">
                                    <span className="material-symbols-outlined text-lg text-indigo-500">calendar_month</span>
                                    Dates & Links
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-2">Schedule</h3>
                                        <div>
                                            <label className={labelCls}>Exam Start Date</label>
                                            <input type="date" name="examStartDate" value={formData.examStartDate} onChange={handleChange} className={inputCls} />
                                        </div>
                                        <div>
                                            <label className={labelCls}>Exam End Date</label>
                                            <input type="date" name="examEndDate" value={formData.examEndDate} onChange={handleChange} className={inputCls} />
                                        </div>
                                        <div>
                                            <label className={labelCls}>Answer Key Release</label>
                                            <input type="date" name="answerKeyReleaseDate" value={formData.answerKeyReleaseDate} onChange={handleChange} className={inputCls} />
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-2">Resources</h3>
                                        <div>
                                            <label className={labelCls}>Answer Key URL</label>
                                            <input type="url" name="answerKeyUrl" value={formData.answerKeyUrl} onChange={handleChange} className={inputCls} placeholder="https://..." />
                                        </div>
                                        <div>
                                            <label className={labelCls}>Official Website</label>
                                            <input type="url" name="officialWebsite" value={formData.officialWebsite} onChange={handleChange} className={inputCls} placeholder="https://..." />
                                        </div>
                                        <div>
                                            <label className={labelCls}>Meta Description</label>
                                            <textarea name="metaDescription" value={formData.metaDescription} onChange={handleChange} rows={3} className={inputCls} placeholder="SEO description..." />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                    </form>
                </div>

                {/* Sidebar Preview Card */}
                <div className="w-full lg:w-64 shrink-0">
                    <div className="bg-white border border-gray-200 rounded-xl p-4 sticky top-20 space-y-3">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Preview</h3>
                        <div>
                            <p className="text-sm font-bold text-gray-900">{formData.name || "Untitled Exam"}</p>
                            <p className="text-[10px] text-gray-500 font-mono mt-0.5">/{formData.slug || "..."}</p>
                        </div>
                        <div className="space-y-1.5">
                            {[
                                { label: "Agency", value: formData.agency },
                                { label: "Year", value: formData.year },
                                { label: "Tier", value: formData.tier },
                                { label: "Questions", value: formData.totalQuestions },
                                { label: "Total Marks", value: formData.totalMarks },
                                { label: "Duration", value: `${formData.duration} min` },
                                { label: "Sections", value: sections.length },
                            ].map(item => (
                                <div key={item.label} className="flex justify-between text-xs">
                                    <span className="text-gray-500">{item.label}</span>
                                    <span className="font-semibold text-gray-900">{item.value}</span>
                                </div>
                            ))}
                        </div>
                        {sections.length > 0 && (
                            <div className="pt-2 border-t border-gray-100">
                                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1.5">Sections</p>
                                {sections.map((s, i) => (
                                    <div key={i} className="flex items-center gap-1.5 text-[10px] py-0.5">
                                        <span className="font-mono font-bold text-indigo-600 w-6">{s.code || "?"}</span>
                                        <span className="text-gray-600 truncate">{s.label || "Unnamed"}</span>
                                        <span className="ml-auto text-gray-400">{s.maxMarks}m</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Sticky Action Bar */}
            <div className="fixed bottom-5 left-1/2 transform -translate-x-1/2 bg-white/95 backdrop-blur-lg border border-gray-200 rounded-full shadow-xl shadow-gray-200/50 p-1 flex items-center gap-1 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
                <Link href="/admin/exams" className="px-4 py-2 text-xs font-semibold hover:bg-gray-100 rounded-full transition-colors text-gray-500">
                    Cancel
                </Link>
                {currentTabIndex < tabs.length - 1 && (
                    <button
                        type="button"
                        onClick={() => setActiveTab(tabs[currentTabIndex + 1].id)}
                        className="px-4 py-2 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                    >
                        Next →
                    </button>
                )}
                <button
                    onClick={() => handleSubmit()}
                    disabled={loading}
                    className="px-5 py-2 bg-gray-900 text-white rounded-full font-semibold text-xs hover:bg-black transition-all flex items-center gap-1.5 shadow-sm"
                >
                    {loading ? (
                        <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                    ) : (
                        <span className="material-symbols-outlined text-sm">save</span>
                    )}
                    Create Exam
                </button>
            </div>
        </div>
    );
}
