"use client";

import { useState } from "react";

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

export function SubmissionFiltersPanel({
    filters,
    onFiltersChange,
    exams,
    shifts,
}: SubmissionFiltersProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    const handleChange = (key: keyof SubmissionFilters, value: string | string[]) => {
        onFiltersChange({ ...filters, [key]: value });
    };

    const handleCategoryToggle = (category: string) => {
        const current = filters.category;
        const updated = current.includes(category)
            ? current.filter((c) => c !== category)
            : [...current, category];
        handleChange("category", updated);
    };

    const clearFilters = () => {
        onFiltersChange({
            search: "",
            examId: "all",
            shiftId: "all",
            category: [],
            gender: "all",
            scoreMin: "",
            scoreMax: "",
            rankMin: "",
            rankMax: "",
            dateFrom: "",
            dateTo: "",
            source: "all",
        });
    };

    return (
        <div className="bg-white border-2 border-black shadow-brutal rounded-xl overflow-hidden">
            {/* Header */}
            <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-xl">filter_alt</span>
                    <span className="font-bold text-gray-900">Advanced Filters</span>
                </div>
                <span
                    className={`material-symbols-outlined text-xl transition-transform ${isExpanded ? "rotate-180" : ""}`}
                >
                    expand_more
                </span>
            </button>

            {/* Filters Panel */}
            {isExpanded && (
                <div className="p-4 border-t-2 border-gray-100 space-y-4 animate-in slide-in-from-top-2 duration-300">
                    {/* Search */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                            Search Roll Number / Name
                        </label>
                        <input
                            type="text"
                            placeholder="Search..."
                            value={filters.search}
                            onChange={(e) => handleChange("search", e.target.value)}
                            className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-black outline-none transition-colors"
                        />
                    </div>

                    {/* Exam and Shift */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                Exam
                            </label>
                            <select
                                value={filters.examId}
                                onChange={(e) => handleChange("examId", e.target.value)}
                                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-black outline-none transition-colors"
                            >
                                <option value="all">All Exams</option>
                                {exams.map((exam) => (
                                    <option key={exam.id} value={exam.id}>
                                        {exam.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                Shift
                            </label>
                            <select
                                value={filters.shiftId}
                                onChange={(e) => handleChange("shiftId", e.target.value)}
                                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-black outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={filters.examId === "all"}
                                aria-label={filters.examId === "all" ? "Select an exam first to enable shift filter" : "Select shift"}
                            >
                                <option value="all">All Shifts</option>
                                {shifts.map((shift) => (
                                    <option key={shift.id} value={shift.id}>
                                        {shift.shiftCode}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Category Multi-select */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                            Category
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {["UR", "OBC", "SC", "ST", "EWS"].map((cat) => (
                                <label
                                    key={cat}
                                    className="flex items-center gap-2 px-3 py-2 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-black transition-colors"
                                >
                                    <input
                                        type="checkbox"
                                        checked={filters.category.includes(cat)}
                                        onChange={() => handleCategoryToggle(cat)}
                                        className="w-4 h-4 border-2 border-black rounded accent-black"
                                    />
                                    <span className="text-sm font-bold">{cat}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Gender Radio */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                            Gender
                        </label>
                        <div className="flex gap-2">
                            {["all", "M", "F", "O"].map((g) => (
                                <label
                                    key={g}
                                    className="flex items-center gap-2 px-3 py-2 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-black transition-colors"
                                >
                                    <input
                                        type="radio"
                                        name="gender"
                                        checked={filters.gender === g}
                                        onChange={() => handleChange("gender", g)}
                                        className="w-4 h-4 border-2 border-black accent-black"
                                    />
                                    <span className="text-sm font-bold uppercase">
                                        {g === "all" ? "All" : g}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Score Range */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                Min Score
                            </label>
                            <input
                                type="number"
                                placeholder="Min"
                                value={filters.scoreMin}
                                onChange={(e) => handleChange("scoreMin", e.target.value)}
                                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-black outline-none transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                Max Score
                            </label>
                            <input
                                type="number"
                                placeholder="Max"
                                value={filters.scoreMax}
                                onChange={(e) => handleChange("scoreMax", e.target.value)}
                                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-black outline-none transition-colors"
                            />
                        </div>
                    </div>

                    {/* Rank Range */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                Min Rank
                            </label>
                            <input
                                type="number"
                                placeholder="Min"
                                value={filters.rankMin}
                                onChange={(e) => handleChange("rankMin", e.target.value)}
                                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-black outline-none transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                Max Rank
                            </label>
                            <input
                                type="number"
                                placeholder="Max"
                                value={filters.rankMax}
                                onChange={(e) => handleChange("rankMax", e.target.value)}
                                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-black outline-none transition-colors"
                            />
                        </div>
                    </div>

                    {/* Date Range */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                From Date
                            </label>
                            <input
                                type="date"
                                value={filters.dateFrom}
                                onChange={(e) => handleChange("dateFrom", e.target.value)}
                                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-black outline-none transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                To Date
                            </label>
                            <input
                                type="date"
                                value={filters.dateTo}
                                onChange={(e) => handleChange("dateTo", e.target.value)}
                                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-black outline-none transition-colors"
                            />
                        </div>
                    </div>

                    {/* Source */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                            Source
                        </label>
                        <select
                            value={filters.source}
                            onChange={(e) => handleChange("source", e.target.value)}
                            className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-black outline-none transition-colors"
                        >
                            <option value="all">All Sources</option>
                            <option value="url_parser">URL Parser</option>
                            <option value="manual">Manual</option>
                            <option value="api">API</option>
                        </select>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end pt-2">
                        <button
                            type="button"
                            onClick={clearFilters}
                            className="px-4 py-2 bg-white text-gray-700 font-bold border-2 border-gray-200 rounded-lg hover:border-black hover:text-black transition-all"
                        >
                            Clear All
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
