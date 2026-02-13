"use client";

import { useState } from "react";
import { Filter, ChevronDown, X, Search } from "lucide-react";

export interface SubmissionFilters {
    search: string;
    examId: string;
    shiftId: string;
    category: string[];
    gender: string;
    scoreMin: string;
    scoreMax: string;
    rankMin: string;
    rankMax: string;
    dateFrom: string;
    dateTo: string;
    source: string;
}

interface SubmissionFiltersProps {
    filters: SubmissionFilters;
    onFiltersChange: (filters: SubmissionFilters) => void;
    exams: Array<{ id: number; name: string }>;
    shifts: Array<{ id: number; shiftCode: string }>;
}

export function SubmissionFiltersPanel({ filters, onFiltersChange, exams, shifts }: SubmissionFiltersProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    const handleChange = (key: keyof SubmissionFilters, value: string | string[]) => {
        onFiltersChange({ ...filters, [key]: value });
    };

    const handleCategoryToggle = (category: string) => {
        const current = filters.category;
        const updated = current.includes(category) ? current.filter(c => c !== category) : [...current, category];
        handleChange("category", updated);
    };

    const clearFilters = () => {
        onFiltersChange({
            search: "", examId: "all", shiftId: "all", category: [], gender: "all",
            scoreMin: "", scoreMax: "", rankMin: "", rankMax: "", dateFrom: "", dateTo: "", source: "all",
        });
    };

    const activeCount = [
        filters.search, filters.examId !== "all" ? "1" : "", filters.shiftId !== "all" ? "1" : "",
        filters.category.length > 0 ? "1" : "", filters.gender !== "all" ? "1" : "",
        filters.scoreMin, filters.scoreMax, filters.rankMin, filters.rankMax,
        filters.dateFrom, filters.dateTo, filters.source !== "all" ? "1" : "",
    ].filter(Boolean).length;

    const inputClasses = "w-full h-9 px-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400 transition-all text-xs font-medium bg-white";
    const labelClasses = "block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5";

    return (
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
            <button type="button" onClick={() => setIsExpanded(!isExpanded)}
                className="w-full p-3.5 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-gray-400" />
                    <span className="font-bold text-sm text-gray-700">Filters</span>
                    {activeCount > 0 && (
                        <span className="text-[10px] font-bold bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded-full">{activeCount}</span>
                    )}
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
            </button>

            {isExpanded && (
                <div className="p-4 border-t border-gray-100 space-y-4">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300" />
                        <input type="text" placeholder="Search roll number or name…" value={filters.search}
                            onChange={(e) => handleChange("search", e.target.value)}
                            className="w-full h-9 pl-9 pr-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400 transition-all text-xs font-medium" />
                    </div>

                    {/* Exam & Shift */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={labelClasses}>Exam</label>
                            <select value={filters.examId} onChange={(e) => handleChange("examId", e.target.value)} className={inputClasses}>
                                <option value="all">All Exams</option>
                                {exams.map(exam => <option key={exam.id} value={exam.id}>{exam.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={labelClasses}>Shift</label>
                            <select value={filters.shiftId} onChange={(e) => handleChange("shiftId", e.target.value)}
                                className={`${inputClasses} ${filters.examId === "all" ? "opacity-50 cursor-not-allowed" : ""}`}
                                disabled={filters.examId === "all"}>
                                <option value="all">All Shifts</option>
                                {shifts.map(shift => <option key={shift.id} value={shift.id}>{shift.shiftCode}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Category */}
                    <div>
                        <label className={labelClasses}>Category</label>
                        <div className="flex flex-wrap gap-1.5">
                            {["UR", "OBC", "SC", "ST", "EWS"].map(cat => (
                                <button key={cat} type="button" onClick={() => handleCategoryToggle(cat)}
                                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors ${filters.category.includes(cat) ? "bg-violet-500 text-white border-violet-500" : "bg-white text-gray-500 border-gray-200 hover:border-violet-300"
                                        }`}>
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Gender */}
                    <div>
                        <label className={labelClasses}>Gender</label>
                        <div className="flex gap-1.5">
                            {[{ value: "all", label: "All" }, { value: "M", label: "Male" }, { value: "F", label: "Female" }, { value: "O", label: "Other" }].map(g => (
                                <button key={g.value} type="button" onClick={() => handleChange("gender", g.value)}
                                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors ${filters.gender === g.value ? "bg-violet-500 text-white border-violet-500" : "bg-white text-gray-500 border-gray-200 hover:border-violet-300"
                                        }`}>
                                    {g.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Score & Rank Ranges */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div><label className={labelClasses}>Min Score</label><input type="number" placeholder="Min" value={filters.scoreMin} onChange={(e) => handleChange("scoreMin", e.target.value)} className={inputClasses} /></div>
                        <div><label className={labelClasses}>Max Score</label><input type="number" placeholder="Max" value={filters.scoreMax} onChange={(e) => handleChange("scoreMax", e.target.value)} className={inputClasses} /></div>
                        <div><label className={labelClasses}>Min Rank</label><input type="number" placeholder="Min" value={filters.rankMin} onChange={(e) => handleChange("rankMin", e.target.value)} className={inputClasses} /></div>
                        <div><label className={labelClasses}>Max Rank</label><input type="number" placeholder="Max" value={filters.rankMax} onChange={(e) => handleChange("rankMax", e.target.value)} className={inputClasses} /></div>
                    </div>

                    {/* Date Range & Source */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <div><label className={labelClasses}>From Date</label><input type="date" value={filters.dateFrom} onChange={(e) => handleChange("dateFrom", e.target.value)} className={inputClasses} /></div>
                        <div><label className={labelClasses}>To Date</label><input type="date" value={filters.dateTo} onChange={(e) => handleChange("dateTo", e.target.value)} className={inputClasses} /></div>
                        <div><label className={labelClasses}>Source</label>
                            <select value={filters.source} onChange={(e) => handleChange("source", e.target.value)} className={inputClasses}>
                                <option value="all">All Sources</option><option value="url_parser">URL Parser</option>
                                <option value="manual">Manual</option><option value="api">API</option>
                            </select>
                        </div>
                    </div>

                    {/* Clear */}
                    {activeCount > 0 && (
                        <div className="flex justify-end pt-1">
                            <button type="button" onClick={clearFilters}
                                className="px-3 py-1.5 text-xs font-bold text-gray-500 hover:text-gray-700 hover:bg-gray-50 border border-gray-200 rounded-lg transition-colors flex items-center gap-1">
                                <X className="w-3 h-3" /> Clear All
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
