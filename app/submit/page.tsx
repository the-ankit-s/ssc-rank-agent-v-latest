"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";

export default function SubmitPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        const formData = new FormData(e.currentTarget);
        const url = formData.get("url") as string;
        const category = formData.get("category") as string;
        const password = formData.get("password") as string;
        const exam = formData.get("exam") as string;

        try {
            // Call API to parse and analyze
            const response = await fetch("/api/submit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url, category, password, exam }),
            });

            if (!response.ok) {
                throw new Error("Failed to analyze answer key");
            }

            const data = await response.json();

            // Redirect to results page
            router.push(`/result/${data.submissionId}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred");
            setIsLoading(false);
        }
    }

    return (
        <>
            <Navbar />
            <div className="min-h-screen py-20">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Header */}
                    <div className="text-center mb-12">
                        <h1 className="text-5xl font-black text-black uppercase mb-4">
                            Submit Your <span className="text-primary">Answer Key</span>
                        </h1>
                        <p className="text-lg font-medium text-gray-600 max-w-2xl mx-auto">
                            Paste your response sheet URL and get instant rank prediction with detailed analysis
                        </p>
                    </div>

                    {/* Main Form Card */}
                    <div className="relative">
                        <div className="absolute top-4 left-4 w-full h-full bg-black rounded-xl"></div>
                        <div className="relative bg-white rounded-xl border-4 border-black p-8 shadow-brutal-lg">
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Exam Selection */}
                                <div>
                                    <label className="block text-sm font-bold text-black mb-2 uppercase tracking-wide" htmlFor="exam">
                                        Select Exam
                                    </label>
                                    <div className="relative">
                                        <select
                                            className="block w-full border-2 border-black bg-gray-50 text-gray-900 text-base py-3 px-4 rounded-lg focus:ring-0 focus:border-primary focus:shadow-brutal transition-shadow appearance-none font-bold"
                                            id="exam"
                                            name="exam"
                                            required
                                        >
                                            <option value="ssc-cgl-2024">SSC CGL 2024 Tier-I</option>
                                            <option value="ssc-chsl-2023">SSC CHSL 2023 Final</option>
                                            <option value="ssc-mts-2024">SSC MTS 2024</option>
                                            <option value="ssc-cpo-2024">SSC CPO 2024</option>
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-black border-l-2 border-black bg-gray-100 rounded-r-md">
                                            <span className="material-symbols-outlined">expand_more</span>
                                        </div>
                                    </div>
                                </div>

                                {/* URL Input */}
                                <div>
                                    <label className="block text-sm font-bold text-black mb-2 uppercase tracking-wide" htmlFor="url">
                                        Response Sheet URL *
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <span className="material-symbols-outlined text-gray-500">link</span>
                                        </div>
                                        <input
                                            className="block w-full pl-12 border-2 border-black bg-white text-gray-900 py-3 px-4 rounded-lg focus:ring-0 focus:border-primary focus:shadow-brutal transition-shadow placeholder-gray-400 font-medium"
                                            id="url"
                                            name="url"
                                            placeholder="https://ssc.digialm.com/..."
                                            type="url"
                                            required
                                        />
                                    </div>
                                    <p className="mt-2 text-xs font-bold text-gray-500">
                                        Paste the URL from your official SSC answer key page after login
                                    </p>
                                </div>

                                {/* Category & Password Row */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-bold text-black mb-2 uppercase tracking-wide" htmlFor="category">
                                            Category *
                                        </label>
                                        <select
                                            className="block w-full border-2 border-black bg-white py-3 px-4 rounded-lg focus:ring-0 focus:border-primary focus:shadow-brutal transition-shadow font-bold"
                                            id="category"
                                            name="category"
                                            required
                                        >
                                            <option value="UR">UR (Unreserved)</option>
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
                                            className="block w-full border-2 border-black bg-white py-3 px-4 rounded-lg focus:ring-0 focus:border-primary focus:shadow-brutal transition-shadow font-medium placeholder-gray-400"
                                            id="password"
                                            name="password"
                                            placeholder="DOB (DDMMYYYY)"
                                            type="password"
                                        />
                                        <p className="mt-1 text-xs font-bold text-gray-500">If your answer key is password protected</p>
                                    </div>
                                </div>

                                {/* Error Message */}
                                {error && (
                                    <div className="p-4 bg-red-50 border-2 border-red-500 rounded-lg">
                                        <p className="text-sm font-bold text-red-700">{error}</p>
                                    </div>
                                )}

                                {/* Submit Button */}
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full flex justify-center items-center gap-2 py-4 px-6 border-2 border-black rounded-lg shadow-brutal text-lg font-bold text-white bg-primary hover:translate-y-1 hover:shadow-brutal-hover active:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all uppercase tracking-wider"
                                >
                                    {isLoading ? (
                                        <>
                                            <span className="material-symbols-outlined animate-spin">autorenew</span>
                                            Analyzing...
                                        </>
                                    ) : (
                                        <>
                                            <span className="material-symbols-outlined">analytics</span>
                                            Predict My Rank
                                        </>
                                    )}
                                </button>
                            </form>

                            {/* Info Footer */}
                            <div className="mt-8 pt-6 border-t-2 border-dashed border-gray-300">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center md:text-left">
                                    <div className="flex items-center gap-2 justify-center md:justify-start">
                                        <span className="material-symbols-outlined text-green-600">verified_user</span>
                                        <span className="text-xs font-bold text-gray-700">100% Secure</span>
                                    </div>
                                    <div className="flex items-center gap-2 justify-center md:justify-start">
                                        <span className="material-symbols-outlined text-blue-600">speed</span>
                                        <span className="text-xs font-bold text-gray-700">Results in 2 seconds</span>
                                    </div>
                                    <div className="flex items-center gap-2 justify-center md:justify-start">
                                        <span className="material-symbols-outlined text-purple-600">database</span>
                                        <span className="text-xs font-bold text-gray-700">850k+ data points</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Help Section */}
                    <div className="mt-12 bg-brutal-yellow/20 border-2 border-black rounded-xl p-6">
                        <h3 className="text-lg font-bold text-black mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined">help</span>
                            Need Help?
                        </h3>
                        <div className="space-y-3 text-sm font-medium text-gray-700">
                            <p><strong>Where to find your URL?</strong> Login to SSC official website → Go to "View Response Sheet" → Copy the URL from address bar</p>
                            <p><strong>Password not working?</strong> Try your Date of Birth in DDMMYYYY format (e.g., 01011995)</p>
                            <p><strong>URL Invalid?</strong> Make sure you're logged in to SSC portal before copying the URL</p>
                        </div>
                    </div>
                </div>
            </div>
            <Footer />
        </>
    );
}
