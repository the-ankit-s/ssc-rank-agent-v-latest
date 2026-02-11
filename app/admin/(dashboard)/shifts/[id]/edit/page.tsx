"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export default function EditShiftPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const [exams, setExams] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [recalculating, setRecalculating] = useState(false);

    // Form State
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
        shiftCode: "",
        // Stats (Read-only)
        candidateCount: 0,
        avgRawScore: 0,
        maxRawScore: 0,
        minRawScore: 0,
        stdDev: 0,
        updatedAt: ""
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [examsRes, shiftRes] = await Promise.all([
                    fetch("/api/admin/exams?limit=100"),
                    fetch(`/api/admin/shifts/${params.id}`)
                ]);

                const examsData = await examsRes.json();
                const shiftData = await shiftRes.json();

                if (examsData.exams) setExams(examsData.exams);

                if (shiftData.shift) {
                    const s = shiftData.shift;
                    setFormData({
                        examId: s.examId.toString(),
                        date: s.date,
                        shiftNumber: s.shiftNumber,
                        timeSlot: s.timeSlot,
                        startTime: s.startTime || "",
                        endTime: s.endTime || "",
                        difficultyLabel: s.difficultyLabel || "moderate",
                        difficultyIndex: s.difficultyIndex || 0.5,
                        normalizationFactor: s.normalizationFactor || 1.0,
                        shiftCode: s.shiftCode,
                        candidateCount: s.candidateCount || 0,
                        avgRawScore: s.avgRawScore || 0,
                        maxRawScore: s.maxRawScore || 0,
                        minRawScore: s.minRawScore || 0,
                        stdDev: s.stdDev || 0,
                        updatedAt: s.statsUpdatedAt || s.updatedAt
                    });
                }
            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [params.id]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch(`/api/admin/shifts/${params.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    examId: parseInt(formData.examId),
                    date: formData.date,
                    shiftNumber: parseInt(formData.shiftNumber.toString()),
                    timeSlot: formData.timeSlot,
                    startTime: formData.startTime,
                    endTime: formData.endTime,
                    difficultyLabel: formData.difficultyLabel,
                    difficultyIndex: parseFloat(formData.difficultyIndex.toString()),
                    normalizationFactor: parseFloat(formData.normalizationFactor.toString()),
                    shiftCode: formData.shiftCode
                }),
            });

            if (res.ok) {
                router.push("/admin/shifts");
                router.refresh();
            } else {
                alert("Failed to update shift");
            }
        } catch (error) {
            console.error(error);
            alert("Error updating shift");
        }
    };

    const handleRecalculate = async () => {
        setRecalculating(true);
        try {
            const res = await fetch("/api/admin/shifts/bulk-recalculate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids: [parseInt(params.id)] })
            });
            if (res.ok) {
                // Refresh data
                const shiftRes = await fetch(`/api/admin/shifts/${params.id}`);
                const shiftData = await shiftRes.json();
                if (shiftData.shift) {
                    const s = shiftData.shift;
                    setFormData(prev => ({
                        ...prev,
                        candidateCount: s.candidateCount || 0,
                        avgRawScore: s.avgRawScore || 0,
                        maxRawScore: s.maxRawScore || 0,
                        minRawScore: s.minRawScore || 0,
                        stdDev: s.stdDev || 0,
                        updatedAt: s.statsUpdatedAt || new Date().toISOString()
                    }));
                }
                alert("Stats recalculated successfully");
            } else {
                alert("Failed to recalculate");
            }
        } catch (e) {
            console.error(e);
        } finally {
            setRecalculating(false);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-[400px]">
            <span className="material-symbols-outlined text-black text-6xl animate-spin">rotate_right</span>
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-10">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link
                        href="/admin/shifts"
                        className="w-10 h-10 flex items-center justify-center rounded-xl border-2 border-gray-200 hover:border-gray-900 bg-white hover:bg-gray-50 transition-all"
                    >
                        <span className="material-symbols-outlined">arrow_back</span>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Edit Shift <span className="text-gray-400 font-mono text-xl">#{formData.shiftCode}</span></h1>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={handleRecalculate}
                    disabled={recalculating}
                    className="btn-secondary flex items-center gap-2"
                >
                    <span className={cn("material-symbols-outlined", recalculating && "animate-spin")}>sync</span>
                    {recalculating ? "Calculating..." : "Recalculate Stats"}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Form */}
                <div className="lg:col-span-2 space-y-6">
                    <form onSubmit={handleSubmit} className="card-base p-8 space-y-8 bg-white">
                        {/* Reuse same form structure as Create Page */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-gray-900 border-b-2 border-gray-100 pb-2">Basic Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="col-span-2">
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Select Exam</label>
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
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Shift Date</label>
                                    <input
                                        required
                                        type="date"
                                        value={formData.date}
                                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                        className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-gray-900 outline-none font-medium"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Shift Number</label>
                                    <input
                                        required
                                        type="number"
                                        min="1"
                                        value={formData.shiftNumber}
                                        onChange={(e) => setFormData({ ...formData, shiftNumber: parseInt(e.target.value) })}
                                        className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-gray-900 outline-none font-medium"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Shift Code</label>
                                    <input
                                        type="text"
                                        value={formData.shiftCode}
                                        onChange={(e) => setFormData({ ...formData, shiftCode: e.target.value })}
                                        className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-gray-900 outline-none font-medium"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-gray-900 border-b-2 border-gray-100 pb-2">Timing Configuration</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="col-span-2">
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Time Slot</label>
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
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Diff. Index</label>
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
                                Update Shift
                            </button>
                        </div>
                    </form>
                </div>

                {/* Side Stats Panel */}
                <div className="space-y-6">
                    <div className="card-base p-6 bg-[#F3E8FF] space-y-4">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <span className="material-symbols-outlined">analytics</span>
                            Shift Statistics
                        </h3>

                        <div className="space-y-4">
                            <div className="bg-white p-4 rounded-xl border-2 border-[#E9D5FF] shadow-sm">
                                <span className="text-xs font-bold text-gray-500 uppercase">Candidates</span>
                                <p className="text-2xl font-black text-gray-900 mt-1">{formData.candidateCount}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white p-4 rounded-xl border-2 border-[#E9D5FF] shadow-sm">
                                    <span className="text-xs font-bold text-gray-500 uppercase">Avg Score</span>
                                    <p className="text-xl font-black text-gray-900 mt-1">{formData.avgRawScore?.toFixed(2)}</p>
                                </div>
                                <div className="bg-white p-4 rounded-xl border-2 border-[#E9D5FF] shadow-sm">
                                    <span className="text-xs font-bold text-gray-500 uppercase">Std. Dev</span>
                                    <p className="text-xl font-black text-gray-900 mt-1">{formData.stdDev?.toFixed(2)}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white p-4 rounded-xl border-2 border-[#E9D5FF] shadow-sm">
                                    <span className="text-xs font-bold text-green-600 uppercase">Max Score</span>
                                    <p className="text-lg font-black text-gray-900 mt-1">{formData.maxRawScore}</p>
                                </div>
                                <div className="bg-white p-4 rounded-xl border-2 border-[#E9D5FF] shadow-sm">
                                    <span className="text-xs font-bold text-red-500 uppercase">Min Score</span>
                                    <p className="text-lg font-black text-gray-900 mt-1">{formData.minRawScore}</p>
                                </div>
                            </div>
                        </div>
                        {formData.updatedAt && (
                            <p className="text-xs text-gray-500 text-center font-medium mt-2">
                                Last updated: {new Date(formData.updatedAt).toLocaleString()}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
