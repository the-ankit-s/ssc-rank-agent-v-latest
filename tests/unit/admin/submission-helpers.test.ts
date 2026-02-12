import { describe, it, expect } from "vitest";
import {
    maskRollNumber,
    getScoreColor,
    getCategoryColor,
    calculatePercentile,
    formatAccuracy,
} from "@/lib/helpers/submission-helpers";

describe("Submission Helpers", () => {
    describe("maskRollNumber", () => {
        it("should mask long roll numbers correctly", () => {
            expect(maskRollNumber("1234567890")).toBe("1234...7890");
        });

        it("should return short roll numbers as-is", () => {
            expect(maskRollNumber("123456")).toBe("123456");
        });

        it("should handle empty string", () => {
            expect(maskRollNumber("")).toBe("");
        });

        it("should not mask roll numbers of exactly 8 characters", () => {
            expect(maskRollNumber("12345678")).toBe("12345678");
        });
    });

    describe("getScoreColor", () => {
        it("should return green for scores > 75%", () => {
            expect(getScoreColor(160, 200)).toBe("text-green-600");
        });

        it("should return yellow for scores > 50% but <= 75%", () => {
            expect(getScoreColor(120, 200)).toBe("text-yellow-600");
        });

        it("should return red for scores <= 50%", () => {
            expect(getScoreColor(80, 200)).toBe("text-red-600");
        });

        it("should handle edge case at 75% boundary", () => {
            expect(getScoreColor(150, 200)).toBe("text-yellow-600");
            expect(getScoreColor(150.1, 200)).toBe("text-green-600");
        });

        it("should handle edge case at 50% boundary", () => {
            expect(getScoreColor(100.1, 200)).toBe("text-yellow-600");
            expect(getScoreColor(100, 200)).toBe("text-red-600");
        });
    });

    describe("getCategoryColor", () => {
        it("should return blue colors for UR", () => {
            const colors = getCategoryColor("UR");
            expect(colors.bg).toBe("bg-blue-100");
            expect(colors.text).toBe("text-blue-700");
            expect(colors.border).toBe("border-blue-300");
        });

        it("should return yellow colors for OBC", () => {
            const colors = getCategoryColor("OBC");
            expect(colors.bg).toBe("bg-yellow-100");
            expect(colors.text).toBe("text-yellow-700");
            expect(colors.border).toBe("border-yellow-300");
        });

        it("should return green colors for SC", () => {
            const colors = getCategoryColor("SC");
            expect(colors.bg).toBe("bg-green-100");
            expect(colors.text).toBe("text-green-700");
            expect(colors.border).toBe("border-green-300");
        });

        it("should return orange colors for ST", () => {
            const colors = getCategoryColor("ST");
            expect(colors.bg).toBe("bg-orange-100");
            expect(colors.text).toBe("text-orange-700");
            expect(colors.border).toBe("border-orange-300");
        });

        it("should return purple colors for EWS", () => {
            const colors = getCategoryColor("EWS");
            expect(colors.bg).toBe("bg-purple-100");
            expect(colors.text).toBe("text-purple-700");
            expect(colors.border).toBe("border-purple-300");
        });

        it("should return gray colors for unknown categories", () => {
            const colors = getCategoryColor("UNKNOWN");
            expect(colors.bg).toBe("bg-gray-100");
            expect(colors.text).toBe("text-gray-700");
            expect(colors.border).toBe("border-gray-300");
        });
    });

    describe("calculatePercentile", () => {
        it("should calculate percentile correctly", () => {
            expect(calculatePercentile(1, 100)).toBe(100);
            expect(calculatePercentile(50, 100)).toBe(51);
            expect(calculatePercentile(100, 100)).toBe(1);
        });

        it("should return 0 for null rank", () => {
            expect(calculatePercentile(0, 100)).toBe(0);
        });

        it("should return 0 for null total", () => {
            expect(calculatePercentile(10, 0)).toBe(0);
        });

        it("should round to 2 decimal places", () => {
            expect(calculatePercentile(33, 100)).toBe(68);
        });
    });

    describe("formatAccuracy", () => {
        it("should format accuracy with 2 decimal places", () => {
            expect(formatAccuracy(75.5678)).toBe("75.57%");
        });

        it("should return N/A for null", () => {
            expect(formatAccuracy(null)).toBe("N/A");
        });

        it("should return N/A for undefined", () => {
            expect(formatAccuracy(undefined)).toBe("N/A");
        });

        it("should handle whole numbers", () => {
            expect(formatAccuracy(80)).toBe("80.00%");
        });

        it("should handle 0", () => {
            expect(formatAccuracy(0)).toBe("0.00%");
        });

        it("should handle 100", () => {
            expect(formatAccuracy(100)).toBe("100.00%");
        });
    });
});
