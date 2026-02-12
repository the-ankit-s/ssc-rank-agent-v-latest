import { describe, it, expect } from 'vitest';
import {
    calculateRawScore,
    calculateSectionPerformance,
    extractExamMetadata,
    ParsedResponse
} from '@/lib/services/parser';

describe('Parser Service', () => {
    describe('calculateRawScore', () => {
        it('should calculate score with default marking (+2, -0.5)', () => {
            const responses: ParsedResponse[] = [
                { questionNumber: 1, section: 'QA', selectedAnswer: 'A', correctAnswer: 'A', isCorrect: true }, // +2
                { questionNumber: 2, section: 'QA', selectedAnswer: 'B', correctAnswer: 'C', isCorrect: false }, // -0.5
                { questionNumber: 3, section: 'QA', selectedAnswer: null, correctAnswer: 'D', isCorrect: false }, // 0
            ];
            // Expect 1.5
            expect(calculateRawScore(responses)).toBe(1.5);
        });

        it('should handle custom marking scheme', () => {
            // +1, -0.25
            const responses: ParsedResponse[] = [
                { questionNumber: 1, section: 'QA', selectedAnswer: 'A', correctAnswer: 'A', isCorrect: true },
                { questionNumber: 2, section: 'QA', selectedAnswer: 'B', correctAnswer: 'C', isCorrect: false },
            ];
            expect(calculateRawScore(responses, 1, 0.25)).toBe(0.75);
        });

        it('should return 0 for all unattempted', () => {
            const responses: ParsedResponse[] = [
                { questionNumber: 1, section: 'QA', selectedAnswer: null, correctAnswer: 'A', isCorrect: false },
            ];
            expect(calculateRawScore(responses)).toBe(0);
        });
    });

    describe('calculateSectionPerformance', () => {
        it('should break down performance by section', () => {
            const responses: ParsedResponse[] = [
                { questionNumber: 1, section: 'QA', selectedAnswer: 'A', correctAnswer: 'A', isCorrect: true }, // +2
                { questionNumber: 2, section: 'EN', selectedAnswer: 'B', correctAnswer: 'C', isCorrect: false }, // -0.5
            ];

            const sections = calculateSectionPerformance(responses);

            expect(sections['QA'].correct).toBe(1);
            expect(sections['QA'].marks).toBe(2);

            expect(sections['EN'].wrong).toBe(1);
            expect(sections['EN'].marks).toBe(-0.5);
        });
    });

    describe('extractExamMetadata', () => {
        it('should return mock metadata for now', () => {
            const meta = extractExamMetadata('https://ssc.digialm.com/some-url');
            expect(meta).toHaveProperty('examCode');
            expect(meta).toHaveProperty('shiftCode');
        });
    });
});
