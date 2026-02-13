/**
 * Pluggable Normalization Formula Engine
 * 
 * Different competitive exams use different normalization methods:
 * - SSC CGL/CHSL: Z-Score normalization across shifts
 * - RRB NTPC/Group D: Percentile-based scoring
 * - IBPS PO/Clerk: Modified Z-Score with target mean/stddev
 * - NTA (JEE/NEET): Equipercentile score equating
 * - Single-shift exams: Raw score pass-through
 * - Custom: Admin-configurable via JSONB params
 */

export interface NormalizationParams {
    rawScore: number;
    shiftMean: number;
    shiftStdDev: number;
    globalMean: number;
    globalStdDev: number;
    maxMarks: number;

    // For percentile-based methods
    totalInShift: number;
    rankInShift: number;

    // For equipercentile methods - lookup table mapping percentile -> score
    globalDistribution?: Array<{ percentile: number; score: number }>;

    // Custom config from exam's normalizationConfig JSONB
    config?: {
        targetMean?: number;
        targetStdDev?: number;
        maxNormalizedScore?: number;
        minNormalizedScore?: number;
        customParams?: Record<string, number>;
    };
}

export type FormulaFn = (params: NormalizationParams) => number;

// ─── Z-SCORE (SSC Standard) ─────────────────────────────────────────────
// Normalizes shift-level performance to global scale using z-scores
// Formula: (raw - shift_mean) / shift_stddev * global_stddev + global_mean
function zScore(p: NormalizationParams): number {
    if (p.shiftStdDev === 0 || !p.shiftStdDev) return p.rawScore;
    const z = (p.rawScore - p.shiftMean) / p.shiftStdDev;
    return z * p.globalStdDev + p.globalMean;
}

// ─── PERCENTILE-BASED (RRB Standard) ────────────────────────────────────
// Converts rank-in-shift to percentile, then maps to normalized score
// Formula: ((totalInShift - rankInShift) / totalInShift) * maxMarks
function percentile(p: NormalizationParams): number {
    if (p.totalInShift <= 1) return p.rawScore;
    const pctile = ((p.totalInShift - p.rankInShift) / (p.totalInShift - 1)) * 100;
    return (pctile / 100) * p.maxMarks;
}

// ─── MODIFIED Z-SCORE (IBPS Standard) ───────────────────────────────────
// Similar to z-score but normalizes to a target mean/stddev instead of global
// Useful when the examining body wants scores on a fixed scale
function modifiedZ(p: NormalizationParams): number {
    if (p.shiftStdDev === 0 || !p.shiftStdDev) return p.rawScore;
    const targetMean = p.config?.targetMean ?? 50;
    const targetStdDev = p.config?.targetStdDev ?? 15;
    const z = (p.rawScore - p.shiftMean) / p.shiftStdDev;
    return z * targetStdDev + targetMean;
}

// ─── EQUATING (SSC / Equipercentile) ───────────────────────────────────
// Official SSC normalization (June 2025): Non-parametric equipercentile equating
// 1. Calculate candidate's percentile rank in their shift
// 2. Find the corresponding score in the global distribution using linear interpolation
// 3. If no global distribution provided, fall back to parametric z-score method
function equating(p: NormalizationParams): number {
    if (p.totalInShift <= 1) return p.rawScore;

    // Calculate percentile rank in shift (0-100 scale)
    const pctileRank = ((p.totalInShift - p.rankInShift) / (p.totalInShift - 1)) * 100;

    // If global distribution lookup table is provided, use linear interpolation
    if (p.globalDistribution && p.globalDistribution.length > 0) {
        return interpolatePercentile(pctileRank, p.globalDistribution);
    }

    // Fallback: Parametric approach using z-score (for backward compatibility)
    const u = Math.max(0.001, Math.min(0.999, pctileRank / 100));

    // Beasley-Springer-Moro approximation for inverse normal CDF
    const a = [0, -3.969683028665376e1, 2.209460984245205e2,
        -2.759285104469687e2, 1.383577518672690e2,
        -3.066479806614716e1, 2.506628277459239e0];
    const b = [0, -5.447609879822406e1, 1.615858368580409e2,
        -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
    const c = [0, -7.784894002430293e-3, -3.223964580411365e-1,
        -2.400758277161838e0, -2.549732539343734e0,
        4.374664141464968e0, 2.938163982698783e0];
    const d = [0, 7.784695709041462e-3, 3.224671290700398e-1,
        2.445134137142996e0, 3.754408661907416e0];

    let z: number;
    if (u < 0.02425) {
        const q = Math.sqrt(-2 * Math.log(u));
        z = (((((c[1] * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) * q + c[6]) /
            ((((d[1] * q + d[2]) * q + d[3]) * q + d[4]) * q + 1);
    } else if (u <= 0.97575) {
        const q = u - 0.5;
        const r = q * q;
        z = (((((a[1] * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * r + a[6]) * q /
            (((((b[1] * r + b[2]) * r + b[3]) * r + b[4]) * r + b[5]) * r + 1);
    } else {
        const q = Math.sqrt(-2 * Math.log(1 - u));
        z = -(((((c[1] * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) * q + c[6]) /
            ((((d[1] * q + d[2]) * q + d[3]) * q + d[4]) * q + 1);
    }

    return z * p.globalStdDev + p.globalMean;
}

// Helper: Linear interpolation for equipercentile lookup
function interpolatePercentile(
    targetPercentile: number,
    distribution: Array<{ percentile: number; score: number }>
): number {
    // Edge cases
    if (targetPercentile <= distribution[0].percentile) return distribution[0].score;
    if (targetPercentile >= distribution[distribution.length - 1].percentile) {
        return distribution[distribution.length - 1].score;
    }

    // Binary search for the two bounding points
    let left = 0;
    let right = distribution.length - 1;

    while (left < right - 1) {
        const mid = Math.floor((left + right) / 2);
        if (distribution[mid].percentile === targetPercentile) {
            return distribution[mid].score;
        } else if (distribution[mid].percentile < targetPercentile) {
            left = mid;
        } else {
            right = mid;
        }
    }

    // Linear interpolation between distribution[left] and distribution[right]
    const p1 = distribution[left].percentile;
    const p2 = distribution[right].percentile;
    const s1 = distribution[left].score;
    const s2 = distribution[right].score;

    const interpolated = s1 + (s2 - s1) * (targetPercentile - p1) / (p2 - p1);
    return interpolated;
}

// ─── RAW (No Normalization) ─────────────────────────────────────────────
function raw(p: NormalizationParams): number {
    return p.rawScore;
}

// ─── CUSTOM (Admin-defined parameters) ──────────────────────────────────
// Applies a configurable linear transformation:
// normalized = a * rawScore + b * z_score + c
// Where a, b, c are set via customParams
function custom(p: NormalizationParams): number {
    const params = p.config?.customParams;
    if (!params) return p.rawScore;

    const a = params.rawWeight ?? 0;
    const b = params.zWeight ?? 1;
    const c = params.offset ?? 0;

    const z = p.shiftStdDev > 0
        ? (p.rawScore - p.shiftMean) / p.shiftStdDev
        : 0;

    let result = a * p.rawScore + b * (z * p.globalStdDev + p.globalMean) + c;

    // Apply bounds if configured
    const maxScore = p.config?.maxNormalizedScore ?? Infinity;
    const minScore = p.config?.minNormalizedScore ?? -Infinity;
    result = Math.max(minScore, Math.min(maxScore, result));

    return result;
}

// ─── FORMULA REGISTRY ───────────────────────────────────────────────────
export const FORMULAS: Record<string, FormulaFn> = {
    z_score: zScore,
    percentile,
    modified_z: modifiedZ,
    equating,
    raw,
    custom,
};

/**
 * Get the normalized score for a submission using the specified method.
 * Falls back to z_score if the method is unknown.
 */
export function getNormalizedScore(
    method: string,
    params: NormalizationParams
): number {
    const fn = FORMULAS[method] || FORMULAS.z_score;
    const result = fn(params);

    // Round to 2 decimal places for consistency
    return Math.round(result * 100) / 100;
}

/**
 * Get human-readable name for a normalization method.
 */
export function getMethodLabel(method: string): string {
    const labels: Record<string, string> = {
        z_score: "Z-Score (SSC Standard)",
        percentile: "Percentile-Based (RRB)",
        modified_z: "Modified Z-Score (IBPS)",
        equating: "Equipercentile (NTA)",
        raw: "No Normalization",
        custom: "Custom Formula",
    };
    return labels[method] || method;
}

/**
 * Get the list of available formulas for use in dropdowns.
 */
export function getAvailableFormulas() {
    return Object.keys(FORMULAS).map(key => ({
        value: key,
        label: getMethodLabel(key),
    }));
}
