import type { ProfileId } from '../domain/types';

const key = (profile: ProfileId) => `coach-quick-log-${profile}`;

export function lireModeSaisieRapide(profile: ProfileId): boolean {
  try {
    return localStorage.getItem(key(profile)) === 'true';
  } catch {
    return false;
  }
}

export function enregistrerModeSaisieRapide(profile: ProfileId, enabled: boolean): void {
  try {
    localStorage.setItem(key(profile), String(enabled));
  } catch {
    // Le réglage reste valable jusqu'à la fin de la session courante.
  }
}
