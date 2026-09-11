import { describe, expect, it } from 'vitest';
import { calculatePlateDelta } from './duoManager';

describe('duoManager', () => {
  it('detects identical load (keep action)', () => {
    const delta = calculatePlateDelta(70, 70);
    expect(delta.action).toBe('keep');
    expect(delta.differenceKg).toBe(0);
    expect(delta.deltaPerSideKg).toBe(0);
  });

  it('calculates plates to add when moving from Laura (70kg) to Ottman (110kg)', () => {
    // Différence totale = 40kg -> 20kg par côté (1x20kg par côté)
    const delta = calculatePlateDelta(70, 110);
    expect(delta.action).toBe('add');
    expect(delta.differenceKg).toBe(40);
    expect(delta.deltaPerSideKg).toBe(20);
    expect(delta.platesPerSide).toEqual([{ plateKg: 20, count: 1 }]);
    expect(delta.summaryLabel).toContain('Ajouter 20 kg / côté : 20kg');
  });

  it('calculates plates to remove when moving from Ottman (110kg) to Laura (70kg)', () => {
    const delta = calculatePlateDelta(110, 70);
    expect(delta.action).toBe('remove');
    expect(delta.differenceKg).toBe(-40);
    expect(delta.deltaPerSideKg).toBe(20);
    expect(delta.platesPerSide).toEqual([{ plateKg: 20, count: 1 }]);
    expect(delta.summaryLabel).toContain('Retirer 20 kg / côté : 20kg');
  });

  it('calculates multiple plates (e.g. 50kg to 125kg: diff 75kg -> 37.5kg/side)', () => {
    // 37.5kg = 20kg + 10kg + 5kg + 2.5kg
    const delta = calculatePlateDelta(50, 125);
    expect(delta.action).toBe('add');
    expect(delta.deltaPerSideKg).toBe(37.5);
    expect(delta.platesPerSide).toEqual([
      { plateKg: 20, count: 1 },
      { plateKg: 10, count: 1 },
      { plateKg: 5, count: 1 },
      { plateKg: 2.5, count: 1 },
    ]);
  });
});
