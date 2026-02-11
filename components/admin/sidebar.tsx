"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navigation = [
    {
        group: "Overview",
        items: [
            { name: "Dashboard", href: "/admin/dashboard", icon: "analytics" },
        ]
    },
    {
        group: "Exam Management",
        items: [
            { name: "Exams", href: "/admin/exams", icon: "quiz" },
            { name: "Shifts", href: "/admin/shifts", icon: "schedule" },
            { name: "Submissions", href: "/admin/submissions", icon: "description" },
        ]
    },
    {
        group: "Analysis",
        items: [
            { name: "Leaderboard", href: "/admin/leaderboard", icon: "emoji_events" },
            { name: "Cutoffs", href: "/admin/cutoffs", icon: "trending_up" },
            { name: "Reports", href: "/admin/reports", icon: "analytics" },
            { name: "Analytics", href: "/admin/analytics", icon: "insights" },
        ]
    },
    {
        group: "System",
        items: [
            { name: "Jobs", href: "/admin/jobs", icon: "dvr" },
            { name: "Logs", href: "/admin/logs", icon: "terminal" },
            { name: "Settings", href: "/admin/settings", icon: "settings" },
        ]
    }
];

export function AdminSidebar() {
    const pathname = usePathname();

    return (
        <div className="w-72 flex flex-col h-full bg-white border-r-2 border-gray-900">
            <div className="p-6 border-b-2 border-gray-900 bg-[#FFFDF8]">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#A78BFA] border-2 border-gray-900 flex items-center justify-center shadow-neo-sm rounded-lg transform -rotate-2 hover:rotate-0 transition-transform">
                        <span className="material-symbols-outlined text-gray-900 text-2xl">analytics</span>
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 tracking-tight leading-none">Rank<span className="text-[#A78BFA]">Predict</span></h1>
                        <p className="text-xs text-gray-600 font-medium mt-0.5 bg-gray-100 px-2 py-0.5 rounded border border-gray-300 inline-block">Admin v5.0</p>
                    </div>
                </div>
            </div>

            <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-6 custom-scrollbar bg-[#FFFDF8]">
                {navigation.map((group) => (
                    <div key={group.group}>
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 px-2">{group.group}</h3>
                        <div className="space-y-1">
                            {group.items.map((item) => {
                                const isActive = pathname.startsWith(item.href);
                                return (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        className={cn(
                                            "flex items-center gap-3 px-4 py-3 border-2 transition-all font-bold text-sm rounded-xl group relative overflow-hidden",
                                            isActive
                                                ? "bg-[#A78BFA] border-gray-900 text-gray-900 shadow-neo"
                                                : "bg-white border-transparent text-gray-500 hover:bg-[#F3E8FF] hover:text-gray-900 hover:border-gray-900 hover:shadow-sm"
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                "material-symbols-outlined text-[20px] transition-colors",
                                                isActive ? "text-gray-900" : "text-gray-400 group-hover:text-gray-900"
                                            )}
                                        >
                                            {item.icon}
                                        </span>
                                        {item.name}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </nav>

            <div className="p-4 border-t-2 border-gray-900 bg-white">
                <button className="w-full flex items-center justify-center gap-3 px-4 py-3 border-2 border-gray-900 rounded-xl bg-[#F87171] text-white shadow-neo hover:bg-red-500 hover:-translate-y-0.5 hover:shadow-neo-hover transition-all font-bold text-sm">
                    <span className="material-symbols-outlined text-[20px]">logout</span>
                    Sign Out
                </button>
            </div>
        </div>
    );
}
