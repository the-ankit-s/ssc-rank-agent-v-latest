import { describe, it, expect } from 'vitest';
import {
    calculateNormalizedScore,
    predictRank,
    analyzeAccuracy,
    compareWithToppers
} from '@/lib/services/calculator';
import { ParsedResponse } from '@/lib/services/parser';

describe('Calculator Service', () => {
    describe('calculateNormalizedScore', () => {
        it('should return raw score when difficulty factor is 1.0', () => {
            expect(calculateNormalizedScore(100, 1, 1.0)).toBe(100);
        });

        it('should scale score up for higher difficulty factor', () => {
            expect(calculateNormalizedScore(100, 1, 1.2)).toBe(120);
        });

        it('should scale score down for lower difficulty factor', () => {
            expect(calculateNormalizedScore(100, 1, 0.8)).toBe(80);
        });

        it('should round to 2 decimal places', () => {
            expect(calculateNormalizedScore(100, 1, 1.123456)).toBe(112.35);
        });
    });

    describe('predictRank', () => {
        it('should return plausible rank structure', () => {
            const result = predictRank(140, 140, 'UR');
            expect(result).toHaveProperty('overallRank');
            expect(result).toHaveProperty('categoryRank');
            expect(result).toHaveProperty('estimatedSafeScore');
            expect(result.overallRank).toBeGreaterThan(0);
        });

        it('should predict higher rank for higher score', () => {
            const lowResult = predictRank(100, 100, 'UR');
            const highResult = predictRank(150, 150, 'UR');
            expect(highResult.overallRank).toBeLessThan(lowResult.overallRank); // Lower number = better rank
        });
    });

    describe('analyzeAccuracy', () => {
        it('should calculate accuracy correctly for mixed responses', () => {
            const responses: ParsedResponse[] = [
                { questionNumber: 1, section: 'QA', selectedAnswer: 'A', correctAnswer: 'A', isCorrect: true },
                { questionNumber: 2, section: 'QA', selectedAnswer: 'B', correctAnswer: 'C', isCorrect: false },
                { questionNumber: 3, section: 'QA', selectedAnswer: null, correctAnswer: 'D', isCorrect: false },
            ];

            const stats = analyzeAccuracy(responses);
            expect(stats['QA']).toEqual({
                total: 3,
                attempted: 2,
                correct: 1,
                accuracy: 50.00
            });
        });

        it('should handle empty responses', () => {
            const stats = analyzeAccuracy([]);
            expect(stats).toEqual({});
        });
    });

    describe('compareWithToppers', () => {
        it('should show positive gap messages when score is lower', () => {
            const result = compareWithToppers(100); // Topper is 180
            expect(result.difference).toBe(80);
            expect(result.message).toContain('Focus on weak areas');
        });

        it('should show close gap messages when score is high', () => {
            const result = compareWithToppers(170); // Topper is 180
            expect(result.difference).toBe(10);
            expect(result.message).toContain('very close');
        });
    });
});
