/**
 * Préréglages de repos — module pur, sans dépendance React.
 *
 * En salle, une seule main : plutôt que d'ajuster le repos seconde par seconde,
 * on propose des paliers fixes (+15 s, +30 s, +60 s) et un « passer » immédiat.
 * Ce module calcule le nouvel état du chrono à partir de l'état courant :
 *
 *  - `remainingSeconds` : secondes restantes affichées, jamais négatives ;
 *  - `totalSeconds`     : durée de référence de l'anneau de progression, qui ne
 *                          recule jamais (sinon l'anneau afficherait plus de
 *                          100 % après un ajout de temps).
 *
 * Toutes les fonctions sont pures et testables (voir restPresets.test.ts).
 */

export interface RestState {
  /** Secondes restantes affichées au chrono. */
  readonly remainingSeconds: number;
  /** Durée de référence de l'anneau de progression (dénominateur). */
  readonly totalSeconds: number;
}

/** Paliers d'ajout de temps disponibles sur l'écran de repos. */
export interface AddRestPreset {
  readonly id: 'add-15' | 'add-30' | 'add-60';
  readonly kind: 'add';
  /** Secondes ajoutées au temps restant. Toujours strictement positif. */
  readonly addSeconds: number;
  /** Libellé visible, court (raccourci de temps). */
  readonly label: string;
  /** Libellé accessible complet en français, pour les lecteurs d'écran. */
  readonly ariaLabel: string;
}

/** Action « passer le repos » : le chrono se ferme immédiatement. */
export interface SkipRestPreset {
  readonly id: 'skip';
  readonly kind: 'skip';
  /** Le libellé visible est porté par le bouton « Passer » de la carte de repos. */
  readonly label: string;
  readonly ariaLabel: string;
}

export type RestPreset = AddRestPreset | SkipRestPreset;

/** Les trois paliers d'ajout, dans l'ordre d'affichage à l'écran. */
export const REST_PRESETS: readonly AddRestPreset[] = [
  { id: 'add-15', kind: 'add', addSeconds: 15, label: '+15 s', ariaLabel: 'Ajouter 15 secondes de repos' },
  { id: 'add-30', kind: 'add', addSeconds: 30, label: '+30 s', ariaLabel: 'Ajouter 30 secondes de repos' },
  { id: 'add-60', kind: 'add', addSeconds: 60, label: '+60 s', ariaLabel: 'Ajouter 60 secondes de repos' },
];

/** Le palier « passer », traité comme les autres par `applyRestPreset`. */
export const REST_SKIP_PRESET: SkipRestPreset = {
  id: 'skip',
  kind: 'skip',
  label: 'Passer',
  ariaLabel: 'Passer le temps de repos',
};

/** Normalise une durée en secondes entières, jamais négatives ni NaN. */
export function normalizeRestSeconds(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value));
}

/**
 * Applique un palier de repos à l'état courant et renvoie le nouvel état.
 *
 * Règles :
 *  - un palier d'ajout augmente le temps restant, sans jamais devenir négatif ;
 *  - le palier « passer » ramène le temps restant à zéro ;
 *  - la durée totale ne recule jamais : elle grandit au minimum jusqu'au
 *    nouveau temps restant, pour que l'anneau reste cohérent (≤ 100 %).
 */
export function applyRestPreset(state: RestState, preset: RestPreset): RestState {
  const currentRemaining = normalizeRestSeconds(state.remainingSeconds);
  const currentTotal = normalizeRestSeconds(state.totalSeconds);
  const remainingSeconds = preset.kind === 'skip' ? 0 : currentRemaining + preset.addSeconds;
  const totalSeconds = Math.max(currentTotal, remainingSeconds);
  return { remainingSeconds, totalSeconds };
}

/** Progression de l'anneau, bornée à l'intervalle [0, 1]. */
export function restProgressRatio(state: RestState): number {
  const total = normalizeRestSeconds(state.totalSeconds);
  if (total <= 0) return 0;
  const remaining = normalizeRestSeconds(state.remainingSeconds);
  return Math.max(0, Math.min(1, remaining / total));
}
