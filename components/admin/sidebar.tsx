"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navigation = [
    {
        group: "Overview",
        items: [
            { name: "Dashboard", href: "/admin/dashboard", icon: "space_dashboard" },
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
            { name: "Reports", href: "/admin/reports", icon: "summarize" },
            { name: "Analytics", href: "/admin/analytics", icon: "insights" },
        ]
    },
    {
        group: "System",
        items: [
            { name: "Jobs", href: "/admin/jobs", icon: "dvr" },
            { name: "Logs", href: "/admin/logs", icon: "terminal" },
            { name: "Audit Logs", href: "/admin/audit-logs", icon: "history" },
            { name: "Settings", href: "/admin/settings", icon: "settings" },
        ]
    }
];

interface AdminSidebarProps {
    collapsed: boolean;
    onToggleCollapse: () => void;
}

export function AdminSidebar({ collapsed, onToggleCollapse }: AdminSidebarProps) {
    const pathname = usePathname();

    return (
        <div className={cn(
            "flex flex-col h-full bg-white border-r border-gray-200 transition-all duration-300 ease-in-out",
            collapsed ? "w-[68px]" : "w-[260px]"
        )}>
            {/* Logo */}
            <div className={cn("h-16 flex items-center border-b border-gray-200 shrink-0", collapsed ? "px-3 justify-center" : "px-5")}>
                <Link href="/admin/dashboard" className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center rounded-lg shadow-sm shrink-0">
                        <span className="material-symbols-outlined text-white text-lg">analytics</span>
                    </div>
                    {!collapsed && (
                        <div className="min-w-0">
                            <h1 className="text-sm font-bold text-gray-900 tracking-tight leading-none">Rank<span className="text-indigo-600">Predict</span></h1>
                            <p className="text-[9px] text-gray-400 font-medium mt-0.5">Admin Console</p>
                        </div>
                    )}
                </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-5 custom-scrollbar">
                {navigation.map((group) => (
                    <div key={group.group}>
                        {!collapsed && (
                            <h3 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 px-3">{group.group}</h3>
                        )}
                        {collapsed && <div className="h-px bg-gray-100 mx-2 mb-2" />}
                        <div className="space-y-0.5">
                            {group.items.map((item) => {
                                const isActive = pathname === item.href || (item.href !== '/admin/dashboard' && pathname.startsWith(item.href + '/'));
                                const isExactDashboard = item.href === '/admin/dashboard' && pathname === '/admin/dashboard';
                                const active = isActive || isExactDashboard;

                                return (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        title={collapsed ? item.name : undefined}
                                        className={cn(
                                            "flex items-center gap-2.5 transition-all text-[13px] font-medium rounded-lg relative group",
                                            collapsed ? "px-0 py-2.5 justify-center" : "px-3 py-2",
                                            active
                                                ? "bg-indigo-50 text-indigo-700 font-semibold"
                                                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                        )}
                                    >
                                        {/* Active indicator bar */}
                                        {active && (
                                            <span className={cn(
                                                "absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full bg-indigo-600 transition-all",
                                                collapsed ? "h-5" : "h-6"
                                            )} />
                                        )}
                                        <span
                                            className={cn(
                                                "material-symbols-outlined text-[20px] transition-colors shrink-0",
                                                active ? "text-indigo-600" : "text-gray-400 group-hover:text-gray-600"
                                            )}
                                        >
                                            {item.icon}
                                        </span>
                                        {!collapsed && item.name}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </nav>

            {/* Footer */}
            <div className={cn("border-t border-gray-200 shrink-0", collapsed ? "p-2" : "p-3")}>
                {/* Collapse toggle */}
                <button
                    onClick={onToggleCollapse}
                    className={cn(
                        "flex items-center gap-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-all text-xs font-medium",
                        collapsed ? "p-2.5 w-full justify-center" : "px-3 py-2 w-full"
                    )}
                    title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    <span className={cn("material-symbols-outlined text-lg transition-transform duration-300", collapsed && "rotate-180")}>
                        chevron_left
                    </span>
                    {!collapsed && <span>Collapse</span>}
                </button>

                {/* Environment badge */}
                {!collapsed && (
                    <div className="mt-2 px-3 py-1.5 bg-gray-50 rounded-lg flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
                        <span className="text-[10px] font-medium text-gray-500">Development</span>
                    </div>
                )}
            </div>
        </div>
    );
}
