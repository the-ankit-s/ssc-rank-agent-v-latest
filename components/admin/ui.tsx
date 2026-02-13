"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Dialog ─────────────────────────────────────────────────────────────────
// A reusable modal dialog with backdrop blur, close button, and smooth animation.
// Use as a container — put any content inside.

export function Dialog({ open, onClose, children, maxWidth = "max-w-md" }: {
    open: boolean;
    onClose: () => void;
    children: React.ReactNode;
    maxWidth?: string;
}) {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" />
            <div className={cn("relative bg-white rounded-2xl shadow-2xl w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 fade-in duration-200", maxWidth)} onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors z-10">
                    <X className="w-4 h-4" />
                </button>
                {children}
            </div>
        </div>
    );
}

// ─── StatCard ───────────────────────────────────────────────────────────────
// A compact stat card with icon, value, label, and optional subtitle.

export function StatCard({ icon: Icon, label, value, sub, color }: {
    icon: any;
    label: string;
    value: string | number;
    sub?: string;
    color: string;
}) {
    return (
        <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3 hover:shadow-md transition-shadow">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", color)}>
                <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
                <p className="text-2xl font-black text-gray-900 leading-none">{value}</p>
                <p className="text-xs font-medium text-gray-500 mt-0.5">{label}</p>
                {sub && <p className="text-[10px] text-gray-400 truncate">{sub}</p>}
            </div>
        </div>
    );
}

// ─── InfoRow ────────────────────────────────────────────────────────────────
// A label/value pair for detail views.

export function InfoRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
    return (
        <div>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
            <p className={cn("text-sm font-bold text-gray-900 mt-0.5", mono && "font-mono")}>{value ?? "—"}</p>
        </div>
    );
}

// ─── StatusDot ──────────────────────────────────────────────────────────────
// Status badge with colored dot.

const statusStyles: Record<string, { dot: string; bg: string }> = {
    active: { dot: "bg-emerald-500", bg: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    upcoming: { dot: "bg-amber-500", bg: "bg-amber-50 text-amber-700 border-amber-200" },
    closed: { dot: "bg-gray-400", bg: "bg-gray-100 text-gray-600 border-gray-200" },
    answer_key_released: { dot: "bg-blue-500", bg: "bg-blue-50 text-blue-700 border-blue-200" },
};

export function StatusBadge({ status }: { status: string }) {
    const s = statusStyles[status] || statusStyles.closed;
    return (
        <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border", s.bg)}>
            <span className={cn("w-1.5 h-1.5 rounded-full", s.dot)} />
            {status.replace(/_/g, " ")}
        </span>
    );
}

// ─── PhaseBadge ─────────────────────────────────────────────────────────────

const phaseStyles: Record<string, string> = {
    collecting: "bg-blue-50 text-blue-600 border-blue-200",
    analyzing: "bg-violet-50 text-violet-600 border-violet-200",
    normalizing: "bg-amber-50 text-amber-600 border-amber-200",
    publishing: "bg-emerald-50 text-emerald-600 border-emerald-200",
    completed: "bg-green-50 text-green-600 border-green-200",
};

export function PhaseBadge({ phase }: { phase: string }) {
    return (
        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", phaseStyles[phase] || "bg-gray-50 text-gray-500 border-gray-200")}>
            {phase}
        </span>
    );
}

// ─── SectionCard ────────────────────────────────────────────────────────────
// Section config display card.

export function SectionCard({ code, config }: { code: string; config: any }) {
    return (
        <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
            <p className="text-sm font-bold text-gray-900">{config.label || code}</p>
            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-gray-500">
                <span>{config.questions} Qs</span>
                <span>{config.maxMarks} Marks</span>
                <span className="text-green-600">+{config.positive}</span>
                <span className="text-red-500">−{config.negative}</span>
            </div>
        </div>
    );
}
