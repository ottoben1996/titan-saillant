import { PROGRAM_WEEKS } from '../domain/programs';
import type { ProfileId } from '../domain/types';

const key = (profile: ProfileId) => `coach-program-week-${profile}`;

function normalize(value: number): number {
  return Math.min(PROGRAM_WEEKS, Math.max(1, Math.round(value)));
}

/** Lit la semaine de charges choisie, sans toucher aux données IndexedDB. */
export function lireSemaineProgramme(profile: ProfileId): number {
  try {
    const raw = Number(localStorage.getItem(key(profile)));
    return Number.isFinite(raw) ? normalize(raw) : 1;
  } catch {
    return 1;
  }
}

/** Enregistre uniquement la préférence d'affichage du profil. */
export function enregistrerSemaineProgramme(profile: ProfileId, week: number): void {
  try {
    localStorage.setItem(key(profile), String(normalize(week)));
  } catch {
    // Une préférence non persistée ne doit pas empêcher une séance.
  }
}
