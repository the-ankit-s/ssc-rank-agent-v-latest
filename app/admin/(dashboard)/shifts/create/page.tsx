"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function CreateShiftPage() {
    const router = useRouter();
    const [exams, setExams] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({
        examId: "",
        date: "",
        shiftNumber: 1,
        timeSlot: "morning",
        startTime: "",
        endTime: "",
        difficultyLabel: "moderate",
        difficultyIndex: 0.5,
        normalizationFactor: 1.0,
        shiftCode: "" // Optional override
    });

    useEffect(() => {
        async function fetchExams() {
            try {
                const res = await fetch("/api/admin/exams?limit=100");
                const data = await res.json();
                setExams(data.exams || []);
                if (data.exams && data.exams.length > 0) {
                    setFormData(prev => ({ ...prev, examId: data.exams[0].id }));
                }
            } catch (error) {
                console.error("Error fetching exams:", error);
            } finally {
                setLoading(false);
            }
        }
        fetchExams();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch("/api/admin/shifts/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...formData,
                    examId: parseInt(formData.examId),
                    shiftNumber: parseInt(formData.shiftNumber.toString()),
                    difficultyIndex: parseFloat(formData.difficultyIndex.toString()),
                    normalizationFactor: parseFloat(formData.normalizationFactor.toString()),
                }),
            });

            if (res.ok) {
                router.push("/admin/shifts");
                router.refresh();
            } else {
                const err = await res.json();
                alert(`Failed to create shift: ${err.error || "Unknown error"}`);
            }
        } catch (error) {
            console.error(error);
            alert("Error submitting form");
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-[400px]">
            <span className="material-symbols-outlined text-black text-6xl animate-spin">rotate_right</span>
        </div>
    );

    return (
        <div className="max-w-3xl mx-auto space-y-6 pb-10">
            <div className="flex items-center gap-4">
                <Link
                    href="/admin/shifts"
                    className="w-10 h-10 flex items-center justify-center rounded-xl border-2 border-gray-200 hover:border-gray-900 bg-white hover:bg-gray-50 transition-all"
                >
                    <span className="material-symbols-outlined">arrow_back</span>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Create New Shift</h1>
                    <p className="text-gray-500 font-medium">Add a new exam shift to the schedule.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="card-base p-8 space-y-8 bg-white">
                {/* Basic Info */}
                <div className="space-y-4">
                    <h3 className="text-lg font-bold text-gray-900 border-b-2 border-gray-100 pb-2">Basic Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="col-span-2">
                            <label className="block text-sm font-bold text-gray-700 mb-1">Select Exam <span className="text-red-500">*</span></label>
                            <select
                                required
                                value={formData.examId}
                                onChange={(e) => setFormData({ ...formData, examId: e.target.value })}
                                className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-gray-900 outline-none bg-white font-medium"
                            >
                                {exams.map((exam) => (
                                    <option key={exam.id} value={exam.id}>
                                        {exam.name} ({exam.year})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Shift Date <span className="text-red-500">*</span></label>
                            <input
                                required
                                type="date"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-gray-900 outline-none font-medium"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Shift Number <span className="text-red-500">*</span></label>
                            <input
                                required
                                type="number"
                                min="1"
                                value={formData.shiftNumber}
                                onChange={(e) => setFormData({ ...formData, shiftNumber: parseInt(e.target.value) })}
                                className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-gray-900 outline-none font-medium"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Shift Code (Optional)</label>
                            <input
                                type="text"
                                placeholder="Auto-generated if empty"
                                value={formData.shiftCode}
                                onChange={(e) => setFormData({ ...formData, shiftCode: e.target.value })}
                                className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-gray-900 outline-none font-medium"
                            />
                            <p className="text-xs text-gray-400 mt-1">E.g. 20240214_S1</p>
                        </div>
                    </div>
                </div>

                {/* Timing */}
                <div className="space-y-4">
                    <h3 className="text-lg font-bold text-gray-900 border-b-2 border-gray-100 pb-2">Timing Configuration</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Time Slot <span className="text-red-500">*</span></label>
                            <select
                                required
                                value={formData.timeSlot}
                                onChange={(e) => setFormData({ ...formData, timeSlot: e.target.value })}
                                className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-gray-900 outline-none bg-white font-medium"
                            >
                                <option value="morning">Morning</option>
                                <option value="afternoon">Afternoon</option>
                                <option value="evening">Evening</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Start Time</label>
                            <input
                                type="time"
                                value={formData.startTime}
                                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-gray-900 outline-none font-medium"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">End Time</label>
                            <input
                                type="time"
                                value={formData.endTime}
                                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                                className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-gray-900 outline-none font-medium"
                            />
                        </div>
                    </div>
                </div>

                {/* Analysis Params */}
                <div className="space-y-4">
                    <h3 className="text-lg font-bold text-gray-900 border-b-2 border-gray-100 pb-2">Analysis Parameters</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Difficulty</label>
                            <select
                                value={formData.difficultyLabel}
                                onChange={(e) => setFormData({ ...formData, difficultyLabel: e.target.value })}
                                className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-gray-900 outline-none bg-white font-medium"
                            >
                                <option value="easy">Easy</option>
                                <option value="moderate">Moderate</option>
                                <option value="difficult">Difficult</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Diff. Index (0.0 - 1.0)</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                max="1"
                                value={formData.difficultyIndex}
                                onChange={(e) => setFormData({ ...formData, difficultyIndex: parseFloat(e.target.value) })}
                                className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-gray-900 outline-none font-medium"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Norm. Factor</label>
                            <input
                                type="number"
                                step="0.01"
                                value={formData.normalizationFactor}
                                onChange={(e) => setFormData({ ...formData, normalizationFactor: parseFloat(e.target.value) })}
                                className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-gray-900 outline-none font-medium"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t-2 border-gray-50">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="px-6 py-2.5 font-bold border-2 border-gray-200 text-gray-700 hover:border-gray-900 hover:bg-gray-50 rounded-xl transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="btn-primary px-8 py-2.5 flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined">save</span>
                        Create Shift
                    </button>
                </div>
            </form>
        </div>
    );
}
