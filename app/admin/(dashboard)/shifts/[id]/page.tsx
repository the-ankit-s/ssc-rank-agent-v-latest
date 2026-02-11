"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from "recharts";
import { cn } from "@/lib/utils";

interface ShiftDetails {
    shift: {
        id: number;
        shiftCode: string;
        exam: { name: string; year: number };
        date: string;
        timeSlot: string;
        startTime: string;
        endTime: string;
        candidateCount: number;
        avgRawScore: number | null;
        difficultyIndex: number | null;
        difficultyLabel: string | null;
        updatedAt: string;
    };
    stats: {
        distribution: { range: string; count: number }[];
    };
    topCandidates: {
        id: number;
        rollNumber: string;
        name: string;
        rawScore: number;
        overallPercentile: number | null;
    }[];
}

export default function ShiftDetailsPage() {
    const params = useParams();
    const [data, setData] = useState<ShiftDetails | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const res = await fetch(`/api/admin/shifts/${params.id}`);
                const json = await res.json();
                if (json.shift) {
                    setData(json);
                }
            } catch (error) {
                console.error("Failed to fetch details", error);
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();
    }, [params.id]);

    if (loading) return (
        <div className="flex items-center justify-center min-h-[400px]">
            <span className="material-symbols-outlined text-black text-6xl animate-spin">rotate_right</span>
        </div>
    );

    if (!data) return <div className="p-8 text-center text-gray-500">Shift not found</div>;

    const { shift, stats, topCandidates } = data;

    return (
        <div className="space-y-8 max-w-[1600px] mx-auto pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link
                        href="/admin/shifts"
                        className="w-10 h-10 flex items-center justify-center rounded-xl border-2 border-gray-200 hover:border-gray-900 bg-white hover:bg-gray-50 transition-all"
                    >
                        <span className="material-symbols-outlined">arrow_back</span>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                            {shift.exam.name} <span className="text-gray-400">/</span> {shift.shiftCode}
                        </h1>
                        <p className="text-gray-500 font-medium mt-1">
                            {new Date(shift.date).toLocaleDateString(undefined, {
                                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                            })} • {shift.timeSlot} ({shift.startTime} - {shift.endTime})
                        </p>
                    </div>
                </div>
                <Link
                    href={`/admin/shifts/${shift.id}/edit`}
                    className="btn-secondary flex items-center gap-2"
                >
                    <span className="material-symbols-outlined">edit</span>
                    Edit Shift
                </Link>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="card-base p-6 bg-white flex flex-col gap-1">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Candidates</span>
                    <span className="text-3xl font-black text-gray-900">{shift.candidateCount}</span>
                </div>
                <div className="card-base p-6 bg-white flex flex-col gap-1">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Avg Score</span>
                    <span className="text-3xl font-black text-gray-900">{shift.avgRawScore?.toFixed(2) || "-"}</span>
                </div>
                <div className="card-base p-6 bg-white flex flex-col gap-1">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Difficulty</span>
                    <div className="flex items-center gap-2">
                        <span className={cn("text-xl font-black uppercase",
                            shift.difficultyLabel === 'difficult' ? "text-red-500" :
                                shift.difficultyLabel === 'moderate' ? "text-yellow-600" : "text-green-500"
                        )}>
                            {shift.difficultyLabel || "N/A"}
                        </span>
                        <span className="text-sm font-bold text-gray-400">({shift.difficultyIndex?.toFixed(2)})</span>
                    </div>
                </div>
                <div className="card-base p-6 bg-white flex flex-col gap-1">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Last Updated</span>
                    <span className="text-sm font-bold text-gray-700">
                        {new Date(shift.updatedAt).toLocaleString()}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Score Distribution Chart */}
                <div className="lg:col-span-2 card-base p-6 bg-white min-h-[400px]">
                    <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <span className="material-symbols-outlined text-gray-400">bar_chart</span>
                        Score Distribution
                    </h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.distribution}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis
                                    dataKey="range"
                                    stroke="#9CA3AF"
                                    tick={{ fontSize: 12, fontWeight: 600 }}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="#9CA3AF"
                                    tick={{ fontSize: 12, fontWeight: 600 }}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip
                                    cursor={{ fill: '#F3E8FF', opacity: 0.5 }}
                                    contentStyle={{
                                        backgroundColor: '#1F2937',
                                        border: 'none',
                                        borderRadius: '8px',
                                        color: '#fff',
                                        fontWeight: 'bold'
                                    }}
                                />
                                <Bar dataKey="count" fill="#A78BFA" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top Candidates */}
                <div className="card-base p-0 bg-white overflow-hidden h-fit">
                    <div className="p-6 border-b-2 border-gray-100 bg-gray-50 flex items-center justify-between">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <span className="material-symbols-outlined text-yellow-500">trophy</span>
                            Top Performers
                        </h3>
                        <Link href={`/admin/submissions?shiftId=${shift.id}`} className="text-xs font-bold text-blue-600 hover:underline">
                            View All
                        </Link>
                    </div>
                    <div className="divide-y-2 divide-gray-50">
                        {topCandidates.map((c, i) => (
                            <div key={c.id} className="p-4 flex items-center justify-between hover:bg-yellow-50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-2",
                                        i === 0 ? "bg-yellow-100 text-yellow-700 border-yellow-200" :
                                            i === 1 ? "bg-gray-100 text-gray-700 border-gray-200" :
                                                i === 2 ? "bg-orange-100 text-orange-700 border-orange-200" :
                                                    "bg-white text-gray-500 border-gray-100"
                                    )}>
                                        {i + 1}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-900">{c.name}</p>
                                        <p className="text-xs font-mono text-gray-400">{c.rollNumber}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-black text-gray-900">{c.rawScore}</p>
                                    {c.overallPercentile && (
                                        <p className="text-xs font-bold text-green-600">{c.overallPercentile.toFixed(2)}%ile</p>
                                    )}
                                </div>
                            </div>
                        ))}
                        {topCandidates.length === 0 && (
                            <div className="p-8 text-center text-gray-400 text-sm font-bold">
                                No submissions yet.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
