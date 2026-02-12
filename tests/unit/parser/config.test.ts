import { describe, it, expect } from 'vitest';
import { EXAM_CONFIGS, type ExamConfig } from '@/lib/parser/config';
import type { SSCExamVariant } from '@/lib/parser/types';

describe('Parser Config', () => {
  describe('EXAM_CONFIGS structure', () => {
    it('should have tier1 and tier2 configurations', () => {
      expect(EXAM_CONFIGS).toHaveProperty('tier1');
      expect(EXAM_CONFIGS).toHaveProperty('tier2');
    });

    it('should have exactly 2 exam variants', () => {
      const variants = Object.keys(EXAM_CONFIGS);
      expect(variants).toHaveLength(2);
      expect(variants).toContain('tier1');
      expect(variants).toContain('tier2');
    });
  });

  describe('Tier 1 configuration', () => {
    let tier1Config: ExamConfig;

    beforeEach(() => {
      tier1Config = EXAM_CONFIGS.tier1;
    });

    it('should have correct variant name', () => {
      expect(tier1Config.variant).toBe('tier1');
    });

    it('should have correct marking scheme (+2/-0.5)', () => {
      expect(tier1Config.marks.positive).toBe(2);
      expect(tier1Config.marks.negative).toBe(0.5);
    });

    it('should have all required sections mapped', () => {
      expect(tier1Config.sectionMap).toHaveProperty('General Intelligence');
      expect(tier1Config.sectionMap).toHaveProperty('General Awareness');
      expect(tier1Config.sectionMap).toHaveProperty('Quantitative Aptitude');
      expect(tier1Config.sectionMap).toHaveProperty('English Comprehension');
    });

    it('should map sections to correct short names', () => {
      expect(tier1Config.sectionMap['General Intelligence']).toBe('Reasoning');
      expect(tier1Config.sectionMap['General Awareness']).toBe('Awareness');
      expect(tier1Config.sectionMap['Quantitative Aptitude']).toBe('Quant');
      expect(tier1Config.sectionMap['English Comprehension']).toBe('English');
    });
  });

  describe('Tier 2 configuration', () => {
    let tier2Config: ExamConfig;

    beforeEach(() => {
      tier2Config = EXAM_CONFIGS.tier2;
    });

    it('should have correct variant name', () => {
      expect(tier2Config.variant).toBe('tier2');
    });

    it('should have correct marking scheme (+3/-1)', () => {
      expect(tier2Config.marks.positive).toBe(3);
      expect(tier2Config.marks.negative).toBe(1);
    });

    it('should map Module III Computer section', () => {
      expect(tier2Config.sectionMap).toHaveProperty('Module III Computer');
      expect(tier2Config.sectionMap['Module III Computer']).toBe('Computer');
    });

    it('should map all Module I sections', () => {
      expect(tier2Config.sectionMap['Module I Mathematical Abilities']).toBe('Quant');
      expect(tier2Config.sectionMap['Module I Reasoning']).toBe('Reasoning');
    });

    it('should map all Module II sections', () => {
      expect(tier2Config.sectionMap['Module II English']).toBe('English');
      expect(tier2Config.sectionMap['Module II General Awareness']).toBe('Awareness');
    });

    it('should have fallback mappings for alternative section names', () => {
      expect(tier2Config.sectionMap['Mathematical Abilities']).toBe('Quant');
      expect(tier2Config.sectionMap['Reasoning and General Intelligence']).toBe('Reasoning');
      expect(tier2Config.sectionMap['General Awareness']).toBe('Awareness');
      expect(tier2Config.sectionMap['English Language']).toBe('English');
      expect(tier2Config.sectionMap['Computer Knowledge']).toBe('Computer');
      expect(tier2Config.sectionMap['Quantitative']).toBe('Quant');
    });
  });

  describe('Config validation', () => {
    it('all configs should have required fields', () => {
      const requiredFields = ['variant', 'marks', 'sectionMap'];
      
      Object.values(EXAM_CONFIGS).forEach((config) => {
        requiredFields.forEach((field) => {
          expect(config).toHaveProperty(field);
        });
      });
    });

    it('all configs should have valid marks object', () => {
      Object.values(EXAM_CONFIGS).forEach((config) => {
        expect(config.marks).toHaveProperty('positive');
        expect(config.marks).toHaveProperty('negative');
        expect(typeof config.marks.positive).toBe('number');
        expect(typeof config.marks.negative).toBe('number');
        expect(config.marks.positive).toBeGreaterThan(0);
        expect(config.marks.negative).toBeGreaterThanOrEqual(0);
      });
    });

    it('all configs should have non-empty sectionMap', () => {
      Object.values(EXAM_CONFIGS).forEach((config) => {
        const sections = Object.keys(config.sectionMap);
        expect(sections.length).toBeGreaterThan(0);
      });
    });

    it('all sectionMap values should be strings', () => {
      Object.values(EXAM_CONFIGS).forEach((config) => {
        Object.values(config.sectionMap).forEach((mappedName) => {
          expect(typeof mappedName).toBe('string');
          expect(mappedName.length).toBeGreaterThan(0);
        });
      });
    });
  });

  describe('Marking scheme calculations', () => {
    it('tier1 should calculate correct score for 1 correct and 1 wrong', () => {
      const { positive, negative } = EXAM_CONFIGS.tier1.marks;
      const score = positive - negative;
      expect(score).toBe(1.5); // 2 - 0.5
    });

    it('tier2 should calculate correct score for 1 correct and 1 wrong', () => {
      const { positive, negative } = EXAM_CONFIGS.tier2.marks;
      const score = positive - negative;
      expect(score).toBe(2); // 3 - 1
    });

    it('tier1 should have lower penalty than tier2', () => {
      expect(EXAM_CONFIGS.tier1.marks.negative).toBeLessThan(
        EXAM_CONFIGS.tier2.marks.negative
      );
    });

    it('tier2 should have higher marks per question than tier1', () => {
      expect(EXAM_CONFIGS.tier2.marks.positive).toBeGreaterThan(
        EXAM_CONFIGS.tier1.marks.positive
      );
    });
  });
});
