"use client";

import { cn } from "@/lib/utils";

export default function ReportsPage() {
    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black text-black tracking-tighter uppercase transform -skew-x-6 inline-block bg-yellow-300 px-3 py-1 border-2 border-black shadow-neo">System Reports</h1>
                    <p className="text-lg font-bold text-black mt-2">Generate and export system data</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* Report Card 1 */}
                <div className="bg-white p-6 border-4 border-black shadow-neo flex flex-col group hover:-translate-y-2 hover:shadow-neo-hover transition-all duration-300">
                    <div className="w-16 h-16 bg-blue-500 border-2 border-black flex items-center justify-center mb-6 shadow-neo-sm">
                        <span className="material-symbols-outlined text-4xl text-white">group</span>
                    </div>
                    <h3 className="text-2xl font-black text-black uppercase mb-2">Candidate Data</h3>
                    <p className="text-sm text-black font-bold mb-6 flex-1 border-t-2 border-black pt-2">
                        Export full candidate list including registration details, category, and status.
                    </p>
                    <button className="w-full py-3 bg-white text-black font-black uppercase tracking-wide border-2 border-black shadow-neo-sm hover:bg-blue-300 hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined">download</span>
                        Download CSV
                    </button>
                </div>

                {/* Report Card 2 */}
                <div className="bg-white p-6 border-4 border-black shadow-neo flex flex-col group hover:-translate-y-2 hover:shadow-neo-hover transition-all duration-300">
                    <div className="w-16 h-16 bg-green-500 border-2 border-black flex items-center justify-center mb-6 shadow-neo-sm">
                        <span className="material-symbols-outlined text-4xl text-white">analytics</span>
                    </div>
                    <h3 className="text-2xl font-black text-black uppercase mb-2">Exam Results</h3>
                    <p className="text-sm text-black font-bold mb-6 flex-1 border-t-2 border-black pt-2">
                        Comprehensive results with score breakdown, rank, and percentile data.
                    </p>
                    <button className="w-full py-3 bg-white text-black font-black uppercase tracking-wide border-2 border-black shadow-neo-sm hover:bg-green-300 hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined">download</span>
                        Download PDF
                    </button>
                </div>

                {/* Report Card 3 */}
                <div className="bg-white p-6 border-4 border-black shadow-neo flex flex-col group hover:-translate-y-2 hover:shadow-neo-hover transition-all duration-300">
                    <div className="w-16 h-16 bg-orange-500 border-2 border-black flex items-center justify-center mb-6 shadow-neo-sm">
                        <span className="material-symbols-outlined text-4xl text-white">monitoring</span>
                    </div>
                    <h3 className="text-2xl font-black text-black uppercase mb-2">System Audit</h3>
                    <p className="text-sm text-black font-bold mb-6 flex-1 border-t-2 border-black pt-2">
                        Detailed logs of administrative actions and system events for auditing.
                    </p>
                    <button className="w-full py-3 bg-white text-black font-black uppercase tracking-wide border-2 border-black shadow-neo-sm hover:bg-orange-300 hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined">download</span>
                        Export Logs
                    </button>
                </div>
            </div>

            {/* Custom Query Section */}
            <div className="bg-black border-4 border-black shadow-neo p-8 text-white relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-12 opacity-20 transform rotate-12 group-hover:rotate-0 transition-transform duration-500">
                    <span className="material-symbols-outlined text-9xl text-yellow-300">database</span>
                </div>
                <div className="relative z-10 max-w-2xl">
                    <h3 className="text-3xl font-black uppercase text-yellow-300 mb-2">Custom Report Builder</h3>
                    <p className="text-white font-bold mb-8 text-lg">
                        Need specific data? Build a custom query to filter and export exactly what you need.
                    </p>
                    <button className="px-8 py-4 bg-white text-black font-black uppercase tracking-wider border-2 border-transparent hover:border-white hover:bg-black hover:text-white shadow-neo hover:shadow-none transition-all flex items-center gap-2">
                        <span className="material-symbols-outlined">build</span>
                        Launch Builder
                    </button>
                </div>
            </div>
        </div>
    );
}
