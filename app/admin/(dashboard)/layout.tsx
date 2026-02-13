"use client";

import { useState, useEffect } from "react";
import { AdminSidebar } from "@/components/admin/sidebar";
import { AdminHeader } from "@/components/admin/header";
import { cn } from "@/lib/utils";

const SIDEBAR_COLLAPSED_KEY = "admin-sidebar-collapsed";

export default function AdminLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    // Restore collapsed state from localStorage
    useEffect(() => {
        const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
        if (saved === "true") setCollapsed(true);
    }, []);

    const toggleCollapse = () => {
        setCollapsed(prev => {
            const next = !prev;
            localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
            return next;
        });
    };

    return (
        <div className="flex min-h-screen bg-gray-50/50">
            {/* Mobile backdrop */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 md:hidden"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Sidebar — desktop (fixed) */}
            <div className={cn(
                "fixed inset-y-0 left-0 z-50 hidden md:block transition-all duration-300",
            )}>
                <AdminSidebar collapsed={collapsed} onToggleCollapse={toggleCollapse} />
            </div>

            {/* Sidebar — mobile (overlay) */}
            <div className={cn(
                "fixed inset-y-0 left-0 z-50 md:hidden transition-transform duration-300 ease-in-out",
                mobileOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <AdminSidebar collapsed={false} onToggleCollapse={() => setMobileOpen(false)} />
            </div>

            {/* Main Content Area */}
            <div className={cn(
                "flex-1 flex flex-col w-full transition-all duration-300",
                collapsed ? "md:pl-[68px]" : "md:pl-[260px]"
            )}>
                <AdminHeader onToggleSidebar={() => setMobileOpen(prev => !prev)} />
                <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto w-full animate-in fade-in duration-200">
                    {children}
                </main>
            </div>
        </div>
    );
}
