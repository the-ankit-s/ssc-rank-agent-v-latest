"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import Link from "next/link";

interface Exam {
    id: number;
    name: string;
    slug: string;
    tier: string;
    year: number;
    status: string;
    totalMarks: number;
    totalSubmissions: number;
    isFeatured: boolean;
}

const examIcons: Record<string, string> = {
    "ssc-cgl-2024": "🏛️",
    "ssc-cpo-2024": "👮‍♂️",
    "ssc-chsl-2023": "💻",
    "ssc-mts-2024": "📝",
};

const examColors: Record<string, string> = {
    "ssc-cgl-2024": "bg-blue-50",
    "ssc-cpo-2024": "bg-purple-50",
    "ssc-chsl-2023": "bg-gray-100",
    "ssc-mts-2024": "bg-orange-50",
};

export default function ExamsPage() {
    const [exams, setExams] = useState<Exam[]>([]);
    const [filter, setFilter] = useState("all");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchExams() {
            try {
                const res = await fetch("/api/exams");
                const data = await res.json();
                setExams(data.exams || []);
            } catch (error) {
                console.error("Error fetching exams:", error);
            } finally {
                setLoading(false);
            }
        }
        fetchExams();
    }, []);

    const filteredExams = exams.filter((exam) => {
        if (filter === "all") return true;
        return exam.status === filter;
    });

    return (
        <>
            <Navbar />
            <div className="min-h-screen py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Header */}
                    <div className="text-center mb-12">
                        <h1 className="text-5xl font-black text-black uppercase mb-4">
                            All <span className="text-primary">Exams</span>
                        </h1>
                        <p className="text-lg font-medium text-gray-600 max-w-2xl mx-auto">
                            Browse all SSC exams and check your rank prediction instantly
                        </p>
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex flex-wrap justify-center gap-4 mb-12">
                        {["all", "active", "upcoming", "closed"].map((status) => (
                            <button
                                key={status}
                                onClick={() => setFilter(status)}
                                className={`px-6 py-2 font-bold border-2 border-black rounded-lg shadow-brutal-sm transition-all ${filter === status
                                        ? "bg-primary text-white"
                                        : "bg-white text-black hover:bg-gray-50"
                                    }`}
                            >
                                {status.charAt(0).toUpperCase() + status.slice(1)} Exams
                            </button>
                        ))}
                    </div>

                    {/* Loading */}
                    {loading && (
                        <div className="text-center py-20">
                            <span className="material-symbols-outlined text-5xl text-primary animate-spin inline-block">autorenew</span>
                            <p className="mt-4 font-bold">Loading exams...</p>
                        </div>
                    )}

                    {/* Exams Grid */}
                    {!loading && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {filteredExams.map((exam) => (
                                <div
                                    key={exam.id}
                                    className={`relative ${examColors[exam.slug] || "bg-gray-50"} rounded-xl p-6 border-2 border-black shadow-brutal hover:-translate-y-1 transition-transform ${exam.status === "closed" ? "opacity-70" : ""
                                        }`}
                                >
                                    {/* Status Badge */}
                                    <div
                                        className={`absolute -top-3 -right-3 border-2 border-black text-xs font-black px-3 py-1 rounded shadow-brutal-sm transform ${exam.status === "active"
                                                ? "bg-green-400 text-black rotate-6"
                                                : exam.status === "upcoming"
                                                    ? "bg-brutal-yellow text-black -rotate-3"
                                                    : "bg-gray-300 text-gray-700"
                                            }`}
                                    >
                                        {exam.status.toUpperCase()}
                                    </div>

                                    {/* Icon */}
                                    <div className="w-14 h-14 bg-white border-2 border-black rounded-lg flex items-center justify-center mb-4 text-2xl">
                                        {examIcons[exam.slug] || "📋"}
                                    </div>

                                    {/* Content */}
                                    <h3 className="text-xl font-bold text-black uppercase mb-1">{exam.name}</h3>
                                    <p className="text-sm font-bold text-gray-500 mb-4">{exam.tier}</p>

                                    {/* Stats */}
                                    <div className="flex items-center text-xs font-bold text-gray-700 gap-4 pt-4 mb-4 border-t-2 border-dashed border-gray-300">
                                        <span className="flex items-center gap-1">
                                            <span className="material-symbols-outlined text-lg">groups</span>
                                            {exam.totalSubmissions ? `${(exam.totalSubmissions / 1000).toFixed(0)}k+` : "0"} Data
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <span className="material-symbols-outlined text-lg">calendar_month</span> {exam.year}
                                        </span>
                                    </div>

                                    {/* Action Button */}
                                    {exam.status === "active" ? (
                                        <Link
                                            href={`/submit?exam=${exam.slug}`}
                                            className="block w-full text-center py-2 px-4 bg-primary text-white font-bold border-2 border-black rounded-lg shadow-brutal-sm hover:translate-y-0.5 hover:shadow-none transition-all uppercase text-sm"
                                        >
                                            Check Rank
                                        </Link>
                                    ) : exam.status === "upcoming" ? (
                                        <button
                                            disabled
                                            className="block w-full text-center py-2 px-4 bg-gray-300 text-gray-600 font-bold border-2 border-black rounded-lg cursor-not-allowed uppercase text-sm"
                                        >
                                            Coming Soon
                                        </button>
                                    ) : (
                                        <button
                                            disabled
                                            className="block w-full text-center py-2 px-4 bg-gray-200 text-gray-500 font-bold border-2 border-black rounded-lg cursor-not-allowed uppercase text-sm"
                                        >
                                            Exam Closed
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Empty State */}
                    {!loading && filteredExams.length === 0 && (
                        <div className="text-center py-16">
                            <span className="material-symbols-outlined text-5xl text-gray-400">search_off</span>
                            <p className="mt-4 font-bold text-gray-500">No exams found for this filter</p>
                        </div>
                    )}

                    {/* CTA Section */}
                    <div className="mt-16 text-center">
                        <div className="relative inline-block">
                            <div className="absolute top-2 left-2 w-full h-full bg-black rounded-xl"></div>
                            <div className="relative bg-brutal-yellow border-4 border-black rounded-xl p-8 shadow-brutal">
                                <h2 className="text-2xl font-black text-black uppercase mb-4">
                                    Don't see your exam?
                                </h2>
                                <p className="text-base font-medium text-gray-700 mb-6">
                                    We're constantly adding new exams. Check back soon or contact us to request support for your exam.
                                </p>
                                <a
                                    href="mailto:support@rankifyai.com"
                                    className="inline-flex items-center gap-2 px-8 py-3 bg-black text-white font-bold border-2 border-black rounded-lg shadow-brutal hover:translate-y-1 hover:shadow-brutal-hover transition-all uppercase"
                                >
                                    <span className="material-symbols-outlined">mail</span>
                                    Request Exam
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <Footer />
        </>
    );
}
