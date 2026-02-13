"use client";

import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const breadcrumbMap: Record<string, string> = {
    dashboard: "Dashboard",
    exams: "Exams",
    create: "Create",
    submissions: "Submissions",
    shifts: "Shifts",
    leaderboard: "Leaderboard",
    cutoffs: "Cutoffs",
    predictions: "Predictions",
    reports: "Reports",
    analytics: "Analytics",
    jobs: "Jobs",
    logs: "Logs",
    settings: "Settings",
    "audit-logs": "Audit Logs",
    duplicates: "Duplicates",
};

export function AdminHeader({ onToggleSidebar }: { onToggleSidebar?: () => void }) {
    const pathname = usePathname();
    const { data: session } = useSession();

    // Build breadcrumbs from pathname
    const segments = pathname.replace(/^\/admin\/?/, "").split("/").filter(Boolean);
    const crumbs = segments.map((seg, i) => ({
        label: breadcrumbMap[seg] || (seg.length < 12 ? seg.replace(/-/g, " ") : `#${seg.slice(0, 6)}`),
        href: "/admin/" + segments.slice(0, i + 1).join("/"),
        isLast: i === segments.length - 1,
    }));

    const user = session?.user;
    const initials = user?.name ? user.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() : "A";

    return (
        <header className="h-16 px-4 md:px-6 flex items-center justify-between bg-white/80 backdrop-blur-xl border-b border-gray-200/80 sticky top-0 z-30">
            {/* Left: hamburger + breadcrumbs */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
                {/* Mobile hamburger */}
                <button
                    onClick={onToggleSidebar}
                    className="md:hidden p-2 -ml-1 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
                    aria-label="Toggle sidebar"
                >
                    <span className="material-symbols-outlined text-xl">menu</span>
                </button>

                {/* Breadcrumb */}
                <nav className="flex items-center gap-1 text-sm min-w-0">
                    <Link href="/admin/dashboard" className="text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1 shrink-0">
                        <span className="material-symbols-outlined text-[16px]">home</span>
                    </Link>
                    {crumbs.map((crumb) => (
                        <div key={crumb.href} className="flex items-center gap-1 min-w-0">
                            <span className="text-gray-300 text-xs shrink-0">/</span>
                            {crumb.isLast ? (
                                <span className="font-semibold text-gray-900 text-xs truncate capitalize">{crumb.label}</span>
                            ) : (
                                <Link href={crumb.href} className="text-gray-500 hover:text-gray-700 text-xs transition-colors truncate capitalize">
                                    {crumb.label}
                                </Link>
                            )}
                        </div>
                    ))}
                </nav>
            </div>

            {/* Center: Search */}
            <div className="hidden md:block flex-1 max-w-md mx-4">
                <div className="relative group">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 material-symbols-outlined text-[18px]">
                        search
                    </span>
                    <input
                        type="text"
                        placeholder="Search..."
                        className="w-full pl-9 pr-16 py-2 bg-gray-50/80 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-indigo-400 focus:bg-white focus:ring-1 focus:ring-indigo-400/20 transition-all"
                    />
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                        <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-gray-400 bg-white border border-gray-200 rounded shadow-sm">
                            ⌘K
                        </kbd>
                    </div>
                </div>
            </div>

            {/* Right: actions */}
            <div className="flex items-center gap-2">
                {/* Status pill */}
                <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200/60 rounded-full">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-[10px] font-semibold text-emerald-700">Live</span>
                </div>

                {/* Notifications */}
                <button className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-all group">
                    <span className="material-symbols-outlined text-xl">notifications</span>
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
                </button>

                {/* Separator */}
                <div className="h-6 w-px bg-gray-200 mx-0.5 hidden sm:block" />

                {/* Profile — session-aware */}
                <div className="relative group">
                    <button className="flex items-center gap-2.5 p-1.5 pr-3 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-all">
                        {user?.image ? (
                            <img src={user.image} alt="" className="w-8 h-8 rounded-lg object-cover ring-1 ring-gray-200" />
                        ) : (
                            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-sm">
                                {initials}
                            </div>
                        )}
                        <div className="text-left hidden md:block">
                            <p className="text-xs font-semibold text-gray-900 leading-none">{user?.name || "Admin"}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">{user?.email ? user.email.split("@")[0] : "admin"}</p>
                        </div>
                        <span className="material-symbols-outlined text-gray-400 text-sm hidden md:block group-hover:translate-y-0.5 transition-transform">expand_more</span>
                    </button>

                    {/* Dropdown */}
                    <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                        <div className="p-3 border-b border-gray-100">
                            <p className="text-xs font-semibold text-gray-900 truncate">{user?.name || "Admin"}</p>
                            <p className="text-[10px] text-gray-400 truncate">{user?.email || ""}</p>
                        </div>
                        <button
                            onClick={() => signOut({ callbackUrl: "/admin" })}
                            className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors rounded-b-lg"
                        >
                            <span className="material-symbols-outlined text-[16px]">logout</span>
                            Sign out
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
}

