export type SSCExamVariant = "tier1" | "tier2";
export type VendorID = "TCS" | "NTA_FUTURE";

export interface SectionResult {
    sectionName: string;
    score: number;
    correct: number;
    wrong: number;
    unattempted: number;
    totalQuestions: number;
}

export interface ExamResult {
    metadata: Record<string, string>;
    // The two specific totals you asked for
    scoreWithoutComputer: number; // Merit Score (Out of 390 usually)
    scoreWithComputer: number; // Grand Total
    sectionPerformance: Record<string, SectionResult>;
    variant: SSCExamVariant;
    vendor: VendorID;
}

import type * as cheerio from "cheerio";

export type CorrectOptionStrategy = (
    $: cheerio.CheerioAPI,
    qEl: cheerio.Cheerio<any>,
) => number;
export type ChosenOptionStrategy = (
    $: cheerio.CheerioAPI,
    qEl: cheerio.Cheerio<any>,
) => number;

export interface VendorProfile {
    id: VendorID;
    findCorrectOption: CorrectOptionStrategy;
    findChosenOption: ChosenOptionStrategy;
    questionBlockSelector: string;
    metadataSelector: (label: string) => string;
}
