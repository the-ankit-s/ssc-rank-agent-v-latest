"use client";

import { useEffect } from "react";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("Admin Dashboard Error:", error);
    }, [error]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6 border-2 border-black shadow-brutal">
                <span className="material-symbols-outlined text-4xl text-red-600">error</span>
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">Something went wrong!</h2>
            <p className="text-gray-600 mb-8 max-w-md">
                We encountered an error while loading this page. This might be a temporary issue.
            </p>

            <div className="p-4 bg-gray-100 rounded-lg border-2 border-gray-300 font-mono text-xs text-left w-full max-w-2xl mb-8 overflow-auto max-h-48">
                <p className="font-bold text-red-600 mb-1">Error Details:</p>
                {error.message}
                {error.stack && <pre className="mt-2 text-gray-500">{error.stack}</pre>}
            </div>

            <div className="flex gap-4">
                <button
                    onClick={() => reset()}
                    className="px-6 py-3 bg-brutal-yellow text-black font-bold border-2 border-black rounded-lg shadow-brutal hover:translate-y-0.5 hover:shadow-none transition-all"
                >
                    Try Again
                </button>
                <button
                    onClick={() => window.location.href = "/admin/dashboard"}
                    className="px-6 py-3 bg-white text-black font-bold border-2 border-black rounded-lg shadow-brutal-sm hover:translate-y-0.5 hover:shadow-none transition-all"
                >
                    Go to Dashboard
                </button>
            </div>
        </div>
    );
}
