import * as cheerio from "cheerio";
import { EXAM_CONFIGS } from "./config";
import { VENDORS } from "./registry";
import type {
    ExamResult,
    SectionResult,
    SSCExamVariant,
    VendorID,
} from "./types";

export const parseSSC = (
    html: string,
    variant: SSCExamVariant = "tier2",
    vendorId: VendorID = "TCS",
): ExamResult => {
    const $ = cheerio.load(html);

    // Normalize variant or fallback
    let safeVariant = variant;
    if (!EXAM_CONFIGS[safeVariant]) {
        console.warn(`Variant '${variant}' not found in config. Falling back to 'tier2'.`);
        safeVariant = "tier2";
    }

    const config = EXAM_CONFIGS[safeVariant];
    if (!config) {
        throw new Error(`Configuration for exam variant '${variant}' (fallback: '${safeVariant}') not found.`);
    }

    const vendor = VENDORS[vendorId];

    // 1. EXTRACT METADATA
    const metadata: Record<string, string> = {};
    [
        "Roll Number",
        "Candidate Name",
        "Venue Name",
        "Exam Date",
        "Exam Time",
    ].forEach((label) => {
        const selector = vendor.metadataSelector(label);
        const val = $(selector).first().next().text().trim();
        if (val) metadata[label] = val;
    });

    // 2. PROCESS SECTIONS
    const sectionPerformance: Record<string, SectionResult> = {};

    // Initialize both counters
    let scoreWithoutComputer = 0;
    let scoreWithComputer = 0;

    const sectionHeaders = $(".section-lbl");
    if (sectionHeaders.length === 0) {
        console.warn("No section headers (.section-lbl) found. The HTML might be invalid or from a different vendor.");
    }

    sectionHeaders.each((_, headerEl) => {
        const rawName = $(headerEl).text().replace("Section :", "").trim();

        // Normalize Section Name
        let sectionName = rawName;
        for (const [key, val] of Object.entries(config.sectionMap)) {
            if (rawName.includes(key)) {
                sectionName = val;
                break;
            }
        }

        const stats = { correct: 0, wrong: 0, unattempted: 0 };
        let currentEl = $(headerEl).next();

        // Loop Questions
        while (currentEl.length > 0) {
            if (currentEl.hasClass("section-lbl")) break;

            if (
                currentEl.hasClass("questionPnlTbl") ||
                currentEl.find(vendor.questionBlockSelector).length > 0
            ) {
                const correctOpt = vendor.findCorrectOption($, currentEl);
                const chosenOpt = vendor.findChosenOption($, currentEl);

                if (correctOpt !== -1) {
                    if (chosenOpt === 0) stats.unattempted++;
                    else if (chosenOpt === correctOpt) stats.correct++;
                    else stats.wrong++;
                }
            }
            currentEl = currentEl.next();
        }

        const score =
            stats.correct * config.marks.positive -
            stats.wrong * config.marks.negative;

        // --- ACCUMULATION LOGIC ---
        // Always add to the Grand Total
        scoreWithComputer += score;

        // Only add to Merit Score if it's NOT Computer
        if (sectionName !== "Computer") {
            scoreWithoutComputer += score;
        }

        sectionPerformance[sectionName] = {
            sectionName,
            score,
            ...stats,
            totalQuestions: stats.correct + stats.wrong + stats.unattempted,
        };
    });

    return {
        metadata,
        scoreWithoutComputer, // e.g. 258
        scoreWithComputer, // e.g. 279 (258 + 21)
        sectionPerformance,
        variant,
        vendor: vendorId,
    };
};
