"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AdminLoginPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    // If already authenticated, redirect to dashboard
    useEffect(() => {
        if (status === "authenticated") {
            router.replace("/admin/dashboard");
        }
    }, [status, router]);

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#FFFDF7]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-4 border-gray-200 border-t-indigo-600 rounded-full animate-spin" />
                    <p className="text-sm font-medium text-gray-500">Loading…</p>
                </div>
            </div>
        );
    }

    if (status === "authenticated") return null;

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-[#FFFDF7]">
            {/* Background Blobs */}
            <div className="absolute top-20 right-0 -z-10 w-96 h-96 bg-indigo-400 rounded-full mix-blend-multiply filter blur-3xl opacity-15 animate-pulse" />
            <div className="absolute bottom-20 -left-10 -z-10 w-96 h-96 bg-violet-400 rounded-full mix-blend-multiply filter blur-3xl opacity-15 animate-pulse" style={{ animationDelay: "2s" }} />

            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-3 mb-4">
                        <div className="bg-gray-900 text-white p-2.5 rounded-xl shadow-lg">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                            </svg>
                        </div>
                        <span className="font-bold text-3xl tracking-tight text-gray-900">
                            Rankify<span className="text-indigo-600">AI</span>
                        </span>
                    </div>
                    <h1 className="text-2xl font-black text-gray-900 uppercase tracking-wide">Admin Portal</h1>
                    <p className="text-sm font-medium text-gray-500 mt-2">Sign in with your GitHub account</p>
                </div>

                {/* Login Card */}
                <div className="relative">
                    <div className="absolute top-3 left-3 w-full h-full bg-gray-900 rounded-2xl" />
                    <div className="relative bg-white rounded-2xl border-2 border-gray-900 p-8 shadow-xl">
                        <div className="space-y-6">
                            {/* GitHub Sign-In */}
                            <button
                                onClick={() => {
                                    setIsLoading(true);
                                    signIn("github", { callbackUrl: "/admin/dashboard" });
                                }}
                                disabled={isLoading}
                                className="w-full flex justify-center items-center gap-3 py-4 px-6 border-2 border-gray-900 rounded-xl bg-gray-900 text-white font-bold text-base hover:bg-gray-800 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                {isLoading ? (
                                    <div className="w-5 h-5 border-2 border-gray-400 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                                    </svg>
                                )}
                                {isLoading ? "Redirecting to GitHub…" : "Continue with GitHub"}
                            </button>

                            {/* Divider */}
                            <div className="flex items-center gap-3">
                                <div className="flex-1 h-px bg-gray-200" />
                                <span className="text-xs font-medium text-gray-400 uppercase">Secure Login</span>
                                <div className="flex-1 h-px bg-gray-200" />
                            </div>

                            {/* Info */}
                            <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
                                <p className="text-xs text-indigo-700 text-center leading-relaxed">
                                    Only authorized GitHub accounts can access the admin panel.
                                    Contact the system administrator if you need access.
                                </p>
                            </div>
                        </div>

                        {/* Back Link */}
                        <div className="mt-6 text-center">
                            <a href="/" className="text-sm font-bold text-gray-500 hover:text-indigo-600 transition-colors">
                                ← Back to Homepage
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
