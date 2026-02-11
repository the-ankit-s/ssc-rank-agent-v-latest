
"use client";

import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";

interface ScheduledJob {
    id: number;
    name: string;
    jobType: string;
    cronExpression: string;
    isEnabled: boolean;
    lastRunAt?: string;
    nextRunAt?: string;
    config: any;
}

interface Exam {
    id: number;
    name: string;
}

export default function ScheduledJobsPanel({ exams, onScheduleCreated }: { exams: Exam[], onScheduleCreated: () => void }) {
    const [schedules, setSchedules] = useState<ScheduledJob[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);

    // Form state
    const [jobType, setJobType] = useState("cutoff_prediction");
    const [examId, setExamId] = useState("");
    const [frequency, setFrequency] = useState("WEEKLY"); // DAILY, WEEKLY

    useEffect(() => {
        fetchSchedules();
    }, []);

    async function fetchSchedules() {
        try {
            const res = await fetch("/api/admin/scheduled-jobs");
            const data = await res.json();
            setSchedules(data.jobs || []);
        } catch (error) {
            console.error("Error fetching schedules:", error);
        } finally {
            setLoading(false);
        }
    }

    async function handleCreate() {
        if (!examId) return alert("Please select an exam");

        setIsCreating(true);
        try {
            const examName = exams.find(e => e.id === Number(examId))?.name || "Unknown";
            const jobName = `${jobType} - ${examName} (${frequency})`;

            const res = await fetch("/api/admin/scheduled-jobs", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    jobName,
                    jobType,
                    cronExpression: frequency,
                    config: { examId: Number(examId) }
                })
            });

            if (res.ok) {
                fetchSchedules();
                onScheduleCreated();
                // Reset form
                setExamId("");
            } else {
                const err = await res.json();
                alert(err.error || "Failed to create schedule");
            }
        } catch (error) {
            console.error("Error creating schedule:", error);
        } finally {
            setIsCreating(false);
        }
    }

    async function handleDelete(id: number) {
        if (!confirm("Are you sure you want to delete this schedule?")) return;
        try {
            await fetch(`/api/admin/scheduled-jobs?id=${id}`, { method: "DELETE" });
            fetchSchedules();
        } catch (error) {
            console.error("Error deleting schedule:", error);
        }
    }

    return (
        <div className="bg-white p-6 rounded-xl border-2 border-dashed border-gray-400">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-gray-700">schedule</span>
                Scheduled Jobs
            </h3>

            {/* Create Form */}
            <div className="flex flex-col md:flex-row gap-4 mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex-1">
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Job Type</label>
                    <select
                        value={jobType}
                        onChange={(e) => setJobType(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm font-bold"
                    >
                        <option value="cutoff_prediction">Cutoff Prediction</option>
                        <option value="normalization">Normalization</option>
                        <option value="rank_calculation">Rank Calculation</option>
                    </select>
                </div>
                <div className="flex-1">
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Target Exam</label>
                    <select
                        value={examId}
                        onChange={(e) => setExamId(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm font-bold"
                    >
                        <option value="">Select Exam...</option>
                        {exams.map(e => (
                            <option key={e.id} value={e.id}>{e.name}</option>
                        ))}
                    </select>
                </div>
                <div className="flex-1">
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Frequency</label>
                    <select
                        value={frequency}
                        onChange={(e) => setFrequency(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm font-bold"
                    >
                        <option value="DAILY">Daily (Every 24h)</option>
                        <option value="WEEKLY">Weekly (Every 7d)</option>
                    </select>
                </div>
                <div className="flex items-end">
                    <button
                        onClick={handleCreate}
                        disabled={isCreating}
                        className="px-6 py-2 bg-black text-white font-bold rounded-lg border-2 border-black hover:bg-gray-800 disabled:opacity-50"
                    >
                        {isCreating ? "Saving..." : "Add Schedule"}
                    </button>
                </div>
            </div>

            {/* List */}
            {loading ? (
                <div className="text-center py-4 text-gray-500">Loading schedules...</div>
            ) : schedules.length === 0 ? (
                <div className="text-center py-4 text-gray-500 italic">No scheduled jobs active</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {schedules.map(job => (
                        <div key={job.id} className="p-4 bg-white border-2 border-black rounded-lg shadow-brutal-sm flex justify-between items-center group">
                            <div>
                                <p className="font-bold text-sm">{job.name}</p>
                                <div className="flex gap-2 text-xs mt-1">
                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded font-bold capitalize">
                                        {job.jobType.replace(/_/g, " ")}
                                    </span>
                                    <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded font-bold">
                                        {job.cronExpression}
                                    </span>
                                </div>
                                <p className="text-[10px] text-gray-400 mt-2">
                                    Next run: {job.nextRunAt ? formatDistanceToNow(new Date(job.nextRunAt), { addSuffix: true }) : "Pending"}
                                </p>
                            </div>
                            <button
                                onClick={() => handleDelete(job.id)}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Delete Schedule"
                            >
                                <span className="material-symbols-outlined">delete</span>
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
