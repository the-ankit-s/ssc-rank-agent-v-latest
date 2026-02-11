"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface Exam {
    id: number;
    name: string;
    slug: string;
    agency: string;
    year: number;
    tier: string | null;
    status: string;
    isActive: boolean;
    totalMarks: number;
    totalQuestions: number;
    duration: number;
    defaultPositive: number;
    defaultNegative: number;
    hasNormalization: boolean;
    hasSectionalTiming: boolean;
    isFeatured: boolean;
    totalSubmissions: number;
    totalShifts: number;
    sectionConfig: Record<string, any>;
    examStartDate: string | null;
    examEndDate: string | null;
    answerKeyUrl: string | null;
    officialWebsite: string | null;
    createdAt: string;
}

export default function ExamDetailsPage() {
    const params = useParams();
    const examId = params.id as string;
    const [exam, setExam] = useState<Exam | null>(null);
    const [stats, setStats] = useState({ shifts: 0, submissions: 0 });
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("overview");

    // Analytics State
    const [analyticsData, setAnalyticsData] = useState<any>(null);
    const [loadingAnalytics, setLoadingAnalytics] = useState(false);
    const [analyticsError, setAnalyticsError] = useState<string | null>(null);

    async function fetchAnalytics() {
        setLoadingAnalytics(true);
        setAnalyticsError(null);
        try {
            const res = await fetch(`/api/admin/exams/${examId}/analytics`);
            if (!res.ok) {
                if (res.status === 401) throw new Error("Unauthorized Access");
                throw new Error("Failed to fetch analytics");
            }
            const data = await res.json();
            if (data.analytics) {
                setAnalyticsData(data.analytics);
            } else {
                setAnalyticsError("No analytics data available for this exam.");
            }
        } catch (error) {
            console.error("Failed to fetch analytics", error);
            setAnalyticsError("Failed to load analytics. Please try again.");
        } finally {
            setLoadingAnalytics(false);
        }
    }

    // Auto-fetch analytics when tab changes
    useEffect(() => {
        if (activeTab === "analytics" && !analyticsData) {
            fetchAnalytics();
        }
    }, [activeTab]);

    useEffect(() => {
        async function fetchExam() {
            try {
                const res = await fetch(`/api/admin/exams/${examId}`);
                const data = await res.json();
                setExam(data.exam);
                setStats(data.stats || { shifts: 0, submissions: 0 });
            } catch (error) {
                console.error("Error fetching exam:", error);
            } finally {
                setLoading(false);
            }
        }
        if (examId) fetchExam();
    }, [examId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <span className="material-symbols-outlined text-5xl text-primary animate-spin">autorenew</span>
            </div>
        );
    }

    if (!exam) {
        return (
            <div className="text-center py-12">
                <span className="material-symbols-outlined text-5xl text-gray-300">error</span>
                <p className="mt-2 text-gray-500">Exam not found</p>
            </div>
        );
    }

    const statusColors: Record<string, string> = {
        active: "bg-green-100 text-green-700",
        upcoming: "bg-yellow-100 text-yellow-700",
        closed: "bg-gray-100 text-gray-700",
        answer_key_released: "bg-blue-100 text-blue-700",
    };

    const tabs = [
        { id: "overview", label: "Overview", icon: "info" },
        { id: "shifts", label: "Shifts", icon: "schedule" },
        { id: "submissions", label: "Submissions", icon: "description" },
        { id: "analytics", label: "Analytics", icon: "bar_chart" },
        { id: "cutoffs", label: "Cutoffs", icon: "trending_up" },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/admin/exams" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <span className="material-symbols-outlined">arrow_back</span>
                </Link>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-black text-gray-900">{exam.name}</h1>
                        <span className={`px-3 py-1 rounded font-bold text-xs ${statusColors[exam.status] || "bg-gray-100"}`}>
                            {exam.status?.replace("_", " ").toUpperCase()}
                        </span>
                        {exam.isFeatured && (
                            <span className="px-3 py-1 bg-brutal-yellow rounded font-bold text-xs">FEATURED</span>
                        )}
                    </div>
                    <p className="text-gray-600">{exam.agency} • {exam.year}{exam.tier ? ` • ${exam.tier}` : ""}</p>
                </div>
                <div className="flex gap-3">
                    <Link
                        href={`/admin/exams/${examId}/edit`}
                        className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-black rounded-lg font-bold text-sm shadow-brutal-sm hover:translate-y-0.5 hover:shadow-none transition-all"
                    >
                        <span className="material-symbols-outlined">edit</span>
                        Edit
                    </Link>
                    <button className="flex items-center gap-2 px-4 py-2 bg-brutal-yellow text-black font-bold border-2 border-black rounded-lg shadow-brutal-sm hover:translate-y-0.5 hover:shadow-none transition-all">
                        <span className="material-symbols-outlined">content_copy</span>
                        Duplicate
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border-2 border-black shadow-brutal">
                    <p className="text-3xl font-black text-gray-900">{stats.submissions}</p>
                    <p className="text-sm text-gray-500 font-medium">Total Submissions</p>
                </div>
                <div className="bg-white p-4 rounded-xl border-2 border-black shadow-brutal">
                    <p className="text-3xl font-black text-gray-900">{stats.shifts}</p>
                    <p className="text-sm text-gray-500 font-medium">Total Shifts</p>
                </div>
                <div className="bg-white p-4 rounded-xl border-2 border-black shadow-brutal">
                    <p className="text-3xl font-black text-gray-900">{exam.totalMarks}</p>
                    <p className="text-sm text-gray-500 font-medium">Total Marks</p>
                </div>
                <div className="bg-white p-4 rounded-xl border-2 border-black shadow-brutal">
                    <p className="text-3xl font-black text-gray-900">{exam.duration}</p>
                    <p className="text-sm text-gray-500 font-medium">Duration (min)</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-xl border-2 border-black shadow-brutal overflow-hidden">
                <div className="border-b-2 border-black flex overflow-x-auto">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-6 py-3 font-bold text-sm whitespace-nowrap ${activeTab === tab.id ? "bg-brutal-yellow border-r-2 border-black" : "hover:bg-gray-50"
                                }`}
                        >
                            <span className="material-symbols-outlined text-lg">{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="p-6">
                    {activeTab === "overview" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Basic Info */}
                            <div className="space-y-4">
                                <h3 className="font-bold text-lg border-b pb-2">Basic Information</h3>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <p className="text-gray-500">Slug</p>
                                        <p className="font-mono font-bold">{exam.slug}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500">Agency</p>
                                        <p className="font-bold">{exam.agency}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500">Year</p>
                                        <p className="font-bold">{exam.year}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500">Tier</p>
                                        <p className="font-bold">{exam.tier || "-"}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500">Active</p>
                                        <p className={`font-bold ${exam.isActive ? "text-green-600" : "text-red-600"}`}>
                                            {exam.isActive ? "Yes" : "No"}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500">Featured</p>
                                        <p className="font-bold">{exam.isFeatured ? "Yes" : "No"}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Config */}
                            <div className="space-y-4">
                                <h3 className="font-bold text-lg border-b pb-2">Exam Configuration</h3>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <p className="text-gray-500">Total Questions</p>
                                        <p className="font-bold">{exam.totalQuestions}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500">Total Marks</p>
                                        <p className="font-bold">{exam.totalMarks}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500">+ve Marks</p>
                                        <p className="font-bold">{exam.defaultPositive}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500">-ve Marks</p>
                                        <p className="font-bold">{exam.defaultNegative}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500">Normalization</p>
                                        <p className="font-bold">{exam.hasNormalization ? "Enabled" : "Disabled"}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500">Sectional Timing</p>
                                        <p className="font-bold">{exam.hasSectionalTiming ? "Yes" : "No"}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Sections */}
                            <div className="md:col-span-2 space-y-4">
                                <h3 className="font-bold text-lg border-b pb-2">Section Configuration</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {Object.entries(exam.sectionConfig || {}).map(([code, config]: [string, any]) => (
                                        <div key={code} className="p-3 bg-gray-50 rounded-lg border">
                                            <p className="font-bold text-sm">{config.label || code}</p>
                                            <p className="text-xs text-gray-500">
                                                {config.questions} Qs • {config.maxMarks} Marks
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                +{config.positive} / -{config.negative}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Dates & Links */}
                            <div className="space-y-4">
                                <h3 className="font-bold text-lg border-b pb-2">Important Dates</h3>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <p className="text-gray-500">Start Date</p>
                                        <p className="font-bold">{exam.examStartDate ? new Date(exam.examStartDate).toLocaleDateString() : "-"}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500">End Date</p>
                                        <p className="font-bold">{exam.examEndDate ? new Date(exam.examEndDate).toLocaleDateString() : "-"}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500">Created</p>
                                        <p className="font-bold">{new Date(exam.createdAt).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="font-bold text-lg border-b pb-2">Links</h3>
                                <div className="space-y-2 text-sm">
                                    {exam.answerKeyUrl && (
                                        <a href={exam.answerKeyUrl} target="_blank" className="block text-primary hover:underline truncate">
                                            Answer Key: {exam.answerKeyUrl}
                                        </a>
                                    )}
                                    {exam.officialWebsite && (
                                        <a href={exam.officialWebsite} target="_blank" className="block text-primary hover:underline truncate">
                                            Official: {exam.officialWebsite}
                                        </a>
                                    )}
                                    {!exam.answerKeyUrl && !exam.officialWebsite && (
                                        <p className="text-gray-500">No links configured</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "shifts" && (
                        <div className="text-center py-8">
                            <span className="material-symbols-outlined text-5xl text-gray-300">schedule</span>
                            <p className="mt-2 text-gray-500">View and manage shifts for this exam</p>
                            <Link
                                href={`/admin/shifts?examId=${examId}`}
                                className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-brutal-yellow font-bold border-2 border-black rounded-lg"
                            >
                                View All Shifts
                            </Link>
                        </div>
                    )}

                    {activeTab === "submissions" && (
                        <div className="text-center py-8">
                            <span className="material-symbols-outlined text-5xl text-gray-300">description</span>
                            <p className="mt-2 text-gray-500">View all submissions for this exam</p>
                            <Link
                                href={`/admin/submissions?examId=${examId}`}
                                className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-brutal-yellow font-bold border-2 border-black rounded-lg"
                            >
                                View All Submissions
                            </Link>
                        </div>
                    )}

                    {activeTab === "analytics" && (
                        <div className="space-y-6">
                            {!analyticsData ? (
                                <div className="text-center py-12">
                                    {analyticsError ? (
                                        <div className="mb-4 text-red-600 font-bold flex flex-col items-center gap-2">
                                            <span className="material-symbols-outlined text-3xl">error</span>
                                            {analyticsError}
                                        </div>
                                    ) : null}
                                    <button
                                        onClick={fetchAnalytics}
                                        disabled={loadingAnalytics}
                                        className="px-6 py-3 bg-black text-white font-bold rounded-lg shadow-brutal hover:translate-y-1 hover:shadow-none transition-all disabled:opacity-50 flex items-center gap-2 mx-auto"
                                    >
                                        {loadingAnalytics && <span className="material-symbols-outlined animate-spin text-sm">autorenew</span>}
                                        {loadingAnalytics ? "Loading Analytics..." : "Load Analytics Data"}
                                    </button>
                                </div>
                            ) : (
                                <>
                                    {/* Key Metrics */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
                                            <p className="text-xs font-bold text-blue-600 uppercase">Avg Score</p>
                                            <p className="text-2xl font-black">{analyticsData.avgScore}</p>
                                        </div>
                                        <div className="p-4 bg-green-50 border-2 border-green-200 rounded-xl">
                                            <p className="text-xs font-bold text-green-600 uppercase">Max Score</p>
                                            <p className="text-2xl font-black">{analyticsData.maxScore}</p>
                                        </div>
                                        <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl">
                                            <p className="text-xs font-bold text-red-600 uppercase">Min Score</p>
                                            <p className="text-2xl font-black">{analyticsData.minScore}</p>
                                        </div>
                                        <div className="p-4 bg-purple-50 border-2 border-purple-200 rounded-xl">
                                            <p className="text-xs font-bold text-purple-600 uppercase">Total Samples</p>
                                            <p className="text-2xl font-black">{analyticsData.totalSubmissions}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Score Distribution */}
                                        <div className="p-6 bg-white border-2 border-black rounded-xl shadow-brutal-sm">
                                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                                                <span className="material-symbols-outlined">bar_chart</span>
                                                Score Distribution
                                            </h3>
                                            <div className="space-y-3">
                                                {analyticsData.scoreDistribution.map((item: any) => (
                                                    <div key={item.range}>
                                                        <div className="flex justify-between text-sm mb-1">
                                                            <span className="font-bold">{item.range}</span>
                                                            <span className="text-gray-500">{item.count} students</span>
                                                        </div>
                                                        <div className="h-4 bg-gray-100 rounded-full overflow-hidden border border-black">
                                                            <div
                                                                className="h-full bg-brutal-yellow"
                                                                style={{ width: `${(item.count / analyticsData.totalSubmissions) * 100}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                ))}
                                                {analyticsData.scoreDistribution.length === 0 && (
                                                    <p className="text-gray-500 text-center py-4">No data available</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Category Breakdown */}
                                        <div className="p-6 bg-white border-2 border-black rounded-xl shadow-brutal-sm">
                                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                                                <span className="material-symbols-outlined">pie_chart</span>
                                                Category Breakdown
                                            </h3>
                                            <div className="space-y-4">
                                                {analyticsData.categoryBreakdown.map((item: any) => (
                                                    <div key={item.category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                                                        <div>
                                                            <span className="px-2 py-1 bg-black text-white text-xs font-bold rounded mr-2">
                                                                {item.category}
                                                            </span>
                                                            <span className="text-sm font-medium">{item.count} students</span>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-xs text-gray-500 uppercase font-bold">Avg</p>
                                                            <p className="font-bold">{item.avgScore}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {activeTab === "cutoffs" && (
                        <div className="text-center py-8">
                            <span className="material-symbols-outlined text-5xl text-gray-300">trending_up</span>
                            <p className="mt-2 text-gray-500">Cutoff predictions for this exam</p>
                            <Link
                                href={`/admin/cutoffs?examId=${examId}`}
                                className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-brutal-yellow font-bold border-2 border-black rounded-lg"
                            >
                                Manage Cutoffs
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
