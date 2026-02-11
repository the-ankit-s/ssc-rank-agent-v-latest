"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import Link from "next/link";

interface SubmissionData {
    id: number;
    rollNumber: string;
    name: string;
    category: string;
    rawScore: number;
    normalizedScore: number;
    overallRank: number;
    sectionPerformance: Record<
        string,
        {
            marks: number;
            correct: number;
            wrong: number;
            unattempted: number;
            accuracy: number;
            totalQuestions?: number;
        }
    >;
    examCentre: string;
    exam: {
        name: string;
        tier: string;
        totalMarks: number;
    };
    shift: {
        date: string;
        timeSlot: string;
    };
}

export default function ResultPage() {
    const params = useParams();
    // const router = useRouter(); // Unused
    const [data, setData] = useState<SubmissionData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchResult() {
            try {
                // Ensure params.id is available before fetching
                if (!params?.id) return;

                const response = await fetch(`/api/result/${params.id}`);
                if (!response.ok) throw new Error("Result not found");
                const result = await response.json();
                setData(result);
            } catch (error) {
                console.error("Error fetching result:", error);
            } finally {
                setIsLoading(false);
            }
        }

        fetchResult();
    }, [params.id]);

    if (isLoading) {
        return (
            <>
                <Navbar />
                <div className="min-h-screen flex items-center justify-center">
                    <div className="text-center">
                        <span className="material-symbols-outlined text-6xl text-primary animate-spin inline-block">autorenew</span>
                        <p className="mt-4 text-xl font-bold">Analyzing your performance...</p>
                    </div>
                </div>
                <Footer />
            </>
        );
    }

    if (!data) {
        return (
            <>
                <Navbar />
                <div className="min-h-screen flex items-center justify-center">
                    <div className="text-center max-w-md">
                        <span className="material-symbols-outlined text-6xl text-red-500">error</span>
                        <h2 className="text-2xl font-bold mt-4 mb-2">Result Not Found</h2>
                        <p className="text-gray-600 mb-6">The submission you're looking for doesn't exist or has expired.</p>
                        <Link href="/" className="inline-block px-6 py-3 bg-primary text-white font-bold rounded-lg border-2 border-black shadow-brutal">
                            Submit New Answer Key
                        </Link>
                    </div>
                </div>
                <Footer />
            </>
        );
    }

    const sectionNames: Record<string, string> = {
        GI: "General Intelligence",
        QA: "Quantitative Aptitude",
        EN: "English",
        GA: "General Awareness",
    };

    return (
        <>
            <Navbar />
            <div className="min-h-screen py-12 bg-brutal-bg">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Success Header */}
                    <div className="text-center mb-16">
                        <div className="inline-flex items-center justify-center bg-brutal-green border-4 border-black rounded-full p-6 mb-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transform hover:-translate-y-1 transition-transform">
                            <span className="material-symbols-outlined text-6xl text-black">check_circle</span>
                        </div>
                        <h1 className="text-5xl md:text-6xl font-black text-black uppercase tracking-tight mb-2">Analysis Complete</h1>
                        <p className="text-xl font-bold text-gray-600">Your performance report is ready</p>
                    </div>

                    {/* Candidate Identity Card */}
                    <div className="max-w-4xl mx-auto mb-16">
                        <div className="relative group">
                            <div className="absolute top-3 left-3 w-full h-full bg-black rounded-2xl"></div>
                            <div className="relative bg-white border-4 border-black rounded-2xl p-8 shadow-none">
                                <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                                    <div className="flex items-center gap-6 w-full md:w-auto">
                                        <div className="h-20 w-20 bg-gray-100 rounded-full border-2 border-black flex items-center justify-center shrink-0">
                                            <span className="material-symbols-outlined text-4xl text-gray-600">person</span>
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-black text-black uppercase">{data.name}</h2>
                                            <p className="text-gray-600 font-bold font-mono tracking-wider">{data.rollNumber}</p>
                                        </div>
                                    </div>

                                    <div className="h-px w-full md:w-px md:h-16 bg-gray-200"></div>

                                    <div className="grid grid-cols-2 gap-x-12 gap-y-4 w-full md:w-auto">
                                        <div>
                                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Exam</p>
                                            <p className="font-bold text-black">{data.exam?.name}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Category</p>
                                            <p className="font-bold text-black">{data.category}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Date</p>
                                            <p className="font-bold text-black">{data.shift?.date || "N/A"}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Shift</p>
                                            <p className="font-bold text-black">{data.shift?.timeSlot || "N/A"}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Main Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
                        {/* Merit Score */}
                        <div className="relative group hover:-translate-y-2 transition-transform duration-300">
                            <div className="absolute top-3 left-3 w-full h-full bg-black rounded-2xl"></div>
                            <div className="relative bg-[#FFDE59] border-4 border-black rounded-2xl p-6 flex flex-col items-center justify-center h-full min-h-[220px]">
                                <span className="material-symbols-outlined text-4xl mb-4 bg-white border-2 border-black p-3 rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">calculate</span>
                                <p className="text-sm font-black uppercase tracking-widest mb-2 text-black/80">Merit Score</p>
                                <p className="text-6xl font-black text-black mb-1">{data.rawScore}</p>
                                <p className="text-xs font-bold text-black/60 bg-white/50 px-3 py-1 rounded-full border border-black/10">Excl. Computer</p>
                            </div>
                        </div>

                        {/* Normalized Score */}
                        <div className="relative group hover:-translate-y-2 transition-transform duration-300">
                            <div className="absolute top-3 left-3 w-full h-full bg-black rounded-2xl"></div>
                            <div className="relative bg-white border-4 border-black rounded-2xl p-6 flex flex-col items-center justify-center h-full min-h-[220px]">
                                <span className="material-symbols-outlined text-4xl mb-4 bg-gray-50 border-2 border-black p-3 rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-blue-600">trending_up</span>
                                <p className="text-sm font-black uppercase tracking-widest mb-2 text-gray-500">Normalized</p>
                                <p className="text-6xl font-black text-blue-600 mb-1">
                                    {data.normalizedScore ? data.normalizedScore.toFixed(0) : "N/A"}
                                    <span className="text-2xl font-bold align-top ml-1 opacity-50">
                                        {data.normalizedScore ? (data.normalizedScore % 1).toFixed(2).substring(1) : ""}
                                    </span>
                                </p>
                                <p className="text-xs font-bold text-gray-400 bg-gray-100 px-3 py-1 rounded-full">Projected Score</p>
                            </div>
                        </div>

                        {/* Rank */}
                        <div className="relative group hover:-translate-y-2 transition-transform duration-300">
                            <div className="absolute top-3 left-3 w-full h-full bg-black rounded-2xl"></div>
                            <div className="relative bg-[#7ED957] border-4 border-black rounded-2xl p-6 flex flex-col items-center justify-center h-full min-h-[220px]">
                                <span className="material-symbols-outlined text-4xl mb-4 bg-white border-2 border-black p-3 rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">workspace_premium</span>
                                <p className="text-sm font-black uppercase tracking-widest mb-2 text-black/80">AIR Rank</p>
                                <p className="text-6xl font-black text-black mb-1">#{data.overallRank}</p>
                                <p className="text-xs font-bold text-black/60 bg-white/50 px-3 py-1 rounded-full border border-black/10">Live Ranking</p>
                            </div>
                        </div>

                        {/* Computer */}
                        <div className="relative group hover:-translate-y-2 transition-transform duration-300">
                            <div className="absolute top-3 left-3 w-full h-full bg-black rounded-2xl"></div>
                            <div className={`relative border-4 border-black rounded-2xl p-6 flex flex-col items-center justify-center h-full min-h-[220px] transition-colors
                                ${(data.sectionPerformance?.["Computer"]?.marks || 0) >= 18 ? "bg-[#C084FC]" : "bg-red-300"}`}>
                                <span className="material-symbols-outlined text-4xl mb-4 bg-white border-2 border-black p-3 rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">terminal</span>
                                <p className="text-sm font-black uppercase tracking-widest mb-2 text-black/80">Computer</p>
                                <p className="text-6xl font-black text-black mb-1">
                                    {data.sectionPerformance?.["Computer"]?.marks || 0}
                                </p>
                                <div className={`flex items-center gap-2 px-3 py-1 rounded-full border border-black/10 shadow-sm
                                    ${(data.sectionPerformance?.["Computer"]?.marks || 0) >= 18 ? "bg-white/50 text-black/80" : "bg-red-500 text-white"}`}>
                                    <span className="text-xs font-bold uppercase">
                                        {(data.sectionPerformance?.["Computer"]?.marks || 0) >= 18 ? "Qualified" : "Not Qualified"}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Summary Bar */}
                    <div className="max-w-4xl mx-auto mb-16 bg-black text-white p-6 rounded-xl border-4 border-black shadow-[8px_8px_0px_0px_#8b5cf6] flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-4">
                            <span className="material-symbols-outlined text-4xl text-[#FFDE59]">functions</span>
                            <div>
                                <h3 className="text-xl font-bold uppercase">Grand Total</h3>
                                <p className="text-gray-400 text-sm">Merit Score + Computer Score</p>
                            </div>
                        </div>
                        <div className="text-5xl font-black tracking-tighter text-[#FFDE59]">
                            {data.rawScore + (data.sectionPerformance?.["Computer"]?.marks || 0)}
                        </div>
                    </div>

                    {/* Section Breakdown Grid */}
                    <div className="mb-16">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-3xl font-black text-black uppercase flex items-center gap-3">
                                <span className="w-4 h-10 bg-black block -skew-x-12"></span>
                                Section Analysis
                            </h2>
                            <div className="hidden md:flex gap-2">
                                <div className="flex items-center gap-2 px-3 py-1 bg-green-100 rounded border border-green-300">
                                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                    <span className="text-xs font-bold text-green-800">High Accuracy (&gt;90%)</span>
                                </div>
                                <div className="flex items-center gap-2 px-3 py-1 bg-yellow-100 rounded border border-yellow-300">
                                    <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                                    <span className="text-xs font-bold text-yellow-800">Average (50-90%)</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {data.sectionPerformance && Object.entries(data.sectionPerformance).map(([code, stats]) => {
                                const accuracy = stats.accuracy || 0;
                                let colorClass = "bg-red-500";
                                if (accuracy > 90) colorClass = "bg-[#7ED957]";
                                else if (accuracy > 70) colorClass = "bg-[#FFDE59]";

                                return (
                                    <div key={code} className="group relative">
                                        <div className="absolute top-2 left-2 w-full h-full bg-black rounded-xl border border-black group-hover:top-3 group-hover:left-3 transition-all duration-200"></div>
                                        <div className="relative bg-white border-2 border-black rounded-xl p-6 h-full flex flex-col justify-between">

                                            {/* Header & Marks */}
                                            <div className="flex justify-between items-start mb-6">
                                                <div>
                                                    <h3 className="text-xl font-black text-black uppercase leading-tight mb-1">
                                                        {sectionNames[code] || code}
                                                    </h3>
                                                    <div className="inline-flex items-center gap-1.5 bg-gray-100 px-2 py-0.5 rounded text-xs font-bold text-gray-500 border border-black/10">
                                                        <span>Attempt: {stats.correct + stats.wrong}</span>
                                                        <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                                                        <span>Total: {stats.totalQuestions || (stats.correct + stats.wrong + stats.unattempted)}</span>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-3xl font-black text-black leading-none">{stats.marks}</p>
                                                    <p className="text-[10px] font-bold uppercase text-gray-400">Marks</p>
                                                </div>
                                            </div>

                                            {/* Stats Row */}
                                            <div className="grid grid-cols-3 gap-2 mb-6 text-center bg-gray-50 border border-black/10 rounded-lg p-3">
                                                <div>
                                                    <p className="text-xl font-black text-green-600 leading-none">{stats.correct}</p>
                                                    <p className="text-[9px] uppercase font-bold text-gray-400 mt-1">Correct</p>
                                                </div>
                                                <div className="border-l border-gray-200">
                                                    <p className="text-xl font-black text-red-500 leading-none">{stats.wrong}</p>
                                                    <p className="text-[9px] uppercase font-bold text-gray-400 mt-1">Wrong</p>
                                                </div>
                                                <div className="border-l border-gray-200">
                                                    <p className="text-xl font-black text-gray-400 leading-none">{stats.unattempted}</p>
                                                    <p className="text-[9px] uppercase font-bold text-gray-400 mt-1">Skip</p>
                                                </div>
                                            </div>

                                            {/* Progress Bars */}
                                            <div className="space-y-3">
                                                {/* Accuracy Meter */}
                                                <div>
                                                    <div className="flex justify-between mb-1">
                                                        <span className="text-xs font-bold uppercase text-gray-500 flex items-center gap-1">
                                                            <span className="material-symbols-outlined text-sm">target</span>
                                                            Accuracy
                                                        </span>
                                                        <span className={`text-xs font-black px-2 py-0.5 rounded ${accuracy > 90 ? 'bg-green-100 text-green-800' :
                                                                accuracy > 70 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                                                            }`}>
                                                            {accuracy.toFixed(1)}%
                                                        </span>
                                                    </div>
                                                    <div className="h-3 w-full bg-gray-200 rounded-full border border-black overflow-hidden relative">
                                                        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/diagonal-stripes.png')]"></div>
                                                        <div
                                                            className={`h-full ${colorClass} border-r border-black/20 transition-all duration-1000 ease-out`}
                                                            style={{ width: `${accuracy}%` }}
                                                        ></div>
                                                    </div>
                                                </div>

                                                {/* Attempt Split Bar */}
                                                <div className="flex h-2 rounded-full overflow-hidden border border-black/10">
                                                    <div className="bg-green-500 h-full" style={{ width: `${(stats.correct / (stats.totalQuestions || (stats.correct + stats.wrong + stats.unattempted))) * 100}%` }} title="Correct"></div>
                                                    <div className="bg-red-500 h-full" style={{ width: `${(stats.wrong / (stats.totalQuestions || (stats.correct + stats.wrong + stats.unattempted))) * 100}%` }} title="Wrong"></div>
                                                    <div className="bg-gray-200 h-full" style={{ width: `${(stats.unattempted / (stats.totalQuestions || (stats.correct + stats.wrong + stats.unattempted))) * 100}%` }} title="Unattempted"></div>
                                                </div>
                                            </div>

                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Actions Footer */}
                    <div className="fixed bottom-8 right-8 flex flex-col gap-4 print:hidden z-50">
                        <button
                            onClick={() => window.print()}
                            className="bg-white text-black p-4 rounded-full border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-transform group"
                            title="Print Result"
                        >
                            <span className="material-symbols-outlined text-3xl group-hover:scale-110 transition-transform">print</span>
                        </button>
                        <Link
                            href="/"
                            className="bg-black text-white p-4 rounded-full border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] hover:-translate-y-1 transition-transform group"
                            title="New Submission"
                        >
                            <span className="material-symbols-outlined text-3xl text-[#FFDE59] group-hover:rotate-180 transition-transform">refresh</span>
                        </Link>
                    </div>
                </div>
            </div>
            <Footer />
        </>
    );
}
