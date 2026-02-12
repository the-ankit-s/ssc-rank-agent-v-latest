"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CategoryBadge from "@/components/admin/CategoryBadge";
import RankCard from "@/components/admin/RankCard";
import ResponseSheetTable from "@/components/admin/ResponseSheetTable";
import EditSubmissionModal from "@/components/admin/EditSubmissionModal";
import DeleteConfirmationModal from "@/components/admin/DeleteConfirmationModal";

export default function SubmissionDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id } = use(params);
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showResponseSheet, setShowResponseSheet] = useState(false);
    const [recalculating, setRecalculating] = useState<string | null>(null);

    useEffect(() => {
        fetchSubmission();
    }, [id]);

    async function fetchSubmission() {
        try {
            setLoading(true);
            setError(null);
            const res = await fetch(`/api/admin/submissions/${id}`);
            if (!res.ok) throw new Error("Failed to fetch submission");
            const responseData = await res.json();
            setData(responseData);
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred");
        } finally {
            setLoading(false);
        }
    }

    const handleDelete = async () => {
        try {
            const res = await fetch(`/api/admin/submissions/${id}`, { method: "DELETE" });
            if (res.ok) {
                router.push("/admin/submissions");
            } else {
                alert("Failed to delete submission");
            }
        } catch (error) {
            console.error(error);
            alert("Error deleting submission");
        }
    };

    const handleEdit = async (formData: any) => {
        try {
            const res = await fetch(`/api/admin/submissions/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });
            if (res.ok) {
                await fetchSubmission();
            } else {
                throw new Error("Failed to update");
            }
        } catch (error) {
            throw error;
        }
    };

    const handleRecalculate = async (action: "score" | "rank") => {
        try {
            setRecalculating(action);
            const res = await fetch(`/api/admin/submissions/${id}/recalculate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action }),
            });
            const result = await res.json();
            if (res.ok) {
                alert(result.message);
                await fetchSubmission();
            } else {
                alert(result.error || "Recalculation failed");
            }
        } catch (error) {
            alert("Error during recalculation");
        } finally {
            setRecalculating(null);
        }
    };

    const toggleDisputed = async () => {
        try {
            const res = await fetch(`/api/admin/submissions/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isDisputed: !data.submission.isDisputed }),
            });
            if (res.ok) {
                await fetchSubmission();
            }
        } catch (error) {
            alert("Error updating disputed status");
        }
    };

    if (loading) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="h-24 bg-gray-200 rounded-xl border-2 border-black" />
                <div className="grid grid-cols-2 gap-6">
                    <div className="h-64 bg-gray-200 rounded-xl border-2 border-black" />
                    <div className="h-64 bg-gray-200 rounded-xl border-2 border-black" />
                </div>
                <div className="h-96 bg-gray-200 rounded-xl border-2 border-black" />
            </div>
        );
    }

    if (error || !data?.submission) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto border-2 border-black">
                        <span className="material-symbols-outlined text-red-600 text-3xl">error</span>
                    </div>
                    <h2 className="text-2xl font-black">Error Loading Submission</h2>
                    <p className="text-gray-600">{error || "Submission not found"}</p>
                    <Link
                        href="/admin/submissions"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white font-bold border-2 border-black rounded-lg hover:bg-gray-800"
                    >
                        Back to Submissions
                    </Link>
                </div>
            </div>
        );
    }

    const { submission, exam, shift } = data;
    const sections = Object.keys(submission.sectionPerformance || {});
    const totalCandidates = exam?.totalSubmissions || 1000;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-4">
                    <Link
                        href="/admin/submissions"
                        className="w-10 h-10 flex items-center justify-center rounded-lg border-2 border-black hover:bg-gray-100"
                    >
                        <span className="material-symbols-outlined">arrow_back</span>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-black text-gray-900">{submission.name}</h1>
                        <p className="text-gray-600">
                            Roll No: {submission.rollNumber} • {exam?.name || "N/A"}
                        </p>
                    </div>
                </div>

                {/* Actions Panel */}
                <div className="flex items-center gap-2 flex-wrap">
                    <button
                        onClick={() => setShowEditModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 font-bold border-2 border-black rounded-lg shadow-brutal-sm hover:translate-y-0.5 hover:shadow-none transition-all"
                    >
                        <span className="material-symbols-outlined">edit</span>
                        Edit
                    </button>
                    <button
                        onClick={() => handleRecalculate("score")}
                        disabled={recalculating === "score"}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 font-bold border-2 border-black rounded-lg shadow-brutal-sm hover:translate-y-0.5 hover:shadow-none transition-all disabled:opacity-50"
                    >
                        <span className="material-symbols-outlined">calculate</span>
                        {recalculating === "score" ? "Calculating..." : "Recalc Score"}
                    </button>
                    <button
                        onClick={() => handleRecalculate("rank")}
                        disabled={recalculating === "rank"}
                        className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 font-bold border-2 border-black rounded-lg shadow-brutal-sm hover:translate-y-0.5 hover:shadow-none transition-all disabled:opacity-50"
                    >
                        <span className="material-symbols-outlined">leaderboard</span>
                        {recalculating === "rank" ? "Calculating..." : "Recalc Rank"}
                    </button>
                    <button
                        onClick={() => setShowDeleteModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 font-bold border-2 border-black rounded-lg shadow-brutal-sm hover:translate-y-0.5 hover:shadow-none transition-all"
                    >
                        <span className="material-symbols-outlined">delete</span>
                        Delete
                    </button>
                </div>
            </div>

            {/* Candidate Information Card */}
            <div className="bg-white p-6 rounded-xl border-2 border-black shadow-brutal">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined">person</span>
                    Candidate Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm text-gray-500 font-medium">Roll Number</label>
                        <p className="text-lg font-black">{submission.rollNumber}</p>
                    </div>
                    <div>
                        <label className="text-sm text-gray-500 font-medium">Name</label>
                        <p className="text-lg font-black">{submission.name}</p>
                    </div>
                    <div>
                        <label className="text-sm text-gray-500 font-medium">Father's Name</label>
                        <p className="text-lg font-black">{submission.fatherName || "-"}</p>
                    </div>
                    <div>
                        <label className="text-sm text-gray-500 font-medium">Date of Birth</label>
                        <p className="text-lg font-black">{submission.dob || "-"}</p>
                    </div>
                    <div>
                        <label className="text-sm text-gray-500 font-medium">Category</label>
                        <div className="mt-1">
                            <CategoryBadge category={submission.category} />
                        </div>
                    </div>
                    <div>
                        <label className="text-sm text-gray-500 font-medium">Gender</label>
                        <p className="text-lg font-black">{submission.gender}</p>
                    </div>
                    <div>
                        <label className="text-sm text-gray-500 font-medium">State</label>
                        <p className="text-lg font-black">{submission.state || "-"}</p>
                    </div>
                    <div>
                        <label className="text-sm text-gray-500 font-medium">Exam Centre</label>
                        <p className="text-lg font-black">
                            {submission.examCentre || "-"}
                            {submission.examCentreCode && ` (${submission.examCentreCode})`}
                        </p>
                    </div>
                    <div>
                        <label className="text-sm text-gray-500 font-medium">PWD Status</label>
                        <p className="text-lg font-black">{submission.isPWD ? "Yes" : "No"}</p>
                    </div>
                    <div>
                        <label className="text-sm text-gray-500 font-medium">Ex-Serviceman</label>
                        <p className="text-lg font-black">{submission.isExServiceman ? "Yes" : "No"}</p>
                    </div>
                </div>
            </div>

            {/* Score Information Card */}
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-6 rounded-xl border-2 border-black shadow-brutal">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined">grade</span>
                    Score Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div className="bg-blue-600 text-white p-6 rounded-xl border-2 border-black shadow-brutal">
                        <p className="text-sm font-bold mb-2">Raw Score</p>
                        <p className="text-5xl font-black">{submission.rawScore.toFixed(2)}</p>
                    </div>
                    <div className="bg-purple-600 text-white p-6 rounded-xl border-2 border-black shadow-brutal">
                        <p className="text-sm font-bold mb-2">Normalized Score</p>
                        <p className="text-5xl font-black">
                            {submission.normalizedScore?.toFixed(2) || "-"}
                        </p>
                    </div>
                    <div className="bg-white p-6 rounded-xl border-2 border-black shadow-brutal flex flex-col items-center justify-center">
                        <p className="text-sm font-bold mb-2">Accuracy</p>
                        <div className="relative w-24 h-24">
                            <svg className="w-24 h-24 transform -rotate-90">
                                <circle
                                    cx="48"
                                    cy="48"
                                    r="40"
                                    stroke="#e5e7eb"
                                    strokeWidth="8"
                                    fill="none"
                                />
                                <circle
                                    cx="48"
                                    cy="48"
                                    r="40"
                                    stroke="#10b981"
                                    strokeWidth="8"
                                    fill="none"
                                    strokeDasharray={`${2 * Math.PI * 40}`}
                                    strokeDashoffset={`${2 * Math.PI * 40 * (1 - (submission.accuracy || 0) / 100)}`}
                                    strokeLinecap="round"
                                />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-2xl font-black">
                                    {submission.accuracy?.toFixed(1) || 0}%
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white p-4 rounded-lg border-2 border-black">
                        <p className="text-sm text-gray-500 mb-1">Total Attempted</p>
                        <p className="text-3xl font-black text-blue-600">{submission.totalAttempted || 0}</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg border-2 border-black">
                        <p className="text-sm text-gray-500 mb-1">Correct</p>
                        <p className="text-3xl font-black text-green-600">{submission.totalCorrect || 0}</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg border-2 border-black">
                        <p className="text-sm text-gray-500 mb-1">Wrong</p>
                        <p className="text-3xl font-black text-red-600">{submission.totalWrong || 0}</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg border-2 border-black">
                        <p className="text-sm text-gray-500 mb-1">Unattempted</p>
                        <p className="text-3xl font-black text-gray-600">
                            {(exam?.totalQuestions || 0) - (submission.totalAttempted || 0)}
                        </p>
                    </div>
                </div>

                {/* Section-wise breakdown */}
                <div className="bg-white p-4 rounded-lg border-2 border-black">
                    <h4 className="font-bold mb-3">Section-wise Performance</h4>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b-2 border-black">
                                <tr>
                                    <th className="py-2 px-4 text-left">Section</th>
                                    <th className="py-2 px-4 text-right">Marks</th>
                                    <th className="py-2 px-4 text-right">Correct</th>
                                    <th className="py-2 px-4 text-right">Wrong</th>
                                    <th className="py-2 px-4 text-right">Unattempted</th>
                                    <th className="py-2 px-4 text-right">Accuracy</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.entries(submission.sectionPerformance || {}).map(
                                    ([section, stats]: [string, any]) => {
                                        const attempted = stats.correct + stats.wrong;
                                        const accuracy = attempted > 0 ? (stats.correct / attempted) * 100 : 0;
                                        return (
                                            <tr key={section} className="border-b">
                                                <td className="py-2 px-4 font-bold">{section}</td>
                                                <td className="py-2 px-4 text-right font-bold">
                                                    {stats.marks?.toFixed(2) || 0}
                                                </td>
                                                <td className="py-2 px-4 text-right text-green-600 font-bold">
                                                    {stats.correct}
                                                </td>
                                                <td className="py-2 px-4 text-right text-red-600 font-bold">
                                                    {stats.wrong}
                                                </td>
                                                <td className="py-2 px-4 text-right text-gray-500 font-bold">
                                                    {stats.unattempted}
                                                </td>
                                                <td className="py-2 px-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden border border-black">
                                                            <div
                                                                className="h-full bg-green-500"
                                                                style={{ width: `${accuracy}%` }}
                                                            />
                                                        </div>
                                                        <span className="font-bold text-xs">
                                                            {accuracy.toFixed(0)}%
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    }
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Rank Information Card */}
            <div className="bg-white p-6 rounded-xl border-2 border-black shadow-brutal">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined">leaderboard</span>
                    Rank Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <RankCard
                        title="Overall Rank"
                        rank={submission.overallRank}
                        totalCandidates={totalCandidates}
                        percentile={submission.overallPercentile}
                        color="blue"
                    />
                    <RankCard
                        title="Category Rank"
                        rank={submission.categoryRank}
                        totalCandidates={Math.floor(totalCandidates * 0.3)}
                        percentile={submission.categoryPercentile}
                        color="purple"
                    />
                    <RankCard
                        title="Shift Rank"
                        rank={submission.shiftRank}
                        totalCandidates={shift?.candidateCount || 100}
                        percentile={submission.shiftPercentile}
                        color="green"
                    />
                    <RankCard
                        title="State Rank"
                        rank={submission.stateRank}
                        totalCandidates={Math.floor(totalCandidates * 0.1)}
                        percentile={null}
                        color="orange"
                    />
                </div>
            </div>

            {/* Response Sheet Section */}
            <div className="bg-white p-6 rounded-xl border-2 border-black shadow-brutal">
                <button
                    onClick={() => setShowResponseSheet(!showResponseSheet)}
                    className="w-full flex items-center justify-between mb-4"
                >
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        <span className="material-symbols-outlined">description</span>
                        Response Sheet
                    </h3>
                    <span className="material-symbols-outlined">
                        {showResponseSheet ? "expand_less" : "expand_more"}
                    </span>
                </button>
                {showResponseSheet && submission.responses && (
                    <ResponseSheetTable responses={submission.responses} sections={sections} />
                )}
            </div>

            {/* Metadata Card */}
            <div className="bg-white p-6 rounded-xl border-2 border-black shadow-brutal">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined">info</span>
                    Metadata
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm text-gray-500 font-medium">Source</label>
                        <p className="text-lg font-black">{submission.source || "-"}</p>
                    </div>
                    <div>
                        <label className="text-sm text-gray-500 font-medium">Source URL</label>
                        {submission.sourceUrl ? (
                            <a
                                href={submission.sourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-lg font-black text-blue-600 hover:underline break-all"
                            >
                                {submission.sourceUrl}
                            </a>
                        ) : (
                            <p className="text-lg font-black">-</p>
                        )}
                    </div>
                    <div>
                        <label className="text-sm text-gray-500 font-medium">URL Hash</label>
                        <p className="text-lg font-mono text-xs">{submission.urlHash || "-"}</p>
                    </div>
                    <div>
                        <label className="text-sm text-gray-500 font-medium">Submission Timestamp</label>
                        <p className="text-lg font-black">
                            {new Date(submission.createdAt).toLocaleString()}
                        </p>
                    </div>
                    <div>
                        <label className="text-sm text-gray-500 font-medium">Submitter IP</label>
                        <p className="text-lg font-black">{submission.submitterIp || "-"}</p>
                    </div>
                    <div>
                        <label className="text-sm text-gray-500 font-medium">Last Updated</label>
                        <p className="text-lg font-black">
                            {new Date(submission.updatedAt).toLocaleString()}
                        </p>
                    </div>
                    <div>
                        <label className="text-sm text-gray-500 font-medium">Result View Count</label>
                        <p className="text-lg font-black">{submission.resultViewCount || 0}</p>
                    </div>
                    <div>
                        <label className="text-sm text-gray-500 font-medium">Is Result Public?</label>
                        <p className="text-lg font-black">{submission.isResultPublic ? "Yes" : "No"}</p>
                    </div>
                    <div>
                        <label className="text-sm text-gray-500 font-medium">Is Disputed?</label>
                        <div className="flex items-center gap-2">
                            <p className="text-lg font-black">{submission.isDisputed ? "Yes" : "No"}</p>
                            <button
                                onClick={toggleDisputed}
                                className={`px-3 py-1 font-bold border-2 border-black rounded-lg text-sm ${
                                    submission.isDisputed
                                        ? "bg-yellow-100 text-yellow-700"
                                        : "bg-gray-100 text-gray-700"
                                }`}
                            >
                                Toggle
                            </button>
                        </div>
                    </div>
                </div>

                {/* Admin Notes Section */}
                <div className="mt-6 pt-6 border-t-2 border-black">
                    <label className="text-sm text-gray-500 font-medium block mb-2">Admin Notes</label>
                    <div className="bg-gray-50 p-4 rounded-lg border-2 border-black min-h-[100px]">
                        <p className="text-sm whitespace-pre-wrap">
                            {submission.adminNotes || "No admin notes available."}
                        </p>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <EditSubmissionModal
                isOpen={showEditModal}
                onClose={() => setShowEditModal(false)}
                submission={submission}
                onSave={handleEdit}
            />

            <DeleteConfirmationModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDelete}
                title="Delete Submission"
                message="Are you sure you want to delete this submission? This action cannot be undone."
            />
        </div>
    );
}
