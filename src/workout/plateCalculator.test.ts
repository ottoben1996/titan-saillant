import { describe, expect, it } from 'vitest';
import { calculatePlates } from './plateCalculator';

describe('calculatePlates', () => {
  it('calcule correctement pour 110 kg à la presse (55 kg par côté sans barre)', () => {
    const res = calculatePlates(110, 0);
    expect(res.weightPerSideKg).toBe(55);
    // 55 kg = 2x20kg (40) + 1x10kg (50) + 1x5kg (55)
    expect(res.platesPerSide).toEqual([
      { plateKg: 20, count: 2 },
      { plateKg: 10, count: 1 },
      { plateKg: 5, count: 1 },
    ]);
    expect(res.remainderKg).toBe(0);
  });

  it('calcule correctement pour 70 kg (Laura presse)', () => {
    const res = calculatePlates(70, 0);
    expect(res.weightPerSideKg).toBe(35);
    // 35 kg = 1x20kg + 1x10kg + 1x5kg
    expect(res.platesPerSide).toEqual([
      { plateKg: 20, count: 1 },
      { plateKg: 10, count: 1 },
      { plateKg: 5, count: 1 },
    ]);
  });

  it('gère les charges avec décimales (ex: 45 kg sur barre = 22.5 kg)', () => {
    const res = calculatePlates(45, 0);
    expect(res.weightPerSideKg).toBe(22.5);
    expect(res.platesPerSide).toEqual([
      { plateKg: 20, count: 1 },
      { plateKg: 2.5, count: 1 },
    ]);
  });

  it('gère la soustraction du poids de barre olympique (20 kg)', () => {
    const res = calculatePlates(60, 20); // 60 kg total avec barre de 20 kg -> 40 kg de disques -> 20 kg / côté
    expect(res.weightPerSideKg).toBe(20);
    expect(res.platesPerSide).toEqual([{ plateKg: 20, count: 1 }]);
  });
});
