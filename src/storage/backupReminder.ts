import type { ProfileId } from '../domain/types';

/**
 * Rappel de sauvegarde.
 *
 * Toutes les données vivent dans ce téléphone : une chute, une réinstallation,
 * un nettoyage de navigateur les effacent définitivement. L'export existe depuis
 * le début mais n'est jamais proposé, donc jamais fait. Ici on décide seulement
 * *quand* le proposer, pour ne pas harceler : à partir de huit séances
 * enregistrées, une fois par mois, et on se tait une semaine si l'athlète
 * répond « plus tard ».
 */
const cleExport = (profile: ProfileId) => `coach-last-export-${profile}`;
const cleReport = (profile: ProfileId) => `coach-backup-later-${profile}`;

export const sessionsAvantRappel = 8;
export const joursEntreRappels = 30;
export const joursDeReport = 7;

const lireDate = (cle: string): Date | undefined => {
  try {
    const valeur = localStorage.getItem(cle);
    if (!valeur) return undefined;
    const date = new Date(valeur);
    return Number.isNaN(date.getTime()) ? undefined : date;
  } catch {
    return undefined;
  }
};

const ecrireDate = (cle: string, date: Date) => {
  try {
    localStorage.setItem(cle, date.toISOString());
  } catch {
    // Stockage refusé : le rappel se reproposera, rien de plus.
  }
};

/** Écart en jours entiers, jamais négatif. */
export function differenceEnJours(depuis: Date, maintenant: Date): number {
  return Math.max(0, Math.floor((maintenant.getTime() - depuis.getTime()) / 86_400_000));
}

export interface EtatSauvegarde {
  proposer: boolean;
  /** Absent tant qu'aucune sauvegarde n'a été faite. */
  joursDepuisExport?: number;
}

export function etatSauvegarde(
  profile: ProfileId,
  sessions: number,
  maintenant: Date = new Date(),
): EtatSauvegarde {
  if (sessions < sessionsAvantRappel) return { proposer: false };

  const report = lireDate(cleReport(profile));
  if (report && differenceEnJours(report, maintenant) < joursDeReport) return { proposer: false };

  const exporte = lireDate(cleExport(profile));
  if (!exporte) return { proposer: true };

  const jours = differenceEnJours(exporte, maintenant);
  return { proposer: jours >= joursEntreRappels, joursDepuisExport: jours };
}

export function enregistrerExport(profile: ProfileId, maintenant: Date = new Date()): void {
  ecrireDate(cleExport(profile), maintenant);
  try {
    localStorage.removeItem(cleReport(profile));
  } catch {
    // Sans importance : la prochaine échéance écrasera ce report.
  }
}

/** Réponse « plus tard » : on ne repose pas la question avant une semaine. */
export function reporterSauvegarde(profile: ProfileId, maintenant: Date = new Date()): void {
  ecrireDate(cleReport(profile), maintenant);
}
