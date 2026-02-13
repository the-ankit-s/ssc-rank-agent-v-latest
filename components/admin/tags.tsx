import { cn } from "@/lib/utils";
import { getCategoryColor } from "@/lib/helpers/submission-helpers";

// ─── Difficulty Badge ────────────────────────────────────────────────────────

interface DifficultyBadgeProps {
    label: string | null;
    index: number | null;
}

export function DifficultyBadge({ label, index }: DifficultyBadgeProps) {
    const l = (label || "").toLowerCase();
    const colors = l === "hard" ? "bg-red-100 text-red-700 border-red-200" :
        l === "easy" ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
            "bg-amber-100 text-amber-700 border-amber-200";
    const icon = l === "hard" ? "🔴" : l === "easy" ? "🟢" : "🟡";
    return (
        <div className="flex items-center gap-1.5">
            <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-black uppercase border", colors)}>
                {icon} {label || "N/A"}
            </span>
            {index != null && <span className="text-[10px] text-gray-400 font-mono">{(index * 100).toFixed(0)}%</span>}
        </div>
    );
}

// ─── Category Badge ──────────────────────────────────────────────────────────

interface CategoryBadgeProps {
    category: string;
}

export function CategoryBadge({ category }: CategoryBadgeProps) {
    const colors = getCategoryColor(category);
    return (
        <span
            className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border-2 ${colors.bg} ${colors.text} ${colors.border}`}
        >
            {category}
        </span>
    );
}
