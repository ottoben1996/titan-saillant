import { beforeEach, describe, expect, it } from 'vitest';
import { debutDePause, mettreEnPause, reprendreCycle, semainesDePause } from './cyclePause';

beforeEach(() => localStorage.clear());

describe('mise en pause du cycle', () => {
  it('ne met rien en pause par défaut', () => {
    expect(debutDePause('ottman')).toBeUndefined();
    expect(semainesDePause('ottman')).toBe(0);
  });

  it('retient la date de mise en pause', () => {
    const debut = new Date(2026, 9, 3, 9, 0, 0);
    mettreEnPause('ottman', debut);

    expect(debutDePause('ottman')?.toISOString()).toBe(debut.toISOString());
  });

  it('compte les semaines d’absence', () => {
    mettreEnPause('laura', new Date(2026, 9, 3, 9, 0, 0));

    // Même heure du jour : deux semaines pleines, pas treize jours et demi.
    expect(semainesDePause('laura', new Date(2026, 9, 4, 9, 0, 0))).toBe(0);
    expect(semainesDePause('laura', new Date(2026, 9, 17, 9, 0, 0))).toBe(2);
  });

  it('reprend le cycle, sans laisser de trace', () => {
    mettreEnPause('laura');
    reprendreCycle('laura');

    expect(debutDePause('laura')).toBeUndefined();
  });

  it('garde la pause d’un profil pour lui seul', () => {
    mettreEnPause('laura', new Date(2026, 9, 3));

    expect(debutDePause('ottman')).toBeUndefined();
    expect(debutDePause('laura')).toBeDefined();
  });

  it('ignore une valeur abîmée', () => {
    localStorage.setItem('coach-cycle-pause-ottman', 'pas une date');
    expect(debutDePause('ottman')).toBeUndefined();
  });
});
