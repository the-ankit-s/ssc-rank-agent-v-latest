"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface Cutoff {
    id: number;
    examId: number;
    examName: string;
    category: string;
    postCode: string;
    postName: string;
    expectedCutoff: number;
    safeScore: number;
    minimumScore: number;
    confidenceLevel: string;
    updatedAt: string;
}

interface Exam { id: number; name: string; }

export default function PredictionsPage() {
    const [predictions, setPredictions] = useState<Cutoff[]>([]);
    const [exams, setExams] = useState<Exam[]>([]);
    const [loading, setLoading] = useState(true);
    const [examFilter, setExamFilter] = useState("all");

    useEffect(() => {
        fetch("/api/admin/exams?limit=100")
            .then(r => r.json())
            .then(d => setExams(d.exams || []))
            .catch(console.error);
    }, []);

    useEffect(() => {
        fetchPredictions();
    }, [examFilter]);

    async function fetchPredictions() {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (examFilter !== "all") params.append("examId", examFilter);
            params.append("limit", "100");

            const res = await fetch(`/api/admin/cutoffs?${params}`);
            const data = await res.json();
            const preds = (data.cutoffs || []).filter((c: Cutoff) => c.postCode === "PREDICTION");
            setPredictions(preds);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    const confidenceColors: Record<string, string> = {
        high: "bg-emerald-100 text-emerald-700 border-emerald-200",
        medium: "bg-amber-100 text-amber-700 border-amber-200",
        low: "bg-red-100 text-red-700 border-red-200",
    };

    const avgConfidence = predictions.length > 0
        ? (() => {
            const scores = { high: 3, medium: 2, low: 1 };
            const avg = predictions.reduce((sum, p) => sum + (scores[p.confidenceLevel as keyof typeof scores] || 1), 0) / predictions.length;
            return avg >= 2.5 ? "High" : avg >= 1.5 ? "Medium" : "Low";
        })()
        : "-";

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1 text-sm">
                        <Link href="/admin/cutoffs" className="text-gray-400 hover:text-gray-900 font-medium transition-colors">Cutoffs</Link>
                        <span className="text-gray-300">/</span>
                        <span className="text-gray-900 font-bold">AI Predictions</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">AI Score Predictions</h1>
                        <select
                            value={examFilter}
                            onChange={(e) => setExamFilter(e.target.value)}
                            className="px-3 py-2 border-2 border-gray-200 rounded-xl focus:border-gray-900 outline-none bg-white text-sm font-bold text-gray-700"
                        >
                            <option value="all">All Exams</option>
                            {exams.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                        </select>
                    </div>
                    <p className="text-gray-500 font-medium mt-1">Automated cutoff predictions based on submission data</p>
                </div>
                <Link
                    href="/admin/jobs"
                    className="btn-primary flex items-center gap-2 self-start md:self-auto"
                >
                    <span className="material-symbols-outlined text-lg">bolt</span>
                    Run New Prediction
                </Link>
            </div>

            {/* Stats Panel */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="card-base p-5 bg-white">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Total Predictions</p>
                    <p className="text-3xl font-bold text-gray-900">{predictions.length}</p>
                </div>
                <div className="card-base p-5 bg-white">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Last Updated</p>
                    <p className="text-lg font-bold text-gray-700">
                        {predictions.length > 0
                            ? formatDistanceToNow(new Date(Math.max(...predictions.map(p => new Date(p.updatedAt).getTime()))), { addSuffix: true })
                            : "-"}
                    </p>
                </div>
                <div className="card-base p-5 bg-white">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Avg Confidence</p>
                    <p className={cn("text-lg font-bold",
                        avgConfidence === "High" ? "text-emerald-600" :
                            avgConfidence === "Medium" ? "text-amber-600" : "text-red-600"
                    )}>{avgConfidence}</p>
                </div>
            </div>

            {/* Predictions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="card-base p-6 bg-white animate-pulse">
                            <div className="h-6 w-16 bg-gray-200 rounded mb-3"></div>
                            <div className="h-10 w-24 bg-gray-200 rounded mb-4"></div>
                            <div className="flex gap-4">
                                <div className="h-4 w-20 bg-gray-200 rounded"></div>
                                <div className="h-4 w-20 bg-gray-200 rounded"></div>
                            </div>
                        </div>
                    ))
                ) : predictions.length === 0 ? (
                    <div className="col-span-full">
                        <div className="card-base p-12 text-center bg-white">
                            <span className="material-symbols-outlined text-5xl text-gray-300 mb-4 block">query_stats</span>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">No predictions generated yet</h3>
                            <p className="text-gray-500 mb-6">Run the "Cutoff Prediction" job to generate predictions from submission data.</p>
                            <Link href="/admin/jobs" className="btn-primary inline-flex items-center gap-2">
                                <span className="material-symbols-outlined text-lg">bolt</span>
                                Go to Jobs
                            </Link>
                        </div>
                    </div>
                ) : (
                    predictions.map(pred => (
                        <div key={pred.id} className="card-base bg-white hover:-translate-y-1 transition-transform">
                            <div className="p-5 border-b border-gray-100">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="font-bold text-xl text-gray-900">{pred.category}</h3>
                                        <p className="text-xs font-medium text-gray-400 mt-0.5">{pred.examName || `Exam ${pred.examId}`}</p>
                                    </div>
                                    <span className={cn(
                                        "px-2 py-1 rounded-full text-[10px] font-bold uppercase border",
                                        confidenceColors[pred.confidenceLevel]
                                    )}>
                                        {pred.confidenceLevel}
                                    </span>
                                </div>

                                <div className="flex items-baseline gap-2">
                                    <span className="text-4xl font-bold text-blue-600 font-mono">{pred.expectedCutoff.toFixed(1)}</span>
                                    <span className="text-xs font-medium text-gray-400">Expected Cutoff</span>
                                </div>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-b-xl">
                                <div className="flex justify-around items-center text-sm">
                                    <div className="text-center">
                                        <p className="font-bold text-emerald-600 font-mono">{pred.safeScore.toFixed(1)}</p>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase mt-0.5">Safe Score</p>
                                    </div>
                                    <div className="w-px h-8 bg-gray-200"></div>
                                    <div className="text-center">
                                        <p className="font-bold text-gray-600 font-mono">{pred.minimumScore.toFixed(1)}</p>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase mt-0.5">Min Score</p>
                                    </div>
                                    <div className="w-px h-8 bg-gray-200"></div>
                                    <div className="text-center">
                                        <p className="font-bold text-gray-900 text-xs">Percentile</p>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase mt-0.5">Model</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
