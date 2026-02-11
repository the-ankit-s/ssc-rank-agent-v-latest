"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface Exam {
    id: number;
    name: string;
    slug: string;
}

export default function SubmitForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const defaultExamSlug = searchParams.get("exam") || "";

    const [exams, setExams] = useState<Exam[]>([]);
    const [loadingExams, setLoadingExams] = useState(true);
    const [selectedExam, setSelectedExam] = useState(defaultExamSlug);

    // Form states
    const [submitLoading, setSubmitLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchExams() {
            try {
                const res = await fetch("/api/exams");
                if (res.ok) {
                    const data = await res.json();
                    setExams(data.exams || []);
                }
            } catch (err) {
                console.error("Failed to fetch exams", err);
            } finally {
                setLoadingExams(false);
            }
        }
        fetchExams();
    }, []);

    // Update selected exam if URL param changes and exams are loaded
    useEffect(() => {
        if (defaultExamSlug) {
            setSelectedExam(defaultExamSlug);
        } else if (exams.length > 0 && !selectedExam) {
            // Default to first exam if no param
            setSelectedExam(exams[0].slug);
        }
    }, [defaultExamSlug, exams]);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setSubmitLoading(true);
        setError(null);

        const formData = new FormData(e.currentTarget);
        const data = {
            url: formData.get("url"),
            category: formData.get("category"),
            exam: formData.get("exam"), // This will get value from select
            password: formData.get("password"),
        };

        try {
            const res = await fetch("/api/submit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            const result = await res.json();

            if (!res.ok) {
                throw new Error(result.error || "Failed to submit");
            }

            router.push(`/result/${result.submissionId}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            setSubmitLoading(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
                <div className="bg-red-100 border-2 border-black text-red-700 px-4 py-3 rounded relative font-bold text-sm">
                    {error}
                </div>
            )}

            {/* Exam Select */}
            <div>
                <label className="block text-sm font-bold text-black mb-2 uppercase tracking-wide" htmlFor="exam">
                    Select Exam
                </label>
                <div className="relative">
                    {loadingExams ? (
                        <div className="animate-pulse h-12 bg-gray-200 rounded-lg border-2 border-transparent"></div>
                    ) : (
                        <select
                            className="block w-full border-2 border-black bg-gray-50 text-gray-900 text-base py-3 px-4 rounded-lg focus:ring-0 focus:border-black focus:shadow-brutal transition-shadow appearance-none font-bold"
                            id="exam"
                            name="exam"
                            required
                            value={selectedExam}
                            onChange={(e) => setSelectedExam(e.target.value)}
                        >
                            <option value="" disabled>-- Select an Exam --</option>
                            {exams.map((exam) => (
                                <option key={exam.id} value={exam.slug}>
                                    {exam.name}
                                </option>
                            ))}
                        </select>
                    )}
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-black border-l-2 border-black bg-gray-100 rounded-r-md">
                        <span className="material-symbols-outlined">expand_more</span>
                    </div>
                </div>
            </div>

            {/* URL Input */}
            <div>
                <label className="block text-sm font-bold text-black mb-2 uppercase tracking-wide" htmlFor="url">
                    Response Sheet URL
                </label>
                <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="material-symbols-outlined text-gray-500">link</span>
                    </div>
                    <input
                        className="block w-full pl-10 border-2 border-black bg-white text-gray-900 py-3 px-4 rounded-lg focus:ring-0 focus:border-black focus:shadow-brutal transition-shadow placeholder-gray-400 font-medium"
                        id="url"
                        name="url"
                        placeholder="https://ssc.digialm.com/..."
                        type="url"
                        required
                    />
                </div>
                <p className="mt-2 text-xs font-bold text-gray-500">
                    Paste the URL from your official answer key page.
                </p>
            </div>

            {/* Category & Password */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-bold text-black mb-2 uppercase tracking-wide" htmlFor="category">
                        Category
                    </label>
                    <select
                        className="block w-full border-2 border-black bg-white py-3 px-4 rounded-lg focus:ring-0 focus:border-black focus:shadow-brutal transition-shadow font-bold"
                        id="category"
                        name="category"
                        required
                    >
                        <option value="UR">UR</option>
                        <option value="OBC">OBC</option>
                        <option value="EWS">EWS</option>
                        <option value="SC">SC</option>
                        <option value="ST">ST</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-bold text-black mb-2 uppercase tracking-wide" htmlFor="password">
                        Password (Optional)
                    </label>
                    <input
                        className="block w-full border-2 border-black bg-white py-3 px-4 rounded-lg focus:ring-0 focus:border-black focus:shadow-brutal transition-shadow font-medium"
                        id="password"
                        name="password"
                        placeholder="For future access"
                        type="password"
                    />
                </div>
            </div>

            {/* Submit Button */}
            <button
                className="w-full flex justify-center py-4 px-4 border-2 border-black rounded-lg shadow-brutal text-base font-bold text-white bg-primary hover:translate-y-1 hover:shadow-none active:bg-blue-700 transition-all uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                type="submit"
                disabled={submitLoading || loadingExams}
            >
                {submitLoading ? (
                    <span className="flex items-center gap-2">
                        <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                        Analyzing...
                    </span>
                ) : "Predict My Rank"}
            </button>
        </form>
    );
}
