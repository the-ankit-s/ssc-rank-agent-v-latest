import { getScoreColor } from "@/lib/helpers/submission-helpers";

interface ScoreIndicatorProps {
    score: number;
    examTotal: number;
    size?: "sm" | "md" | "lg";
}

export function ScoreIndicator({ score, examTotal, size = "md" }: ScoreIndicatorProps) {
    const colorClass = getScoreColor(score, examTotal);
    const sizeClass = size === "sm" ? "text-sm" : size === "lg" ? "text-2xl" : "text-lg";

    return (
        <span className={`font-bold ${colorClass} ${sizeClass}`}>
            {score.toFixed(2)}
        </span>
    );
}
