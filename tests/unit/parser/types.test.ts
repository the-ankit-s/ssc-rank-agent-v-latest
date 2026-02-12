import { describe, it, expect } from 'vitest';
import type { SSCExamVariant, VendorID, SectionResult, ExamResult } from '@/lib/parser/types';

describe('Parser Types', () => {
  describe('SSCExamVariant type', () => {
    it('should accept valid exam variants', () => {
      const tier1: SSCExamVariant = 'tier1';
      const tier2: SSCExamVariant = 'tier2';
      expect(tier1).toBe('tier1');
      expect(tier2).toBe('tier2');
    });
  });

  describe('VendorID type', () => {
    it('should accept valid vendor IDs', () => {
      const tcs: VendorID = 'TCS';
      const nta: VendorID = 'NTA_FUTURE';
      expect(tcs).toBe('TCS');
      expect(nta).toBe('NTA_FUTURE');
    });
  });

  describe('SectionResult structure', () => {
    it('should have all required properties', () => {
      const section: SectionResult = {
        sectionName: 'Reasoning',
        score: 50,
        correct: 25,
        wrong: 5,
        unattempted: 20,
        totalQuestions: 50
      };

      expect(section.sectionName).toBe('Reasoning');
      expect(section.score).toBe(50);
      expect(section.correct).toBe(25);
      expect(section.wrong).toBe(5);
      expect(section.unattempted).toBe(20);
      expect(section.totalQuestions).toBe(50);
    });

    it('should correctly calculate totalQuestions', () => {
      const section: SectionResult = {
        sectionName: 'English',
        score: 30,
        correct: 15,
        wrong: 5,
        unattempted: 5,
        totalQuestions: 25
      };

      // Verify that correct + wrong + unattempted equals totalQuestions
      expect(section.correct + section.wrong + section.unattempted).toBe(section.totalQuestions);
    });
  });

  describe('ExamResult structure', () => {
    it('should have all required properties', () => {
      const examResult: ExamResult = {
        metadata: {
          'Roll Number': '123456',
          'Candidate Name': 'Test User',
          'Exam Date': '2024-09-10',
        },
        scoreWithoutComputer: 258,
        scoreWithComputer: 279,
        sectionPerformance: {
          Reasoning: {
            sectionName: 'Reasoning',
            score: 86,
            correct: 43,
            wrong: 7,
            unattempted: 0,
            totalQuestions: 50,
          },
        },
        variant: 'tier2',
        vendor: 'TCS',
      };

      expect(examResult.metadata).toBeDefined();
      expect(examResult.scoreWithoutComputer).toBe(258);
      expect(examResult.scoreWithComputer).toBe(279);
      expect(examResult.sectionPerformance).toBeDefined();
      expect(examResult.variant).toBe('tier2');
      expect(examResult.vendor).toBe('TCS');
    });

    it('scoreWithComputer should be greater than or equal to scoreWithoutComputer', () => {
      const examResult: ExamResult = {
        metadata: {},
        scoreWithoutComputer: 258,
        scoreWithComputer: 279,
        sectionPerformance: {},
        variant: 'tier2',
        vendor: 'TCS',
      };

      expect(examResult.scoreWithComputer).toBeGreaterThanOrEqual(examResult.scoreWithoutComputer);
    });
  });
});
