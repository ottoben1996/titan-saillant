import { describe, expect, it } from 'vitest';
import {
  applyRestPreset,
  normalizeRestSeconds,
  REST_PRESETS,
  REST_SKIP_PRESET,
  type RestPreset,
  restProgressRatio,
} from './restPresets';

const presetById = (id: RestPreset['id']) => {
  const preset = [...REST_PRESETS, REST_SKIP_PRESET].find((item) => item.id === id);
  if (!preset) throw new Error(`Préréglage introuvable : ${id}`);
  return preset;
};

describe('restPresets — paliers de repos', () => {
  it('expose trois paliers d’ajout, français et accessibles, aux cibles lisibles', () => {
    expect(REST_PRESETS.map((preset) => preset.id)).toEqual(['add-15', 'add-30', 'add-60']);
    expect(REST_PRESETS.map((preset) => preset.addSeconds)).toEqual([15, 30, 60]);
    for (const preset of REST_PRESETS) {
      expect(preset.kind).toBe('add');
      expect(preset.addSeconds).toBeGreaterThan(0);
      expect(preset.label).toMatch(/^\+\d+ s$/);
      expect(preset.ariaLabel).toMatch(/^Ajouter \d+ secondes de repos$/);
    }
  });

  it('ajoute le palier au temps restant et étend la durée totale', () => {
    expect(applyRestPreset({ remainingSeconds: 60, totalSeconds: 60 }, presetById('add-30'))).toEqual({
      remainingSeconds: 90,
      totalSeconds: 90,
    });
  });

  it('ne réduit jamais la durée totale quand le temps restant reste en deçà', () => {
    expect(applyRestPreset({ remainingSeconds: 10, totalSeconds: 90 }, presetById('add-15'))).toEqual({
      remainingSeconds: 25,
      totalSeconds: 90,
    });
  });

  it('part de zéro pour reconstruire un repos', () => {
    expect(applyRestPreset({ remainingSeconds: 0, totalSeconds: 0 }, presetById('add-60'))).toEqual({
      remainingSeconds: 60,
      totalSeconds: 60,
    });
  });

  it('ramène le temps restant à zéro avec le palier « passer » sans toucher la durée totale', () => {
    expect(applyRestPreset({ remainingSeconds: 42, totalSeconds: 90 }, REST_SKIP_PRESET)).toEqual({
      remainingSeconds: 0,
      totalSeconds: 90,
    });
  });

  it('normalise les entrées invalides au lieu de propager NaN ou du négatif', () => {
    expect(normalizeRestSeconds(Number.NaN)).toBe(0);
    expect(normalizeRestSeconds(-12)).toBe(0);
    expect(normalizeRestSeconds(89.6)).toBe(90);
    expect(applyRestPreset({ remainingSeconds: Number.NaN, totalSeconds: -5 }, presetById('add-15'))).toEqual({
      remainingSeconds: 15,
      totalSeconds: 15,
    });
  });

  it('borne la progression de l’anneau à l’intervalle [0, 1]', () => {
    expect(restProgressRatio({ remainingSeconds: 45, totalSeconds: 90 })).toBe(0.5);
    expect(restProgressRatio({ remainingSeconds: 0, totalSeconds: 0 })).toBe(0);
    expect(restProgressRatio({ remainingSeconds: 200, totalSeconds: 90 })).toBe(1);
    expect(restProgressRatio({ remainingSeconds: -20, totalSeconds: 90 })).toBe(0);
  });
});
