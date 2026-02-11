"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SubmissionDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id } = use(params);
    const [submission, setSubmission] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSubmission();
    }, [id]);

    async function fetchSubmission() {
        try {
            const res = await fetch(`/api/admin/submissions/${id}`);
            const data = await res.json();
            if (data.submission) setSubmission(data.submission);
        } catch (error) {
            console.error("Error fetching submission:", error);
        } finally {
            setLoading(false);
        }
    }

    const handleDelete = async () => {
        if (!confirm("Are you sure you want to delete this submission?")) return;
        try {
            const res = await fetch(`/api/admin/submissions/${id}`, { method: "DELETE" });
            if (res.ok) {
                router.push("/admin/submissions");
            } else {
                alert("Failed to delete submission");
            }
        } catch (error) {
            console.error(error);
        }
    };

    if (loading) return <div className="p-8 text-center">Loading submission...</div>;
    if (!submission) return <div className="p-8 text-center">Submission not found</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
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
                            Roll No: {submission.rollNumber} • {submission.exam?.name}
                        </p>
                    </div>
                </div>
                <button
                    onClick={handleDelete}
                    className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 font-bold border-2 border-black rounded-lg shadow-brutal-sm hover:translate-y-0.5 hover:shadow-none transition-all"
                >
                    <span className="material-symbols-outlined">delete</span>
                    Delete Submission
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Score Card */}
                <div className="bg-white p-6 rounded-xl border-2 border-black shadow-brutal">
                    <h3 className="font-bold text-gray-500 uppercase mb-4">Score Summary</h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="font-medium">Raw Score</span>
                            <span className="text-2xl font-black text-blue-600">{submission.rawScore}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="font-medium">Normalized</span>
                            <span className="text-2xl font-black text-purple-600">{submission.normalizedScore?.toFixed(2) || "-"}</span>
                        </div>
                        <div className="flex justify-between items-center pt-4 border-t">
                            <span className="font-medium">Overall Rank</span>
                            <span className="text-xl font-black">#{submission.overallRank || "-"}</span>
                        </div>
                    </div>
                </div>

                {/* Candidate Details */}
                <div className="bg-white p-6 rounded-xl border-2 border-black shadow-brutal">
                    <h3 className="font-bold text-gray-500 uppercase mb-4">Candidate Details</h3>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-gray-500">Category:</span> <span className="font-bold">{submission.category}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Gender:</span> <span className="font-bold">{submission.gender}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">DOB:</span> <span className="font-bold">{submission.dob || "-"}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Shift:</span> <span className="font-bold">{submission.shift?.shiftCode}</span></div>
                    </div>
                </div>

                {/* System Info */}
                <div className="bg-white p-6 rounded-xl border-2 border-black shadow-brutal">
                    <h3 className="font-bold text-gray-500 uppercase mb-4">System Info</h3>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-gray-500">Submitted At:</span> <span>{new Date(submission.createdAt).toLocaleString()}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Source:</span> <span className="truncate max-w-[150px]">{submission.sourceUrl || "Direct Upload"}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">IP:</span> <span>{submission.submitterIp || "-"}</span></div>
                    </div>
                </div>
            </div>

            {/* Section Performance */}
            <div className="bg-white p-6 rounded-xl border-2 border-black shadow-brutal">
                <h3 className="text-lg font-bold mb-4">Section Performance</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b-2 border-black">
                            <tr>
                                <th className="py-2 px-4 text-left">Section</th>
                                <th className="py-2 px-4 text-right">Marks</th>
                                <th className="py-2 px-4 text-right">Correct</th>
                                <th className="py-2 px-4 text-right">Wrong</th>
                                <th className="py-2 px-4 text-right">Unattempted</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.entries(submission.sectionPerformance || {}).map(([section, stats]: [string, any]) => (
                                <tr key={section} className="border-b">
                                    <td className="py-2 px-4 font-bold">{section}</td>
                                    <td className="py-2 px-4 text-right">{stats.marks}</td>
                                    <td className="py-2 px-4 text-right text-green-600">{stats.correct}</td>
                                    <td className="py-2 px-4 text-right text-red-600">{stats.wrong}</td>
                                    <td className="py-2 px-4 text-right text-gray-500">{stats.unattempted}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
