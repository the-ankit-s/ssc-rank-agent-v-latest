import { describe, it, expect } from "vitest";

/**
 * Tests for duplicate detection logic
 * These test the conceptual logic used in the duplicate detection API
 */

describe("Duplicate Detection Logic", () => {
    describe("Grouping by roll number and exam", () => {
        it("should identify duplicates with same roll number and exam", () => {
            const submissions = [
                { id: 1, rollNumber: "ABC123", examId: 1 },
                { id: 2, rollNumber: "ABC123", examId: 1 },
                { id: 3, rollNumber: "ABC124", examId: 1 },
            ];

            // Group by rollNumber + examId
            const groups = new Map<string, typeof submissions>();
            for (const sub of submissions) {
                const key = `${sub.rollNumber}-${sub.examId}`;
                if (!groups.has(key)) {
                    groups.set(key, []);
                }
                groups.get(key)!.push(sub);
            }

            // Filter groups with > 1 submission
            const duplicates = Array.from(groups.values()).filter((g) => g.length > 1);

            expect(duplicates).toHaveLength(1);
            expect(duplicates[0]).toHaveLength(2);
            expect(duplicates[0][0].rollNumber).toBe("ABC123");
        });

        it("should not identify submissions with different exam IDs as duplicates", () => {
            const submissions = [
                { id: 1, rollNumber: "ABC123", examId: 1 },
                { id: 2, rollNumber: "ABC123", examId: 2 },
            ];

            const groups = new Map<string, typeof submissions>();
            for (const sub of submissions) {
                const key = `${sub.rollNumber}-${sub.examId}`;
                if (!groups.has(key)) {
                    groups.set(key, []);
                }
                groups.get(key)!.push(sub);
            }

            const duplicates = Array.from(groups.values()).filter((g) => g.length > 1);

            expect(duplicates).toHaveLength(0);
        });

        it("should handle multiple duplicate groups", () => {
            const submissions = [
                { id: 1, rollNumber: "ABC123", examId: 1 },
                { id: 2, rollNumber: "ABC123", examId: 1 },
                { id: 3, rollNumber: "DEF456", examId: 1 },
                { id: 4, rollNumber: "DEF456", examId: 1 },
                { id: 5, rollNumber: "GHI789", examId: 1 },
            ];

            const groups = new Map<string, typeof submissions>();
            for (const sub of submissions) {
                const key = `${sub.rollNumber}-${sub.examId}`;
                if (!groups.has(key)) {
                    groups.set(key, []);
                }
                groups.get(key)!.push(sub);
            }

            const duplicates = Array.from(groups.values()).filter((g) => g.length > 1);

            expect(duplicates).toHaveLength(2);
        });
    });

    describe("Resolution strategies", () => {
        it("should keep first submission when resolving by keep_first", () => {
            const submissions = [
                { id: 1, rollNumber: "ABC123", examId: 1, createdAt: "2024-01-01" },
                { id: 2, rollNumber: "ABC123", examId: 1, createdAt: "2024-01-02" },
                { id: 3, rollNumber: "ABC123", examId: 1, createdAt: "2024-01-03" },
            ];

            // Sort by createdAt (already sorted)
            const sorted = [...submissions].sort(
                (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            );

            // Keep first, delete rest
            const toDelete = sorted.slice(1).map((s) => s.id);

            expect(toDelete).toEqual([2, 3]);
        });

        it("should keep latest submission when resolving by keep_latest", () => {
            const submissions = [
                { id: 1, rollNumber: "ABC123", examId: 1, createdAt: "2024-01-01" },
                { id: 2, rollNumber: "ABC123", examId: 1, createdAt: "2024-01-02" },
                { id: 3, rollNumber: "ABC123", examId: 1, createdAt: "2024-01-03" },
            ];

            const sorted = [...submissions].sort(
                (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            );

            // Keep last, delete rest
            const toDelete = sorted.slice(0, -1).map((s) => s.id);

            expect(toDelete).toEqual([1, 2]);
        });

        it("should keep selected submission when resolving by keep_selected", () => {
            const submissions = [
                { id: 1, rollNumber: "ABC123", examId: 1 },
                { id: 2, rollNumber: "ABC123", examId: 1 },
                { id: 3, rollNumber: "ABC123", examId: 1 },
            ];

            const selectedId = 2;

            // Keep selected, delete rest
            const toDelete = submissions.filter((s) => s.id !== selectedId).map((s) => s.id);

            expect(toDelete).toEqual([1, 3]);
        });
    });

    describe("Statistics calculation", () => {
        it("should calculate total groups and affected submissions correctly", () => {
            const duplicateGroups = [
                {
                    rollNumber: "ABC123",
                    examId: 1,
                    submissions: [{ id: 1 }, { id: 2 }],
                },
                {
                    rollNumber: "DEF456",
                    examId: 1,
                    submissions: [{ id: 3 }, { id: 4 }, { id: 5 }],
                },
            ];

            const totalGroups = duplicateGroups.length;
            const totalAffected = duplicateGroups.reduce(
                (sum, g) => sum + g.submissions.length,
                0
            );

            expect(totalGroups).toBe(2);
            expect(totalAffected).toBe(5);
        });

        it("should handle empty duplicate groups", () => {
            const duplicateGroups: any[] = [];

            const totalGroups = duplicateGroups.length;
            const totalAffected = duplicateGroups.reduce(
                (sum, g) => sum + g.submissions.length,
                0
            );

            expect(totalGroups).toBe(0);
            expect(totalAffected).toBe(0);
        });
    });
});
