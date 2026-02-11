"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface LeaderboardEntry {
    rank: number;
    rollNumber: string;
    name: string;
    category: string;
    rawScore: number;
    normalizedScore: number;
    accuracy: number;
    shiftCode: string;
}

interface Exam {
    id: number;
    name: string;
}

export default function LeaderboardPage() {
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [exams, setExams] = useState<Exam[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedExam, setSelectedExam] = useState<string>("");
    const [category, setCategory] = useState("all");

    // Mock Data Fetching for Demo
    useEffect(() => {
        // Mock Exams
        setExams([
            { id: 1, name: "JEE Main 2024 - Session 1" },
            { id: 2, name: "NEET UG 2024" },
        ]);
        setSelectedExam("1");
    }, []);

    useEffect(() => {
        if (!selectedExam) return;
        setLoading(true);
        // Simulate API call
        setTimeout(() => {
            const mockEntries = Array.from({ length: 15 }).map((_, i) => ({
                rank: i + 1,
                rollNumber: `240${1000 + i}`,
                name: ["Aarav Patel", "Vihaan Singh", "Aditya Kumar", "Sai Krishna", "Ishaan Gupta"][i % 5] + ` ${i + 1}`,
                category: ["UR", "OBC", "EWS", "SC", "ST"][i % 5],
                rawScore: 280 - (i * 5),
                normalizedScore: 99.8 - (i * 0.1),
                accuracy: 92 - i,
                shiftCode: `27Jan-S${(i % 2) + 1}`
            }));
            setEntries(mockEntries);
            setLoading(false);
        }, 800);
    }, [selectedExam, category]);

    const getMedalColor = (rank: number) => {
        switch (rank) {
            case 1: return "bg-yellow-300 text-black border-2 border-black shadow-neo-sm";
            case 2: return "bg-gray-300 text-black border-2 border-black shadow-neo-sm";
            case 3: return "bg-orange-400 text-black border-2 border-black shadow-neo-sm";
            default: return "bg-white text-black border-2 border-black shadow-sm";
        }
    };

    const getRankIcon = (rank: number) => {
        switch (rank) {
            case 1: return <span className="material-symbols-outlined text-black text-2xl">emoji_events</span>;
            case 2: return <span className="material-symbols-outlined text-black text-2xl">emoji_events</span>;
            case 3: return <span className="material-symbols-outlined text-black text-2xl">emoji_events</span>;
            default: return <span className="font-black text-sm text-black">#{rank}</span>;
        }
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black text-black tracking-tighter uppercase transform -skew-x-6 inline-block bg-yellow-300 px-3 py-1 border-2 border-black shadow-neo">Leaderboard</h1>
                    <p className="text-lg font-bold text-black mt-2">Top performing candidates</p>
                </div>
                <div className="flex gap-2">
                    <button className="flex items-center gap-2 px-6 py-3 bg-white text-black font-black uppercase tracking-wide border-2 border-black shadow-neo hover:bg-blue-300 hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all text-sm">
                        <span className="material-symbols-outlined text-xl">download</span>
                        Export List
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 border-4 border-black shadow-neo flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                    <select
                        value={selectedExam}
                        onChange={(e) => setSelectedExam(e.target.value)}
                        className="w-full px-4 py-3 text-sm font-black uppercase tracking-wide border-2 border-black bg-white focus:outline-none focus:bg-yellow-100 text-black cursor-pointer transition-all appearance-none"
                    >
                        {exams.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                    <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-black pointer-events-none">
                        expand_more
                    </span>
                </div>
                <div className="w-full md:w-48 relative">
                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-4 py-3 text-sm font-black uppercase tracking-wide border-2 border-black bg-white focus:outline-none focus:bg-yellow-100 text-black cursor-pointer transition-all appearance-none"
                    >
                        <option value="all">All Categories</option>
                        <option value="UR">UR</option>
                        <option value="OBC">OBC</option>
                        <option value="EWS">EWS</option>
                        <option value="SC">SC</option>
                        <option value="ST">ST</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-black pointer-events-none">
                        expand_more
                    </span>
                </div>
            </div>

            {/* Leaderboard Table */}
            <div className="bg-white border-4 border-black shadow-neo overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-blue-300 text-black font-black text-sm uppercase tracking-wider border-b-4 border-black">
                            <tr>
                                <th className="p-6 pl-8 w-24 text-center border-r-2 border-black">Rank</th>
                                <th className="p-6 border-r-2 border-black">Candidate</th>
                                <th className="p-6 border-r-2 border-black">Category</th>
                                <th className="p-6 text-center border-r-2 border-black">Shift</th>
                                <th className="p-6 text-right border-r-2 border-black">Norm. Score</th>
                                <th className="p-6 text-right pr-8">Raw Score</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y-2 divide-black">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="p-12 text-center">
                                        <div className="flex justify-center">
                                            <span className="material-symbols-outlined text-4xl text-black animate-spin">autorenew</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : entries.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-12 text-center text-black font-black uppercase text-lg">
                                        No data available for selected filters.
                                    </td>
                                </tr>
                            ) : (
                                entries.map((entry) => (
                                    <tr key={entry.rollNumber} className="hover:bg-yellow-100 transition-colors group">
                                        <td className="p-4 pl-8 text-center border-r-2 border-black">
                                            <div className={`flex items-center justify-center w-12 h-12 rounded-none mx-auto transition-transform group-hover:scale-105 ${getMedalColor(entry.rank)}`}>
                                                {getRankIcon(entry.rank)}
                                            </div>
                                        </td>
                                        <td className="p-6 border-r-2 border-black">
                                            <div className="font-black text-black text-base uppercase">{entry.name}</div>
                                            <div className="text-xs text-gray-600 font-mono mt-0.5 font-bold">{entry.rollNumber}</div>
                                        </td>
                                        <td className="p-6 border-r-2 border-black">
                                            <span className="px-2.5 py-1 text-black bg-white text-xs font-black uppercase tracking-wide border-2 border-black shadow-neo-sm">
                                                {entry.category}
                                            </span>
                                        </td>
                                        <td className="p-6 text-center border-r-2 border-black">
                                            <span className="font-mono text-sm font-black text-black bg-gray-100 px-2 py-1 border-2 border-black">
                                                {entry.shiftCode}
                                            </span>
                                        </td>
                                        <td className="p-6 text-right border-r-2 border-black">
                                            <div className="font-mono font-black text-lg text-blue-600 bg-blue-50 px-2 py-1 inline-block border-2 border-black shadow-sm transform -skew-x-6">{entry.normalizedScore.toFixed(2)}</div>
                                        </td>
                                        <td className="p-6 text-right pr-8">
                                            <span className="font-mono font-bold text-gray-600">{entry.rawScore.toFixed(2)}</span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
