"use client";

import { useEffect, useState } from "react";

export default function PublicLeaderboardPage() {
    const [data, setData] = useState<{ leaderboard: any[], exams: any[], currentExamId: number } | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedExamId, setSelectedExamId] = useState<string>("");
    const [selectedCategory, setSelectedCategory] = useState<string>("all");

    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [isLoadMore, setIsLoadMore] = useState(false);

    useEffect(() => {
        setPage(1); // Reset page on filter change
        setHasMore(true);
        setData(null); // Clear previous data
        fetchLeaderboard(1, false);
    }, [selectedExamId, selectedCategory]);

    async function fetchLeaderboard(pageNum: number, append: boolean) {
        if (append) setIsLoadMore(true);
        else setLoading(true);

        try {
            const params = new URLSearchParams();
            if (selectedExamId) params.set("examId", selectedExamId);
            if (selectedCategory && selectedCategory !== "all") params.set("category", selectedCategory);
            params.set("page", pageNum.toString());
            params.set("limit", "25");

            const res = await fetch(`/api/leaderboard?${params.toString()}`);
            const result = await res.json();

            if (append) {
                setData(prev => prev ? {
                    ...prev,
                    leaderboard: [...prev.leaderboard, ...result.leaderboard]
                } : result);
            } else {
                setData(result);
            }

            if (!selectedExamId && result.currentExamId) {
                setSelectedExamId(result.currentExamId.toString());
            }

            if (result.pagination) {
                setHasMore(result.pagination.hasMore);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setIsLoadMore(false);
        }
    }

    const loadMore = () => {
        const nextPage = page + 1;
        setPage(nextPage);
        fetchLeaderboard(nextPage, true);
    };

    return (
        <div className="min-h-screen bg-brutal-bg font-sans selection:bg-black selection:text-white">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b-4 border-black font-bold h-16 flex items-center px-4 md:px-8 justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-black rounded-full"></div>
                    <span className="text-xl">RANK-MITRA</span>
                </div>
                <nav className="flex gap-4 text-sm">
                    <a href="/login" className="hover:underline">Login</a>
                </nav>
            </header>

            <main className="pt-24 px-4 md:px-8 max-w-6xl mx-auto pb-12">
                <div className="mb-8">
                    <h1 className="text-4xl md:text-6xl font-black mb-4">LEADERBOARD</h1>
                    <p className="text-xl font-bold text-gray-600">Top performers across all exams.</p>
                </div>

                {/* Filter */}
                <div className="mb-8 bg-white p-4 border-4 border-black shadow-brutal rounded-xl inline-flex gap-4 flex-wrap">
                    <div>
                        <label className="block text-sm font-bold mb-1">Select Exam</label>
                        <select
                            value={selectedExamId}
                            onChange={(e) => setSelectedExamId(e.target.value)}
                            className="px-4 py-2 border-2 border-black rounded-lg font-bold min-w-[200px]"
                        >
                            {data?.exams.map((exam) => (
                                <option key={exam.id} value={exam.id}>{exam.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-bold mb-1">Category</label>
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="px-4 py-2 border-2 border-black rounded-lg font-bold min-w-[150px]"
                        >
                            <option value="all">All Categories</option>
                            <option value="UR">UR</option>
                            <option value="OBC">OBC</option>
                            <option value="EWS">EWS</option>
                            <option value="SC">SC</option>
                            <option value="ST">ST</option>
                        </select>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-xl border-2 border-black shadow-brutal overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b-2 border-black">
                                <tr>
                                    <th className="py-3 px-4 text-left font-bold">Rank</th>
                                    <th className="py-3 px-4 text-left font-bold">Name</th>
                                    <th className="py-3 px-4 text-left font-bold">Category</th>
                                    <th className="py-3 px-4 text-right font-bold">Score</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={4} className="py-8 text-center text-xl font-bold">Loading...</td></tr>
                                ) : data?.leaderboard.length === 0 ? (
                                    <tr><td colSpan={4} className="py-8 text-center text-gray-500 font-bold">No data found.</td></tr>
                                ) : (
                                    data?.leaderboard.map((row, index) => (
                                        <tr key={row.id} className="border-b hover:bg-gray-50 transition-colors">
                                            <td className="py-3 px-4 font-black text-base">#{index + 1}</td>
                                            <td className="py-3 px-4 font-bold">
                                                {row.name}
                                                <span className="block text-xs text-gray-500 font-normal font-mono mt-1">Roll: {row.rollNumber}</span>
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className="px-2 py-1 bg-black text-white rounded text-xs font-bold">{row.category}</span>
                                            </td>
                                            <td className="py-3 px-4 text-right font-black text-lg text-blue-600">
                                                {row.rawScore.toFixed(2)}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Load More */}
                {hasMore && !loading && data?.leaderboard && data.leaderboard.length > 0 && (
                    <div className="mt-8 text-center">
                        <button
                            onClick={loadMore}
                            disabled={isLoadMore}
                            className="bg-black text-white px-8 py-3 text-lg font-bold rounded-lg shadow-brutal hover:translate-y-1 hover:shadow-none transition-all disabled:opacity-50"
                        >
                            {isLoadMore ? (
                                <span className="flex items-center gap-2">
                                    <span className="material-symbols-outlined animate-spin text-sm">autorenew</span>
                                    Loading...
                                </span>
                            ) : "Load More Ranks"}
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
}
