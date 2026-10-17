import { describe, expect, it } from 'vitest';
import { generateWarmupRamp, roundToNearestIncrement } from './warmupRamp';

describe('warmupRamp', () => {
  it('rounds to nearest increment', () => {
    expect(roundToNearestIncrement(51.2, 2.5)).toBe(50);
    expect(roundToNearestIncrement(51.3, 2.5)).toBe(52.5);
    expect(roundToNearestIncrement(103, 5)).toBe(105);
  });

  it('returns empty ramp for light weights under 30kg', () => {
    expect(generateWarmupRamp(25)).toHaveLength(0);
    expect(generateWarmupRamp(0)).toHaveLength(0);
  });

  it('generates 2 steps for moderate loads (30kg to 59kg)', () => {
    const ramp = generateWarmupRamp(40, 'squat-smith', 10);
    expect(ramp).toHaveLength(2);
    expect(ramp[0].percentage).toBe(50);
    expect(ramp[0].loadKg).toBe(20);
    expect(ramp[0].repetitions).toBe(8);
    expect(ramp[1].percentage).toBe(75);
    expect(ramp[1].loadKg).toBe(30);
    expect(ramp[1].repetitions).toBe(4);
  });

  it('generates 3 progressive steps for heavy loads (e.g. 110kg leg press)', () => {
    const ramp = generateWarmupRamp(110, 'presse-cuisses-inclinee');
    expect(ramp).toHaveLength(3);
    // 50% de 110 = 55kg
    expect(ramp[0].loadKg).toBe(55);
    expect(ramp[0].repetitions).toBe(8);
    // 75% de 110 = 82.5 -> arrondi à 85kg sur presse (incréments de 5)
    expect(ramp[1].loadKg).toBe(85);
    expect(ramp[1].repetitions).toBe(4);
    // 90% de 110 = 99 -> arrondi à 100kg sur presse
    expect(ramp[2].loadKg).toBe(100);
    expect(ramp[2].repetitions).toBe(2);
  });
});
