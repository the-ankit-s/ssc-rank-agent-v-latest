"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface LogEntry {
    timestamp: string;
    level: "INFO" | "WARN" | "ERROR" | "DEBUG";
    message: string;
    context?: any;
}

const levelColors = {
    INFO: "text-blue-400",
    WARN: "text-yellow-400",
    ERROR: "text-red-500 font-black",
    DEBUG: "text-gray-400",
};

export default function LogsPage() {
    const [logs, setLogs] = useState<LogEntry[]>([]);

    // Mock Logs Data for Visuals
    useEffect(() => {
        setLogs([
            { timestamp: new Date().toISOString(), level: "INFO", message: "System initialized successfully", context: { version: "2.0.0" } },
            { timestamp: new Date(Date.now() - 5000).toISOString(), level: "DEBUG", message: "Connecting to database...", context: { pool: 10 } },
            { timestamp: new Date(Date.now() - 15000).toISOString(), level: "WARN", message: "Slow query detected", context: { duration_ms: 450 } },
            { timestamp: new Date(Date.now() - 60000).toISOString(), level: "ERROR", message: "Failed to sync cache", context: { error: "Redis ECONNREFUSED" } },
            ...Array(15).fill(null).map((_, i) => ({
                timestamp: new Date(Date.now() - (i + 1) * 120000).toISOString(),
                level: "INFO",
                message: `Processed batch job #${1024 - i}`,
                context: { items: Math.floor(Math.random() * 100) }
            })) as LogEntry[]
        ]);
    }, []);

    return (
        <div className="max-w-full h-[calc(100vh-140px)] flex flex-col space-y-6">
            <div className="flex items-center justify-between flex-shrink-0">
                <div>
                    <h1 className="text-4xl font-black text-black tracking-tighter uppercase transform -skew-x-6 inline-block bg-yellow-300 px-3 py-1 border-2 border-black shadow-neo">System Logs</h1>
                    <p className="text-lg font-bold text-black mt-2">Real-time application events</p>
                </div>
                <div className="flex gap-4">
                    <button className="px-6 py-3 bg-black text-white font-mono text-sm font-bold border-2 border-transparent hover:border-black hover:bg-gray-800 transition-all shadow-neo hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] flex items-center gap-2">
                        <span className="material-symbols-outlined text-lg">download</span>
                        RAW
                    </button>
                    <button className="px-6 py-3 bg-red-500 text-white font-black text-sm border-2 border-black shadow-neo hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all flex items-center gap-2">
                        <span className="material-symbols-outlined text-lg">delete</span>
                        Clear
                    </button>
                </div>
            </div>

            {/* Terminal Window */}
            <div className="flex-1 bg-[#1e1e1e] border-4 border-black shadow-neo flex flex-col font-mono text-sm relative">
                {/* Terminal Header */}
                <div className="bg-[#2d2d2d] px-4 py-3 flex items-center gap-2 border-b-4 border-black flex-shrink-0">
                    <div className="flex gap-3">
                        <div className="w-4 h-4 bg-red-500 border-2 border-black"></div>
                        <div className="w-4 h-4 bg-yellow-400 border-2 border-black"></div>
                        <div className="w-4 h-4 bg-green-500 border-2 border-black"></div>
                    </div>
                    <span className="ml-4 text-xs text-gray-400 font-bold block text-center flex-1 pr-16 uppercase tracking-wider">root@fractal-kepler:~ logs/production.log</span>
                </div>

                {/* Logs Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                    {logs.map((log, idx) => (
                        <div key={idx} className="flex gap-4 hover:bg-white/10 p-1 border-l-2 border-transparent hover:border-yellow-400 transition-all group">
                            <span className="text-gray-500 flex-shrink-0 w-36 select-none text-[11px] mt-0.5 font-bold">
                                {new Date(log.timestamp).toLocaleTimeString()}
                            </span>
                            <span className={cn("w-16 font-black flex-shrink-0 uppercase", levelColors[log.level])}>
                                {log.level}
                            </span>
                            <span className="text-gray-300 break-all group-hover:text-white transition-colors font-medium">
                                {log.message}
                                {log.context && (
                                    <span className="text-gray-500 ml-2 text-xs">
                                        {JSON.stringify(log.context)}
                                    </span>
                                )}
                            </span>
                        </div>
                    ))}
                    <div className="h-6 w-3 bg-yellow-400 animate-pulse mt-2"></div>
                </div>
            </div>
        </div>
    );
}
