import { AdminSidebar } from "@/components/admin/sidebar";
import { AdminHeader } from "@/components/admin/header";

export default function AdminLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div className="flex min-h-screen bg-[#FFFDF7]">
            {/* Sidebar - Fixed/Floating */}
            <div className="fixed inset-y-0 left-0 z-50 hidden md:block">
                <AdminSidebar />
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col md:pl-[280px] w-full transition-all duration-300">
                <AdminHeader />
                <main className="flex-1 p-6 md:p-8 max-w-[1600px] mx-auto w-full animate-in fade-in duration-300">
                    {children}
                </main>
            </div>
        </div>
    );
}
