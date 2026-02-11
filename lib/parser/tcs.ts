import type { VendorProfile } from "./types";

// 1. Logic to find the Correct Option (Green Class or Tick Image)
const findCorrectOption = ($: any, qEl: any): number => {
    let correctIndex = -1;
    const optionRows = qEl.find(".questionRowTbl tr");

    optionRows.each((index: number, row: any) => {
        const rowEl = $(row);
        const text = rowEl.text();

        // Check for Green Class OR Tick Image
        const isCorrectRow =
            rowEl.find(".rightAns").length > 0 ||
            rowEl.find("img[src*='tick']").length > 0 ||
            rowEl.find("img[data-src*='tick']").length > 0;

        if (isCorrectRow) {
            // 🔍 EXTRACT THE NUMBER

            // Pattern A: Matches "2." or "1." (Your specific case)
            let match = text.match(/([1-4])\./);

            // Pattern B: Matches "(2)" or "(1)" (Standard fallback)
            if (!match) {
                match = text.match(/\(([1-4])\)/);
            }

            // If regex found a number, use it. Otherwise, use row index.
            correctIndex = match ? parseInt(match[1]) : index + 1;
        }
    });

    return correctIndex;
};

// 2. Logic to find the Student's Chosen Option
const findChosenOption = ($: any, qEl: any): number => {
    const chosenText = qEl
        .find(".menu-tbl")
        .find("td:contains('Chosen Option')")
        .next()
        .text()
        .trim();

    return chosenText && /^[1-4]$/.test(chosenText) ? parseInt(chosenText) : 0;
};

export const TCS_PROFILE: VendorProfile = {
    id: "TCS",
    findCorrectOption,
    findChosenOption,
    questionBlockSelector: ".questionPnlTbl",
    metadataSelector: (label) => `td:contains('${label}')`,
};
