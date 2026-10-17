import type { ProfileId } from '../domain/types';

/**
 * Mise en pause du cycle.
 *
 * Deux semaines d'absence produisent des courbes en dents de scie et un
 * « −0,3 kg » qui ne veut rien dire. Le cycle ne se décale pas tout seul — le
 * numéro de semaine n'avance qu'avec un relevé — donc mettre en pause revient
 * surtout à arrêter d'attendre un point du samedi, et à le dire clairement
 * plutôt qu'à laisser croire à un oubli.
 */
const cle = (profile: ProfileId) => `coach-cycle-pause-${profile}`;

const lireDate = (valeur: string | null): Date | undefined => {
  if (!valeur) return undefined;
  const date = new Date(valeur);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

export function mettreEnPause(profile: ProfileId, maintenant: Date = new Date()): void {
  try {
    localStorage.setItem(cle(profile), maintenant.toISOString());
  } catch {
    // Stockage refusé : la pause ne survivra pas au rechargement, rien de plus.
  }
}

export function reprendreCycle(profile: ProfileId): void {
  try {
    localStorage.removeItem(cle(profile));
  } catch {
    // Sans conséquence.
  }
}

/** Date de mise en pause, ou rien si le cycle tourne normalement. */
export function debutDePause(profile: ProfileId): Date | undefined {
  try {
    return lireDate(localStorage.getItem(cle(profile)));
  } catch {
    return undefined;
  }
}

/** Nombre de semaines entières écoulées depuis la mise en pause. */
export function semainesDePause(profile: ProfileId, maintenant: Date = new Date()): number {
  const debut = debutDePause(profile);
  if (!debut) return 0;
  return Math.max(0, Math.floor((maintenant.getTime() - debut.getTime()) / (7 * 86_400_000)));
}
