"use client";

export function AdminHeader() {
    return (
        <header className="h-20 px-8 flex items-center justify-between bg-white border-b-2 border-gray-900 sticky top-0 z-20">
            <div className="flex items-center gap-4 flex-1">
                <div className="relative w-full max-w-sm group">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 transition-colors material-symbols-outlined text-[20px]">
                        search
                    </span>
                    <input
                        type="text"
                        placeholder="Search system..."
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#A78BFA] focus:bg-white focus:shadow-sm transition-all"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1">
                        <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-bold text-gray-500 bg-white border-2 border-gray-200 rounded-md">⌘ K</kbd>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 mr-4">
                    <div className="px-3 py-1 bg-[#34D399] border-2 border-gray-900 rounded-full shadow-neo-sm flex items-center gap-2">
                        <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                        <span className="text-xs font-bold text-gray-900">System Online</span>
                    </div>
                </div>

                <button className="relative p-2 bg-white border-2 border-gray-900 rounded-xl shadow-neo-sm hover:translate-y-[-2px] hover:shadow-neo transition-all text-gray-900">
                    <span className="material-symbols-outlined">notifications</span>
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-[#F87171] border-2 border-white rounded-full"></span>
                </button>

                <div className="h-8 w-0.5 bg-gray-200 mx-1"></div>

                <button className="flex items-center gap-3 p-1 pr-3 hover:bg-gray-50 rounded-xl transition-all group border-2 border-transparent hover:border-gray-200">
                    <div className="w-10 h-10 bg-[#F472B6] border-2 border-gray-900 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm">AU</div>
                    <div className="text-left hidden md:block">
                        <p className="text-sm font-bold text-gray-900">Admin User</p>
                        <p className="text-[10px] font-medium text-gray-500">Super Admin</p>
                    </div>
                    <span className="material-symbols-outlined text-gray-400 text-sm group-hover:translate-y-0.5 transition-transform">expand_more</span>
                </button>
            </div>
        </header>
    );
}
