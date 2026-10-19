/**
 * Le vocabulaire musculaire : treize zones, leurs libellés, et la
 * normalisation des libellés bruts des fiches vers ces zones.
 *
 * Extrait du composant de carte pour que le calcul de volume — de la logique
 * de suivi, pas de l'interface — s'appuie dessus sans dépendre de React.
 */

export type MuscleId =
  | 'chest'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'abs'
  | 'quads'
  | 'calves'
  | 'lats'
  | 'traps'
  | 'glutes'
  | 'hamstrings'
  | 'lower-back';

export const MUSCLE_LABELS: Record<MuscleId, string> = {
  chest: 'Pectoraux',
  shoulders: 'Épaules',
  biceps: 'Biceps',
  triceps: 'Triceps',
  forearms: 'Avant-bras',
  abs: 'Abdominaux',
  quads: 'Quadriceps',
  calves: 'Mollets',
  lats: 'Grands dorsaux',
  traps: 'Trapèzes',
  glutes: 'Fessiers',
  hamstrings: 'Ischio-jambiers',
  'lower-back': 'Lombaires',
};

// Normalise les chaînes de muscles françaises ou anglaises vers MuscleId
export function normalizeMuscle(name: string): MuscleId | null {
  const n = name.toLowerCase().trim();
  if (n.includes('pect') || n.includes('chest') || n.includes('pec')) return 'chest';
  if (n.includes('épaul') || n.includes('delto') || n.includes('shoulder')) return 'shoulders';
  if (n.includes('bicep')) return 'biceps';
  if (n.includes('tricep')) return 'triceps';
  if (n.includes('avant-bras') || n.includes('forearm')) return 'forearms';
  if (n.includes('abdo') || n.includes('ventre') || n.includes('core') || n.includes('gain')) return 'abs';
  if (n.includes('quadri') || n.includes('cuisse') || n.includes('quad')) return 'quads';
  if (n.includes('ischio') || n.includes('hamstring')) return 'hamstrings';
  if (n.includes('fessier') || n.includes('glute') || n.includes('fesse')) return 'glutes';
  if (n.includes('mollet') || n.includes('calf') || n.includes('calves')) return 'calves';
  if (n.includes('dors') || n.includes('grand dorsal') || n.includes('lat') || n.includes('dos')) return 'lats';
  if (n.includes('trapèz') || n.includes('trap')) return 'traps';
  if (n.includes('lombair') || n.includes('bas du dos')) return 'lower-back';
  return null;
}

/** Convertit une liste de libellés bruts en identifiants dédupliqués, ordre préservé. */
export function muscleIds(muscles: readonly string[]): MuscleId[] {
  const seen = new Set<MuscleId>();
  const ids: MuscleId[] = [];
  for (const muscle of muscles) {
    const id = normalizeMuscle(muscle);
    if (id && !seen.has(id)) {
      seen.add(id);
      ids.push(id);
    }
  }
  return ids;
}
