import { tutorials } from '../domain/tutorials';

/**
 * Paliers d'ajustement de la charge.
 *
 * Une presse à cuisse se règle par plaques de 2,5 kg, un développé couché par
 * paliers de 1,25 kg : proposer les mêmes boutons partout oblige à viser à côté,
 * ou à ouvrir le clavier pour trois kilos. Les paliers suivent donc le mouvement,
 * déduits des muscles travaillés — aucune saisie supplémentaire à maintenir pour
 * Ottman ni pour Laura.
 */
export interface PaliersDeCharge {
  /** Écart des deux gros boutons. */
  grand: number;
  /** Écart des deux boutons fins. */
  fin: number;
}

export const paliersBasDuCorps: PaliersDeCharge = Object.freeze({ grand: 5, fin: 2.5 });
export const paliersHautDuCorps: PaliersDeCharge = Object.freeze({ grand: 2.5, fin: 1.25 });

/** Mots qui trahissent un mouvement du bas du corps, dans les fiches d'exercice. */
const motsBasDuCorps = ['quadriceps', 'fessier', 'cuisse', 'ischio', 'mollet', 'adducteur', 'abducteur', 'jambe'];

export function estMouvementBasDuCorps(exerciseId: string): boolean {
  const muscles = tutorials[exerciseId]?.muscles ?? [];
  return muscles.some((muscle) => {
    const nom = muscle.toLowerCase();
    return motsBasDuCorps.some((mot) => nom.includes(mot));
  });
}

/** « 1,25 » plutôt que « 1.25 » : le bouton se lit comme la charge affichée. */
export function etiquettePalier(valeur: number): string {
  return valeur.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
}

export function paliersDeCharge(exerciseId: string): PaliersDeCharge {
  return estMouvementBasDuCorps(exerciseId) ? paliersBasDuCorps : paliersHautDuCorps;
}
