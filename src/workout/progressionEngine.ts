import type { WorkoutSession, ExercisePrescription } from '../domain/types';

export interface ProgressionSuggestion {
  exerciseId: string;
  prescribedLoadKg: number;
  suggestedLoadKg: number;
  incrementKg: number;
  reason: string;
}

const INCREMENT_MAP: Record<string, number> = {
  'presse-cuisses-inclinee': 5,
  'squat-smith': 2.5,
  'chest-press': 2.5,
  'developpe-couche-machine': 2.5,
  'tirage-horizontal': 2.5,
  'tirage-vertical': 2.5,
  'leg-curl-allonge': 2,
  'leg-extension': 2,
  'developpe-clavicule': 1,
};

/**
 * Calcule une suggestion de surcharge progressive (Double Progression)
 * si la dernière séance pour cet exercice a été entièrement validée avec aisance.
 */
export function computeProgressiveOverload(
  exercise: ExercisePrescription,
  history: readonly WorkoutSession[]
): ProgressionSuggestion | null {
  const targetWorkSets = exercise.sets.filter((s) => s.phase !== 'warmup');
  if (targetWorkSets.length === 0) return null;

  const basePrescribedLoad = targetWorkSets[0].loadKg;
  const targetReps = targetWorkSets[0].repetitions;

  if (basePrescribedLoad === undefined || targetReps === undefined) {
    return null;
  }

  // Trouver la dernière séance terminée contenant cet exercice
  const completedSessions = [...history]
    .filter((s) => Boolean(s.completedAt))
    .sort((a, b) => (b.completedAt ?? b.updatedAt).localeCompare(a.completedAt ?? a.updatedAt));

  for (const session of completedSessions) {
    const sets = session.loggedSets.filter((s) => s.exerciseId === exercise.id);
    if (sets.length >= targetWorkSets.length) {
      // Vérifier si toutes les séries de travail ont atteint ou dépassé les répétitions cibles
      const allRepsReached = sets.every(
        (s) =>
          typeof s.actualRepetitions === 'number' &&
          Number.isFinite(s.actualRepetitions) &&
          s.actualRepetitions >= targetReps &&
          typeof s.actualLoadKg === 'number' &&
          Number.isFinite(s.actualLoadKg) &&
          s.actualLoadKg >= basePrescribedLoad
      );

      // Si RPE était <= 7 ou feedback positif
      const comfortable =
        session.perceivedExertion === undefined || session.perceivedExertion <= 7;
      const noPain = !session.pain || session.pain.toLowerCase() === 'aucune';

      if (allRepsReached && comfortable && noPain) {
        const increment = INCREMENT_MAP[exercise.id] ?? 2.5;
        const suggestedLoadKg = basePrescribedLoad + increment;

        return {
          exerciseId: exercise.id,
          prescribedLoadKg: basePrescribedLoad,
          suggestedLoadKg,
          incrementKg: increment,
          reason: `Toutes les séries (${targetWorkSets.length}×${targetReps}) validées avec aisance lors de ta dernière séance.`,
        };
      }
    }
  }

  return null;
}
