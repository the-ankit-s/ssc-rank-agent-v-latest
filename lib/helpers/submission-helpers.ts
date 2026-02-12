/**
 * Helper functions for submission management
 */

/**
 * Mask roll number - show first 4 + "..." + last 4 chars
 */
export function maskRollNumber(rollNumber: string): string {
    if (!rollNumber) return "";
    if (rollNumber.length <= 8) return rollNumber;
    return `${rollNumber.slice(0, 4)}...${rollNumber.slice(-4)}`;
}

/**
 * Get color for score based on percentage of exam total
 */
export function getScoreColor(score: number, examTotal: number): string {
    const percentage = (score / examTotal) * 100;
    if (percentage > 75) return "text-green-600";
    if (percentage > 50) return "text-yellow-600";
    return "text-red-600";
}

/**
 * Get category badge color
 */
export function getCategoryColor(category: string): {
    bg: string;
    text: string;
    border: string;
} {
    const colors: Record<string, { bg: string; text: string; border: string }> = {
        UR: { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-300" },
        OBC: { bg: "bg-yellow-100", text: "text-yellow-700", border: "border-yellow-300" },
        SC: { bg: "bg-green-100", text: "text-green-700", border: "border-green-300" },
        ST: { bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-300" },
        EWS: { bg: "bg-purple-100", text: "text-purple-700", border: "border-purple-300" },
    };
    return colors[category] || { bg: "bg-gray-100", text: "text-gray-700", border: "border-gray-300" };
}

/**
 * Calculate percentile
 */
export function calculatePercentile(rank: number, total: number): number {
    if (rank === null || rank === undefined || rank === 0 || !total) return 0;
    return Number((((total - rank + 1) / total) * 100).toFixed(2));
}

/**
 * Format accuracy percentage
 */
export function formatAccuracy(accuracy: number | null | undefined): string {
    if (accuracy === null || accuracy === undefined) return "N/A";
    return `${accuracy.toFixed(2)}%`;
}
