import { describe, expect, it, beforeEach } from 'vitest';
import {
  differenceEnJours,
  enregistrerExport,
  etatSauvegarde,
  reporterSauvegarde,
  sessionsAvantRappel,
} from './backupReminder';

const jour = (annee: number, mois: number, jourDuMois: number) => new Date(annee, mois - 1, jourDuMois, 9, 0, 0);

beforeEach(() => localStorage.clear());

describe('rappel de sauvegarde', () => {
  it('se tait tant qu’il n’y a presque rien à perdre', () => {
    expect(etatSauvegarde('ottman', sessionsAvantRappel - 1, jour(2026, 9, 12)).proposer).toBe(false);
  });

  it('propose une sauvegarde quand il n’y en a jamais eu', () => {
    expect(etatSauvegarde('ottman', 14, jour(2026, 9, 12))).toEqual({ proposer: true });
  });

  it('laisse passer un mois après une sauvegarde', () => {
    enregistrerExport('ottman', jour(2026, 9, 1));

    const tot = etatSauvegarde('ottman', 14, jour(2026, 9, 20));
    expect(tot.proposer).toBe(false);
    expect(tot.joursDepuisExport).toBe(19);

    // Trente jours plus tard, il est temps d'en refaire une.
    expect(etatSauvegarde('ottman', 14, jour(2026, 10, 2)).proposer).toBe(true);
  });

  it('se tait une semaine quand on répond « plus tard »', () => {
    reporterSauvegarde('laura', jour(2026, 9, 12));

    expect(etatSauvegarde('laura', 14, jour(2026, 9, 15)).proposer).toBe(false);
    expect(etatSauvegarde('laura', 14, jour(2026, 9, 20)).proposer).toBe(true);
  });

  it('oublie le report dès qu’une sauvegarde est faite', () => {
    reporterSauvegarde('laura', jour(2026, 9, 12));
    enregistrerExport('laura', jour(2026, 9, 13));

    // Le report est effacé : trente jours après l'export, la question revient.
    expect(etatSauvegarde('laura', 14, jour(2026, 9, 20)).proposer).toBe(false);
    expect(etatSauvegarde('laura', 14, jour(2026, 10, 20)).proposer).toBe(true);
  });

  it('ne compte jamais un écart négatif', () => {
    expect(differenceEnJours(jour(2026, 9, 20), jour(2026, 9, 12))).toBe(0);
    expect(differenceEnJours(jour(2026, 9, 1), jour(2026, 9, 12))).toBe(11);
  });

  it('reste utilisable si le stockage refuse', () => {
    const vrai = Storage.prototype.getItem;
    Storage.prototype.getItem = () => {
      throw new Error('refusé');
    };
    expect(() => etatSauvegarde('ottman', 14, jour(2026, 9, 12))).not.toThrow();
    Storage.prototype.getItem = vrai;
  });
});
