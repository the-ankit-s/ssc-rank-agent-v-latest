"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        const formData = new FormData(e.currentTarget);

        try {
            const res = await fetch("/api/admin/auth", {
                method: "POST",
                body: formData,
            });

            const data = await res.json();

            if (res.ok && data.success) {
                router.push("/admin/dashboard");
            } else {
                setError(data.error || "Invalid credentials. Try admin@rankifyai.com / admin123");
                setIsLoading(false);
            }
        } catch (err) {
            setError("Something went wrong. Please try again.");
            setIsLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            {/* Background Blobs */}
            <div className="absolute top-20 right-0 -z-10 w-96 h-96 bg-brutal-blue rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
            <div className="absolute bottom-20 -left-10 -z-10 w-96 h-96 bg-brutal-purple rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>

            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-3 mb-4">
                        <div className="bg-black text-white p-2 border-2 border-transparent rounded-lg shadow-brutal-sm">
                            <span className="material-symbols-outlined text-2xl">admin_panel_settings</span>
                        </div>
                        <span className="font-bold text-3xl tracking-tight text-black">
                            Rankify<span className="text-primary">AI</span>
                        </span>
                    </div>
                    <h1 className="text-2xl font-black text-black uppercase">Admin Portal</h1>
                    <p className="text-sm font-medium text-gray-600 mt-2">Login to access the admin dashboard</p>
                </div>

                {/* Login Card */}
                <div className="relative">
                    <div className="absolute top-4 left-4 w-full h-full bg-black rounded-xl"></div>
                    <div className="relative bg-white rounded-xl border-4 border-black p-8 shadow-brutal-lg">
                        <form onSubmit={handleLogin} className="space-y-6">
                            {/* Email */}
                            <div>
                                <label className="block text-sm font-bold text-black mb-2 uppercase tracking-wide" htmlFor="email">
                                    Email Address
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <span className="material-symbols-outlined text-gray-500">mail</span>
                                    </div>
                                    <input
                                        className="block w-full pl-10 border-2 border-black bg-white text-gray-900 py-3 px-4 rounded-lg focus:ring-0 focus:border-primary focus:shadow-brutal transition-shadow font-medium"
                                        id="email"
                                        name="email"
                                        type="email"
                                        placeholder="admin@rankifyai.com"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div>
                                <label className="block text-sm font-bold text-black mb-2 uppercase tracking-wide" htmlFor="password">
                                    Password
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <span className="material-symbols-outlined text-gray-500">lock</span>
                                    </div>
                                    <input
                                        className="block w-full pl-10 border-2 border-black bg-white text-gray-900 py-3 px-4 rounded-lg focus:ring-0 focus:border-primary focus:shadow-brutal transition-shadow font-medium"
                                        id="password"
                                        name="password"
                                        type="password"
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Error Message */}
                            {error && (
                                <div className="p-3 bg-red-50 border-2 border-red-500 rounded-lg">
                                    <p className="text-sm font-bold text-red-700">{error}</p>
                                </div>
                            )}

                            {/* Demo Credentials */}
                            <div className="p-3 bg-brutal-yellow/20 border-2 border-black rounded-lg">
                                <p className="text-xs font-bold text-gray-700">
                                    <strong>Demo Credentials:</strong><br />
                                    Email: admin@rankifyai.com<br />
                                    Password: admin123
                                </p>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full flex justify-center items-center gap-2 py-4 px-6 border-2 border-black rounded-lg shadow-brutal text-base font-bold text-white bg-primary hover:translate-y-1 hover:shadow-brutal-hover active:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all uppercase tracking-wider"
                            >
                                {isLoading ? (
                                    <>
                                        <span className="material-symbols-outlined animate-spin">autorenew</span>
                                        Logging in...
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined">login</span>
                                        Login
                                    </>
                                )}
                            </button>
                        </form>

                        {/* Back Link */}
                        <div className="mt-6 text-center">
                            <a href="/" className="text-sm font-bold text-gray-600 hover:text-primary transition-colors">
                                ← Back to Homepage
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
