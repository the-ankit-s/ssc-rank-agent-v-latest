"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface DuplicateSubmission {
    id: number;
    name: string;
    rawScore: number;
    normalizedScore: number | null;
    overallRank: number | null;
    createdAt: string;
    source: string;
}

interface DuplicateGroupCardProps {
    rollNumber: string;
    examName: string;
    submissions: DuplicateSubmission[];
    onResolve: (action: "keep_first" | "keep_latest" | "keep_selected", selectedId?: number) => void;
}

export function DuplicateGroupCard({
    rollNumber,
    examName,
    submissions,
    onResolve,
}: DuplicateGroupCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [selectedId, setSelectedId] = useState<number | null>(null);

    const handleResolve = (action: "keep_first" | "keep_latest" | "keep_selected") => {
        if (action === "keep_selected" && selectedId) {
            onResolve(action, selectedId);
        } else {
            onResolve(action);
        }
    };

    return (
        <div className="bg-white border-2 border-black shadow-brutal rounded-xl overflow-hidden">
            {/* Header */}
            <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 border-2 border-black rounded-lg text-red-600">
                        <span className="material-symbols-outlined">content_copy</span>
                    </div>
                    <div className="text-left">
                        <div className="font-black text-gray-900">
                            {rollNumber} • {examName}
                        </div>
                        <div className="text-sm font-medium text-red-600">
                            {submissions.length} duplicates found
                        </div>
                    </div>
                </div>
                <span
                    className={cn(
                        "material-symbols-outlined text-xl transition-transform",
                        isExpanded ? "rotate-180" : ""
                    )}
                >
                    expand_more
                </span>
            </button>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="border-t-2 border-gray-100 p-4 space-y-4 animate-in slide-in-from-top-2 duration-300">
                    {/* Submissions Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {submissions.map((submission) => (
                            <div
                                key={submission.id}
                                className={cn(
                                    "p-4 border-2 rounded-lg transition-all cursor-pointer",
                                    selectedId === submission.id
                                        ? "border-blue-500 bg-blue-50"
                                        : "border-gray-200 hover:border-gray-400"
                                )}
                                onClick={() => setSelectedId(submission.id)}
                            >
                                {/* Radio Button */}
                                <div className="flex items-center gap-2 mb-3">
                                    <input
                                        type="radio"
                                        checked={selectedId === submission.id}
                                        onChange={() => setSelectedId(submission.id)}
                                        className="w-4 h-4 border-2 border-black accent-blue-500"
                                    />
                                    <span className="text-xs font-bold text-gray-500">
                                        ID: {submission.id}
                                    </span>
                                </div>

                                {/* Details */}
                                <div className="space-y-2">
                                    <div>
                                        <div className="text-xs font-bold text-gray-500 uppercase">
                                            Name
                                        </div>
                                        <div className="font-bold text-gray-900">
                                            {submission.name}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <div className="text-xs font-bold text-gray-500 uppercase">
                                                Raw Score
                                            </div>
                                            <div className="font-bold text-gray-900">
                                                {submission.rawScore.toFixed(2)}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-gray-500 uppercase">
                                                Norm Score
                                            </div>
                                            <div className="font-bold text-gray-900">
                                                {submission.normalizedScore?.toFixed(2) || "N/A"}
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="text-xs font-bold text-gray-500 uppercase">
                                            Rank
                                        </div>
                                        <div className="font-bold text-gray-900">
                                            #{submission.overallRank || "N/A"}
                                        </div>
                                    </div>

                                    <div>
                                        <div className="text-xs font-bold text-gray-500 uppercase">
                                            Submitted
                                        </div>
                                        <div className="text-sm font-medium text-gray-700">
                                            {formatDistanceToNow(new Date(submission.createdAt), {
                                                addSuffix: true,
                                            })}
                                        </div>
                                    </div>

                                    <div>
                                        <span className="inline-flex items-center px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs font-bold text-gray-700">
                                            {submission.source}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Resolution Actions */}
                    <div className="flex flex-wrap gap-2 pt-4 border-t-2 border-gray-100">
                        <button
                            type="button"
                            onClick={() => handleResolve("keep_first")}
                            className="px-4 py-2 bg-blue-500 text-white font-bold border-2 border-black rounded-lg shadow-brutal hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all text-sm"
                        >
                            Keep First
                        </button>
                        <button
                            type="button"
                            onClick={() => handleResolve("keep_latest")}
                            className="px-4 py-2 bg-green-500 text-white font-bold border-2 border-black rounded-lg shadow-brutal hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all text-sm"
                        >
                            Keep Latest
                        </button>
                        <button
                            type="button"
                            onClick={() => handleResolve("keep_selected")}
                            disabled={!selectedId}
                            className="px-4 py-2 bg-purple-500 text-white font-bold border-2 border-black rounded-lg shadow-brutal hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Keep Selected
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
