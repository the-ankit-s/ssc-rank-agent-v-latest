import { describe, it, expect } from 'vitest';
import { VENDORS } from '@/lib/parser/registry';
import type { VendorID } from '@/lib/parser/types';

describe('Parser Registry', () => {
  describe('VENDORS structure', () => {
    it('should have TCS vendor profile', () => {
      expect(VENDORS).toHaveProperty('TCS');
    });

    it('should have NTA_FUTURE vendor profile', () => {
      expect(VENDORS).toHaveProperty('NTA_FUTURE');
    });

    it('TCS profile should have required properties', () => {
      const tcs = VENDORS.TCS;
      expect(tcs.id).toBe('TCS');
      expect(typeof tcs.findCorrectOption).toBe('function');
      expect(typeof tcs.findChosenOption).toBe('function');
      expect(typeof tcs.questionBlockSelector).toBe('string');
      expect(typeof tcs.metadataSelector).toBe('function');
    });

    it('TCS metadataSelector should return correct selector format', () => {
      const tcs = VENDORS.TCS;
      const selector = tcs.metadataSelector('Roll Number');
      expect(selector).toBe("td:contains('Roll Number')");
    });
  });

  describe('Vendor profiles', () => {
    it('all vendor IDs should match their profile id', () => {
      Object.keys(VENDORS).forEach((key) => {
        const vendorId = key as VendorID;
        expect(VENDORS[vendorId].id).toBe(vendorId);
      });
    });

    it('all vendors should have question block selector', () => {
      Object.values(VENDORS).forEach((vendor) => {
        expect(vendor.questionBlockSelector).toBeTruthy();
        expect(typeof vendor.questionBlockSelector).toBe('string');
      });
    });

    it('all vendors should have callable metadataSelector', () => {
      Object.values(VENDORS).forEach((vendor) => {
        expect(typeof vendor.metadataSelector).toBe('function');
        const result = vendor.metadataSelector('test');
        expect(typeof result).toBe('string');
      });
    });
  });
});
