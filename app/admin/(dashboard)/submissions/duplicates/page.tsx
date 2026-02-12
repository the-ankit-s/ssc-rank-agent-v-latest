"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DuplicateGroupCard } from "@/components/admin/submissions/duplicate-group-card";

interface DuplicateGroup {
    rollNumber: string;
    examId: number;
    examName: string;
    count: number;
    submissions: Array<{
        id: number;
        name: string;
        rawScore: number;
        normalizedScore: number | null;
        overallRank: number | null;
        createdAt: string;
        source: string;
    }>;
}

interface Stats {
    totalGroups: number;
    totalAffected: number;
    autoResolved: number;
}

export default function DuplicatesPage() {
    const [groups, setGroups] = useState<DuplicateGroup[]>([]);
    const [stats, setStats] = useState<Stats>({ totalGroups: 0, totalAffected: 0, autoResolved: 0 });
    const [loading, setLoading] = useState(true);
    const [resolving, setResolving] = useState<string | null>(null);

    useEffect(() => {
        fetchDuplicates();
    }, []);

    async function fetchDuplicates() {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/submissions/duplicates");
            const data = await res.json();
            if (data.groups) setGroups(data.groups);
            if (data.stats) setStats(data.stats);
        } catch (error) {
            console.error("Error fetching duplicates:", error);
        } finally {
            setLoading(false);
        }
    }

    async function handleResolve(
        rollNumber: string,
        examId: number,
        action: "keep_first" | "keep_latest" | "keep_selected",
        selectedId?: number
    ) {
        const key = `${rollNumber}-${examId}`;
        setResolving(key);

        try {
            const res = await fetch("/api/admin/submissions/duplicates/resolve", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action, rollNumber, examId, selectedId }),
            });

            const data = await res.json();

            if (data.success) {
                // Remove the resolved group from the list
                setGroups((prev) =>
                    prev.filter((g) => !(g.rollNumber === rollNumber && g.examId === examId))
                );
                // Update stats
                setStats((prev) => ({
                    ...prev,
                    totalGroups: prev.totalGroups - 1,
                    totalAffected: prev.totalAffected - data.deleted,
                    autoResolved: prev.autoResolved + 1,
                }));
            } else {
                alert("Failed to resolve duplicates: " + (data.error || "Unknown error"));
            }
        } catch (error) {
            console.error("Error resolving duplicates:", error);
            alert("Failed to resolve duplicates");
        } finally {
            setResolving(null);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <span className="material-symbols-outlined text-black text-6xl animate-spin">
                    rotate_right
                </span>
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-[1600px] mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link
                        href="/admin/submissions"
                        className="w-10 h-10 flex items-center justify-center rounded-lg border-2 border-black hover:bg-gray-100 transition-colors"
                    >
                        <span className="material-symbols-outlined">arrow_back</span>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                            Duplicate Submissions
                        </h1>
                        <p className="text-gray-500 font-medium mt-1">
                            Detect and resolve duplicate submissions
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={fetchDuplicates}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white text-gray-900 font-bold rounded-xl border-2 border-gray-900 shadow-brutal hover:-translate-y-1 hover:shadow-brutal-hover transition-all text-sm"
                >
                    <span className="material-symbols-outlined text-xl">refresh</span>
                    Refresh
                </button>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl border-2 border-black shadow-brutal hover:-translate-y-1 transition-transform">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-red-100 border-2 border-black rounded-lg text-red-600">
                            <span className="material-symbols-outlined">content_copy</span>
                        </div>
                        <div className="text-sm font-bold text-gray-700 uppercase">
                            Duplicate Groups
                        </div>
                    </div>
                    <div className="text-4xl font-black text-gray-900">{stats.totalGroups}</div>
                </div>

                <div className="bg-white p-6 rounded-xl border-2 border-black shadow-brutal hover:-translate-y-1 transition-transform">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-yellow-100 border-2 border-black rounded-lg text-yellow-600">
                            <span className="material-symbols-outlined">warning</span>
                        </div>
                        <div className="text-sm font-bold text-gray-700 uppercase">
                            Affected Submissions
                        </div>
                    </div>
                    <div className="text-4xl font-black text-gray-900">{stats.totalAffected}</div>
                </div>

                <div className="bg-white p-6 rounded-xl border-2 border-black shadow-brutal hover:-translate-y-1 transition-transform">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-green-100 border-2 border-black rounded-lg text-green-600">
                            <span className="material-symbols-outlined">check_circle</span>
                        </div>
                        <div className="text-sm font-bold text-gray-700 uppercase">
                            Auto-Resolved
                        </div>
                    </div>
                    <div className="text-4xl font-black text-gray-900">{stats.autoResolved}</div>
                </div>
            </div>

            {/* Duplicate Groups */}
            <div className="space-y-4">
                {groups.length === 0 ? (
                    <div className="bg-white rounded-xl border-2 border-black shadow-brutal p-12 text-center">
                        <span className="material-symbols-outlined text-green-600 text-6xl mb-4 inline-block">
                            verified
                        </span>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">No Duplicates Found</h3>
                        <p className="text-gray-500 font-medium">
                            All submissions are unique. Great job!
                        </p>
                    </div>
                ) : (
                    groups.map((group) => (
                        <DuplicateGroupCard
                            key={`${group.rollNumber}-${group.examId}`}
                            rollNumber={group.rollNumber}
                            examName={group.examName}
                            submissions={group.submissions}
                            onResolve={(action, selectedId) =>
                                handleResolve(group.rollNumber, group.examId, action, selectedId)
                            }
                        />
                    ))
                )}
            </div>
        </div>
    );
}
