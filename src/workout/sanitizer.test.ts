import { describe, expect, it } from 'vitest';
import { parseSafeFloat, parseSafeInt } from './sanitizer';

describe('sanitizer', () => {
  describe('parseSafeFloat', () => {
    it('converts comma to dot decimal separator', () => {
      expect(parseSafeFloat('12,5')).toBe(12.5);
      expect(parseSafeFloat('110,25')).toBe(110.25);
    });

    it('handles standard numbers and floats', () => {
      expect(parseSafeFloat('12.5')).toBe(12.5);
      expect(parseSafeFloat(45.5)).toBe(45.5);
      expect(parseSafeFloat('100')).toBe(100);
    });

    it('filters out invalid or NaN inputs with fallback', () => {
      expect(parseSafeFloat('abc')).toBe(0);
      expect(parseSafeFloat('abc', 10)).toBe(10);
      expect(parseSafeFloat(NaN, 5)).toBe(5);
      expect(parseSafeFloat(undefined, 20)).toBe(20);
      expect(parseSafeFloat(null, 25)).toBe(25);
      expect(parseSafeFloat('', 15)).toBe(15);
      expect(parseSafeFloat('   ', 15)).toBe(15);
    });

    it('clamps to min and max boundaries', () => {
      expect(parseSafeFloat('-10', 0, 0, 500)).toBe(0);
      expect(parseSafeFloat('999', 0, 0, 500)).toBe(500);
    });
  });

  describe('parseSafeInt', () => {
    it('parses integers and rounds floats', () => {
      expect(parseSafeInt('12')).toBe(12);
      expect(parseSafeInt('12,7')).toBe(13);
      expect(parseSafeInt('12.2')).toBe(12);
      expect(parseSafeInt(15.6)).toBe(16);
    });

    it('returns fallback on invalid values', () => {
      expect(parseSafeInt('invalid', 8)).toBe(8);
      expect(parseSafeInt(undefined, 10)).toBe(10);
      expect(parseSafeInt('-5', 0, 0, 100)).toBe(0);
    });
  });
});
