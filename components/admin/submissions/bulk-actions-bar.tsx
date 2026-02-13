"use client";

import { Download, RefreshCw, Trash2, X } from "lucide-react";

interface BulkActionsBarProps {
    selectedCount: number;
    onDelete: () => void;
    onExport: () => void;
    onRecalculate: () => void;
    onClearSelection: () => void;
}

export function BulkActionsBar({ selectedCount, onDelete, onExport, onRecalculate, onClearSelection }: BulkActionsBarProps) {
    if (selectedCount === 0) return null;

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-in slide-in-from-bottom-4 duration-300">
            <div className="bg-gray-900 rounded-2xl px-2 py-2 flex items-center gap-1.5 shadow-2xl shadow-gray-900/30 border border-gray-700">
                <div className="flex items-center gap-2 px-3">
                    <div className="w-6 h-6 rounded-full bg-violet-500 text-white flex items-center justify-center text-[10px] font-bold">
                        {selectedCount}
                    </div>
                    <span className="font-bold text-white text-xs">selected</span>
                </div>
                <div className="h-5 w-px bg-gray-700" />
                <button type="button" onClick={onExport}
                    className="px-3 py-2 bg-blue-500 text-white font-bold rounded-xl text-xs hover:bg-blue-600 transition-colors flex items-center gap-1.5">
                    <Download className="w-3.5 h-3.5" /> Export
                </button>
                <button type="button" onClick={onRecalculate}
                    className="px-3 py-2 bg-amber-500 text-white font-bold rounded-xl text-xs hover:bg-amber-600 transition-colors flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5" /> Recalculate
                </button>
                <button type="button" onClick={onDelete}
                    className="px-3 py-2 bg-red-500 text-white font-bold rounded-xl text-xs hover:bg-red-600 transition-colors flex items-center gap-1.5">
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
                <button type="button" onClick={onClearSelection}
                    className="px-2.5 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl transition-colors">
                    <X className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
}
