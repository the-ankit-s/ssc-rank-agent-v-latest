import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { submissions, shifts, exams, cutoffs } from "@/lib/db/schema";
import { eq, sql, and, count, avg, min, max, isNull, isNotNull } from "drizzle-orm";
import { getNormalizedScore, type NormalizationParams } from "@/lib/normalization/formulas";

interface PredictionResult {
    category: string;
    postCode: string;
    postName: string;
    expectedCutoff: number;
    safeScore: number;
    minimumScore: number;
    confidenceLevel: "low" | "medium" | "high";
    dataPoints: number;
    methodology: string;
    factors: string[];
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { examId, minSubmissions = 50, confidenceThreshold = "low" } = body;

        if (!examId) {
            return NextResponse.json({ error: "examId is required" }, { status: 400 });
        }

        // 1. Get exam config
        const [exam] = await db
            .select({
                id: exams.id,
                name: exams.name,
                totalMarks: exams.totalMarks,
                normalizationMethod: exams.normalizationMethod,
                normalizationConfig: exams.normalizationConfig,
            })
            .from(exams)
            .where(eq(exams.id, parseInt(examId)));

        if (!exam) {
            return NextResponse.json({ error: "Exam not found" }, { status: 404 });
        }

        // 2. Get submission stats per category
        const categoryStats = await db
            .select({
                category: submissions.category,
                count: count(),
                avgScore: avg(submissions.normalizedScore),
                minScore: min(submissions.normalizedScore),
                maxScore: max(submissions.normalizedScore),
                avgRawScore: avg(submissions.rawScore),
            })
            .from(submissions)
            .where(eq(submissions.examId, exam.id))
            .groupBy(submissions.category);

        // 3. Get global stats for normalization context
        const [globalStats] = await db
            .select({
                totalSubmissions: count(),
                avgScore: avg(submissions.normalizedScore),
                avgRawScore: avg(submissions.rawScore),
            })
            .from(submissions)
            .where(eq(submissions.examId, exam.id));

        const totalSubmissions = globalStats?.totalSubmissions || 0;

        if (totalSubmissions < minSubmissions) {
            return NextResponse.json({
                predictions: [],
                message: `Only ${totalSubmissions} submissions found. Minimum ${minSubmissions} required.`,
                totalSubmissions,
            });
        }

        // Safety guard: verify normalization is done (≥90%)
        const [normCheck] = await db
            .select({ c: count() })
            .from(submissions)
            .where(and(eq(submissions.examId, exam.id), isNull(submissions.normalizedScore)));

        const unnormalized = normCheck?.c || 0;
        const normalizedRatio = totalSubmissions > 0 ? (totalSubmissions - unnormalized) / totalSubmissions : 0;

        if (normalizedRatio < 0.9) {
            return NextResponse.json({
                predictions: [],
                message: `⚠ Only ${Math.round(normalizedRatio * 100)}% of submissions are normalized (${totalSubmissions - unnormalized}/${totalSubmissions}). Run normalization first before predicting cutoffs.`,
                totalSubmissions,
                normalizationRequired: true,
                normalizedRatio: Math.round(normalizedRatio * 100),
            });
        }

        // 4. Get historical cutoffs for comparison
        const historicalCutoffs = await db
            .select({
                category: cutoffs.category,
                expectedCutoff: cutoffs.expectedCutoff,
            })
            .from(cutoffs)
            .where(and(
                eq(cutoffs.examId, exam.id),
                eq(cutoffs.isPublished, true)
            ));

        const historicalMap = new Map(historicalCutoffs.map(c => [c.category, c.expectedCutoff]));

        // 5. Calculate percentile-based cutoffs per category
        const predictions: PredictionResult[] = [];
        const categories = ["UR", "OBC", "SC", "ST", "EWS"];

        for (const cat of categories) {
            const stats = categoryStats.find(s => s.category === cat);
            if (!stats || Number(stats.count) < Math.max(10, minSubmissions * 0.1)) {
                continue; // Skip categories with too few submissions
            }

            const catCount = Number(stats.count);
            const catAvg = Number(stats.avgScore || stats.avgRawScore || 0);

            // Get score distribution for this category
            const percentiles = await db
                .select({
                    p50: sql<number>`PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY normalized_score)`,
                    p60: sql<number>`PERCENTILE_CONT(0.60) WITHIN GROUP (ORDER BY normalized_score)`,
                    p70: sql<number>`PERCENTILE_CONT(0.70) WITHIN GROUP (ORDER BY normalized_score)`,
                    p80: sql<number>`PERCENTILE_CONT(0.80) WITHIN GROUP (ORDER BY normalized_score)`,
                    p90: sql<number>`PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY normalized_score)`,
                    stddev: sql<number>`STDDEV(normalized_score)`,
                })
                .from(submissions)
                .where(and(
                    eq(submissions.examId, exam.id),
                    eq(submissions.category, cat as any)
                ));

            if (!percentiles[0]) continue;

            const p = percentiles[0];

            // Cutoff estimation logic varies by category
            // UR: ~60th-70th percentile, OBC: ~50th-60th, SC/ST: ~40th-50th, EWS: ~55th-65th
            const cutoffPercentileMap: Record<string, { expected: number; safe: number; min: number }> = {
                UR: { expected: Number(p.p70), safe: Number(p.p80), min: Number(p.p60) },
                OBC: { expected: Number(p.p60), safe: Number(p.p70), min: Number(p.p50) },
                EWS: { expected: Number(p.p60), safe: Number(p.p70), min: Number(p.p50) },
                SC: { expected: Number(p.p50), safe: Number(p.p60), min: Number(p.p50) * 0.9 },
                ST: { expected: Number(p.p50), safe: Number(p.p60), min: Number(p.p50) * 0.85 },
            };

            const cutoffEstimate = cutoffPercentileMap[cat] || cutoffPercentileMap.UR;

            // Determine confidence based on sample size and stddev
            const stddev = Number(p.stddev || 0);
            let confidence: "low" | "medium" | "high" = "low";
            if (catCount >= minSubmissions * 2 && stddev < catAvg * 0.3) {
                confidence = "high";
            } else if (catCount >= minSubmissions) {
                confidence = "medium";
            }

            // Filter by confidence threshold
            const confidenceRank = { low: 1, medium: 2, high: 3 };
            if (confidenceRank[confidence] < confidenceRank[confidenceThreshold as keyof typeof confidenceRank]) {
                continue;
            }

            const factors: string[] = [];
            factors.push(`${catCount} submissions analyzed`);
            factors.push(`Normalization: ${exam.normalizationMethod || "z_score"}`);
            if (historicalMap.has(cat)) {
                const prevCutoff = historicalMap.get(cat)!;
                const diff = cutoffEstimate.expected - prevCutoff;
                factors.push(`Previous cutoff: ${prevCutoff.toFixed(1)} (${diff > 0 ? "+" : ""}${diff.toFixed(1)})`);
            }
            factors.push(`Std Dev: ${stddev.toFixed(2)}`);

            predictions.push({
                category: cat,
                postCode: "GEN",
                postName: "General Post",
                expectedCutoff: Math.round(cutoffEstimate.expected * 100) / 100,
                safeScore: Math.round(cutoffEstimate.safe * 100) / 100,
                minimumScore: Math.round(cutoffEstimate.min * 100) / 100,
                confidenceLevel: confidence,
                dataPoints: catCount,
                methodology: "Percentile-based estimation using normalized score distribution",
                factors,
            });
        }

        return NextResponse.json({
            predictions,
            totalSubmissions,
            normalizationMethod: exam.normalizationMethod || "z_score",
            examName: exam.name,
        });
    } catch (error) {
        console.error("Error predicting cutoffs:", error);
        return NextResponse.json(
            { error: "Failed to predict cutoffs" },
            { status: 500 }
        );
    }
}
