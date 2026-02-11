"use client";

import Link from "next/link";

export default function Navbar() {
    return (
        <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b-4 border-black">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-20">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-3">
                        <div className="bg-black text-white p-2 border-2 border-transparent rounded-lg shadow-brutal-sm transform rotate-3">
                            <span className="material-symbols-outlined text-2xl">analytics</span>
                        </div>
                        <span className="font-bold text-2xl tracking-tight text-black">
                            Rankify<span className="text-primary underline decoration-4 decoration-black underline-offset-2">AI</span>
                        </span>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center space-x-8">
                        <Link
                            href="/exams"
                            className="text-base font-bold text-gray-800 hover:text-primary hover:-translate-y-0.5 transition-transform"
                        >
                            Exams
                        </Link>
                        <Link
                            href="/leaderboard"
                            className="text-base font-bold text-gray-800 hover:text-primary hover:-translate-y-0.5 transition-transform"
                        >
                            Leaderboard
                        </Link>
                        <div className="relative group">
                            <Link
                                href="/admin"
                                className="text-base font-bold text-gray-800 hover:text-primary transition-colors"
                            >
                                Admin
                            </Link>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-4">
                        <Link
                            href="/submit"
                            className="hidden md:inline-flex items-center px-6 py-2.5 text-base font-bold text-white bg-black border-2 border-black rounded-lg shadow-brutal hover:translate-y-0.5 hover:shadow-brutal-hover active:translate-y-1 active:shadow-none transition-all"
                        >
                            Get Started
                        </Link>
                        <button className="md:hidden p-2 border-2 border-black rounded-lg bg-white shadow-brutal-sm">
                            <span className="material-symbols-outlined">menu</span>
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
}
