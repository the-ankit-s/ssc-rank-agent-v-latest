"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface Response {
    qNo: number;
    section: string;
    selected: string | null;
    correct: string;
    isCorrect: boolean;
}

interface ResponseSheetTableProps {
    responses: Response[];
    sections: string[];
}

export function ResponseSheetTable({ responses, sections }: ResponseSheetTableProps) {
    const [filter, setFilter] = useState<"all" | "correct" | "wrong" | "unattempted">("all");
    const [sectionFilter, setSectionFilter] = useState<string>("all");

    const filteredResponses = responses.filter((r) => {
        // Apply status filter
        if (filter === "correct" && !r.isCorrect) return false;
        if (filter === "wrong" && (r.isCorrect || r.selected === null)) return false;
        if (filter === "unattempted" && r.selected !== null) return false;

        // Apply section filter
        if (sectionFilter !== "all" && r.section !== sectionFilter) return false;

        return true;
    });

    const getRowBgColor = (response: Response) => {
        if (response.selected === null) return "bg-gray-50";
        if (response.isCorrect) return "bg-green-50";
        return "bg-red-50";
    };

    const getStatusIcon = (response: Response) => {
        if (response.selected === null)
            return <span className="text-gray-400">—</span>;
        if (response.isCorrect)
            return (
                <span className="material-symbols-outlined text-green-600">
                    check_circle
                </span>
            );
        return <span className="material-symbols-outlined text-red-600">cancel</span>;
    };

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
                <div className="flex gap-2 flex-wrap">
                    <button
                        type="button"
                        onClick={() => setFilter("all")}
                        className={cn(
                            "px-4 py-2 rounded-lg border-2 font-bold text-sm transition-all",
                            filter === "all"
                                ? "bg-blue-500 text-white border-black"
                                : "bg-white text-gray-700 border-gray-200 hover:border-black"
                        )}
                    >
                        All
                    </button>
                    <button
                        type="button"
                        onClick={() => setFilter("correct")}
                        className={cn(
                            "px-4 py-2 rounded-lg border-2 font-bold text-sm transition-all",
                            filter === "correct"
                                ? "bg-green-500 text-white border-black"
                                : "bg-white text-gray-700 border-gray-200 hover:border-black"
                        )}
                    >
                        Correct
                    </button>
                    <button
                        type="button"
                        onClick={() => setFilter("wrong")}
                        className={cn(
                            "px-4 py-2 rounded-lg border-2 font-bold text-sm transition-all",
                            filter === "wrong"
                                ? "bg-red-500 text-white border-black"
                                : "bg-white text-gray-700 border-gray-200 hover:border-black"
                        )}
                    >
                        Wrong
                    </button>
                    <button
                        type="button"
                        onClick={() => setFilter("unattempted")}
                        className={cn(
                            "px-4 py-2 rounded-lg border-2 font-bold text-sm transition-all",
                            filter === "unattempted"
                                ? "bg-gray-500 text-white border-black"
                                : "bg-white text-gray-700 border-gray-200 hover:border-black"
                        )}
                    >
                        Unattempted
                    </button>
                </div>

                <div>
                    <select
                        value={sectionFilter}
                        onChange={(e) => setSectionFilter(e.target.value)}
                        className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-black outline-none transition-colors font-bold text-sm"
                    >
                        <option value="all">All Sections</option>
                        {sections.map((section) => (
                            <option key={section} value={section}>
                                {section}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="border-2 border-black rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-100 border-b-2 border-black">
                            <tr>
                                <th className="px-4 py-3 text-xs font-bold text-gray-900 uppercase border-r border-gray-300">
                                    Q#
                                </th>
                                <th className="px-4 py-3 text-xs font-bold text-gray-900 uppercase border-r border-gray-300">
                                    Section
                                </th>
                                <th className="px-4 py-3 text-xs font-bold text-gray-900 uppercase border-r border-gray-300">
                                    Your Answer
                                </th>
                                <th className="px-4 py-3 text-xs font-bold text-gray-900 uppercase border-r border-gray-300">
                                    Correct Answer
                                </th>
                                <th className="px-4 py-3 text-xs font-bold text-gray-900 uppercase border-r border-gray-300">
                                    Status
                                </th>
                                <th className="px-4 py-3 text-xs font-bold text-gray-900 uppercase">
                                    Marks
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredResponses.map((response) => (
                                <tr
                                    key={response.qNo}
                                    className={cn("transition-colors", getRowBgColor(response))}
                                >
                                    <td className="px-4 py-3 font-bold text-gray-900 border-r border-gray-200">
                                        {response.qNo}
                                    </td>
                                    <td className="px-4 py-3 font-medium text-gray-700 border-r border-gray-200">
                                        <span className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-bold">
                                            {response.section}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 font-bold text-gray-900 border-r border-gray-200">
                                        {response.selected || "—"}
                                    </td>
                                    <td className="px-4 py-3 font-bold text-gray-900 border-r border-gray-200">
                                        {response.correct}
                                    </td>
                                    <td className="px-4 py-3 border-r border-gray-200">
                                        {getStatusIcon(response)}
                                    </td>
                                    <td className="px-4 py-3 font-bold text-gray-900">
                                        {response.selected === null
                                            ? "0"
                                            : response.isCorrect
                                              ? "+1"
                                              : "-0.25"}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Summary */}
            <div className="text-sm font-medium text-gray-600">
                Showing {filteredResponses.length} of {responses.length} questions
            </div>
        </div>
    );
}
