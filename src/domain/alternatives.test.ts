import { describe, expect, it } from 'vitest';
import { equipmentAlternatives } from './alternatives';

describe('equipment alternatives', () => {
  it('keeps the original prescription rather than inventing a replacement load', () => {
    const alternative = equipmentAlternatives['presse-cuisses-inclinee'];

    expect(alternative.name).toBe('Goblet squat');
    expect(alternative.setup).toContain('Conserve les répétitions et les repos du PDF');
    expect(alternative.caution).toContain('charge n’est pas comparable');
  });

  it('offers a fallback for every prescribed machine or cardio apparatus', () => {
    for (const exerciseId of [
      'presse-cuisses-inclinee',
      'leg-curl-allonge',
      'chest-press',
      'tirage-horizontal',
      'squat-smith',
      'leg-extension',
      'developpe-couche-machine',
      'tirage-vertical',
      'skierg',
      'rameur',
      'velo',
    ]) {
      expect(equipmentAlternatives[exerciseId]).toBeDefined();
    }
  });
});
