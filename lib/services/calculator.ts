import { ParsedResponse } from "./parser";

export interface RankPrediction {
    overallRank: number;
    categoryRank: number;
    shiftRank: number;
    overallPercentile: number;
    categoryPercentile: number;
    estimatedSafeScore: number;
    estimatedCutoff: number;
}

/**
 * Calculate normalized score based on shift difficulty
 */
export function calculateNormalizedScore(
    rawScore: number,
    shiftId: number,
    difficultyFactor = 1.0
): number {
    // In a real implementation, this would fetch actual normalization data
    // For now, we'll use a simple formula
    const normalizedScore = rawScore * difficultyFactor;
    return Math.round(normalizedScore * 100) / 100;
}

/**
 * Predict rank based on score and historical data
 */
export function predictRank(
    rawScore: number,
    normalizedScore: number,
    category: string,
    totalSubmissions = 850000
): RankPrediction {
    // Mock rank prediction logic
    // In reality, this would query database for actual score distribution

    // Assume normal distribution with mean 100, std dev 30
    const mean = 100;
    const stdDev = 30;

    // Calculate Z-score
    const zScore = (normalizedScore - mean) / stdDev;

    // Convert to percentile (approximation)
    let percentile = 0;
    if (zScore >= 0) {
        percentile = 50 + (zScore / 3) * 50;
    } else {
        percentile = 50 - (Math.abs(zScore) / 3) * 50;
    }
    percentile = Math.min(99.99, Math.max(0.01, percentile));

    // Calculate rank
    const overallRank = Math.floor(totalSubmissions * (1 - percentile / 100));

    // Category rank (assuming 50% are in same category)
    const categoryPercentile = percentile + (100 - percentile) * 0.1; // Slight boost
    const categoryRank = Math.floor((totalSubmissions * 0.5) * (1 - categoryPercentile / 100));

    // Shift rank (assuming 10% in same shift)
    const shiftRank = Math.floor((totalSubmissions * 0.1) * (1 - percentile / 100));

    return {
        overallRank: Math.max(1, overallRank),
        categoryRank: Math.max(1, categoryRank),
        shiftRank: Math.max(1, shiftRank),
        overallPercentile: percentile,
        categoryPercentile,
        estimatedSafeScore: mean + stdDev * 1.5, // ~95th percentile
        estimatedCutoff: mean + stdDev * 0.5, // ~69th percentile
    };
}

/**
 * Analyze accuracy by section
 */
export function analyzeAccuracy(responses: ParsedResponse[]) {
    const sectionStats: Record<
        string,
        {
            total: number;
            attempted: number;
            correct: number;
            accuracy: number;
        }
    > = {};

    for (const response of responses) {
        if (!sectionStats[response.section]) {
            sectionStats[response.section] = {
                total: 0,
                attempted: 0,
                correct: 0,
                accuracy: 0,
            };
        }

        sectionStats[response.section].total++;
        if (response.selectedAnswer !== null) {
            sectionStats[response.section].attempted++;
            if (response.isCorrect) {
                sectionStats[response.section].correct++;
            }
        }
    }

    // Calculate accuracy percentages
    for (const section in sectionStats) {
        const stats = sectionStats[section];
        stats.accuracy =
            stats.attempted > 0
                ? Math.round((stats.correct / stats.attempted) * 10000) / 100
                : 0;
    }

    return sectionStats;
}

/**
 * Get strength and weakness analysis
 */
export function getStrengthsWeaknesses(responses: ParsedResponse[]) {
    const sectionAccuracy = analyzeAccuracy(responses);

    const sections = Object.entries(sectionAccuracy).map(([section, stats]) => ({
        section,
        ...stats,
    }));

    sections.sort((a, b) => b.accuracy - a.accuracy);

    return {
        strengths: sections.slice(0, 2),
        weaknesses: sections.slice(-2),
    };
}

/**
 * Compare with toppers
 */
export function compareWithToppers(normalizedScore: number) {
    // Mock comparison data
    const topperAverageScore = 180;
    const difference = topperAverageScore - normalizedScore;
    const percentageGap = (difference / topperAverageScore) * 100;

    return {
        topperAverageScore,
        yourScore: normalizedScore,
        difference: Math.round(difference * 100) / 100,
        percentageGap: Math.round(percentageGap * 100) / 100,
        message:
            percentageGap < 10
                ? "You're very close to topper level!"
                : percentageGap < 25
                    ? "Good performance! Keep improving."
                    : "Focus on weak areas to bridge the gap.",
    };
}
