import { cn } from "@/lib/utils";
import { getCategoryColor } from "@/lib/helpers/submission-helpers";

// ─── Difficulty Badge ────────────────────────────────────────────────────────

interface DifficultyBadgeProps {
    label: string | null;
    index: number | null;
    className?: string;
}
type DifficultyLevel = "easy" | "medium" | "hard";

// Configuration: Icons are now consistent JSX elements
const DIFFICULTY_CONFIG: Record<
    DifficultyLevel,
    { styles: string; icon: React.ReactNode }
> = {
    hard: {
        styles: "bg-red-100 text-red-700 border-red-200",
        icon: <div className="size-1.5 rounded-full bg-red-500" />,
    },
    easy: {
        styles: "bg-emerald-100 text-emerald-700 border-emerald-200",
        icon: <div className="size-1.5 rounded-full bg-emerald-500" />,
    },
    medium: {
        styles: "bg-amber-100 text-amber-700 border-amber-200",
        icon: <div className="size-1.5 rounded-full bg-amber-500" />,
    },
};

export function DifficultyBadge({ label, index, className }: DifficultyBadgeProps) {
    // Normalize input and default to 'medium' if label is missing or invalid
    const normalizedLabel = (label?.toLowerCase() || "N/A") as DifficultyLevel;
    const config = DIFFICULTY_CONFIG[normalizedLabel] || DIFFICULTY_CONFIG.medium;

    return (
        <div className={cn("flex items-center gap-1.5", className)}>
            <div
                className={cn(
                    "flex items-center gap-1.5 px-2 py-0.5 rounded-md border",
                    "text-[10px] font-black uppercase tracking-wide",
                    config.styles
                )}
            >
                {config.icon}
                <span className="text-[10px]">{label || "N/A"}</span>
            </div>

            {index !== undefined && index !== null && (
                <span className="text-[10px] text-gray-400 font-mono">
                    {(index * 100).toFixed(0)}%
                </span>
            )}
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
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${colors.bg} ${colors.text} ${colors.border}`}
        >
            {category}
        </span>
    );
}
