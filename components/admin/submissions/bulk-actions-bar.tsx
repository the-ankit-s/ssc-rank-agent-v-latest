"use client";

interface BulkActionsBarProps {
    selectedCount: number;
    onDelete: () => void;
    onExport: () => void;
    onRecalculate: () => void;
    onClearSelection: () => void;
}

export function BulkActionsBar({
    selectedCount,
    onDelete,
    onExport,
    onRecalculate,
    onClearSelection,
}: BulkActionsBarProps) {
    if (selectedCount === 0) return null;

    return (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 animate-in slide-in-from-bottom-4 duration-300">
            <div className="bg-white rounded-xl border-2 border-black shadow-brutal px-6 py-4 flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold border-2 border-black">
                        {selectedCount}
                    </div>
                    <span className="font-bold text-gray-900">
                        {selectedCount} selected
                    </span>
                </div>

                <div className="h-8 w-px bg-gray-300" />

                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={onExport}
                        className="px-4 py-2 bg-blue-500 text-white font-bold border-2 border-black rounded-lg shadow-brutal hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all text-sm flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined text-lg">download</span>
                        Export CSV
                    </button>

                    <button
                        type="button"
                        onClick={onRecalculate}
                        className="px-4 py-2 bg-yellow-500 text-white font-bold border-2 border-black rounded-lg shadow-brutal hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all text-sm flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined text-lg">refresh</span>
                        Recalculate
                    </button>

                    <button
                        type="button"
                        onClick={onDelete}
                        className="px-4 py-2 bg-red-500 text-white font-bold border-2 border-black rounded-lg shadow-brutal hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all text-sm flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined text-lg">delete</span>
                        Delete
                    </button>

                    <button
                        type="button"
                        onClick={onClearSelection}
                        className="px-4 py-2 bg-white text-gray-700 font-bold border-2 border-gray-200 rounded-lg hover:border-gray-900 hover:text-gray-900 transition-all text-sm"
                    >
                        Clear
                    </button>
                </div>
            </div>
        </div>
    );
}
