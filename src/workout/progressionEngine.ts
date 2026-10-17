import type { ExercisePrescription, WorkoutSession } from '../domain/types';

export interface ProgressionSuggestion {
  exerciseId: string;
  prescribedLoadKg: number;
  suggestedLoadKg: number;
  incrementKg: number;
  reason: string;
  /**
   * D'où vient la suggestion : des séries validées avec aisance, ou d'une
   * demande explicite de l'athlète au quiz de fin de séance. Le bilan les
   * distingue, parce que ce ne sont pas les mêmes arguments devant le coach.
   */
  source: 'aisance' | 'demande';
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
 * Demande d'allègement exprimée au quiz, sur le dernier passage à cet exercice.
 *
 * Une demande d'allègement n'abaisse jamais la charge prescrite par le coach :
 * elle empêche la progression et mérite d'être affichée à l'athlète comme au
 * coach. C'est un signal, pas une décision automatique.
 */
export function demandeAllegement(exercise: ExercisePrescription, history: readonly WorkoutSession[]): boolean {
  const derniere = [...history]
    .filter((s) => Boolean(s.completedAt))
    .sort((a, b) => (b.completedAt ?? b.updatedAt).localeCompare(a.completedAt ?? a.updatedAt))
    .find((s) => s.loggedSets.some((set) => set.exerciseId === exercise.id));
  return derniere?.loadConsigne === 'decrease';
}

/**
 * Calcule une suggestion de surcharge progressive (Double Progression)
 * si la dernière séance pour cet exercice a été entièrement validée avec aisance.
 */
export function computeProgressiveOverload(
  exercise: ExercisePrescription,
  history: readonly WorkoutSession[],
): ProgressionSuggestion | null {
  const targetWorkSets = exercise.sets.filter((s) => s.phase !== 'warmup');
  if (targetWorkSets.length === 0) return null;

  const basePrescribedLoad = targetWorkSets[0].loadKg;
  const targetReps = targetWorkSets[0].repetitions;

  if (basePrescribedLoad === undefined || targetReps === undefined) {
    return null;
  }

  // Positions (setIndex) des séries de travail dans la prescription. Les séries
  // d'échauffement sont enregistrées avec le même exerciseId : sans ce filtre,
  // leurs charges plus basses faisaient échouer la comparaison et empêchaient
  // toute suggestion sur les exercices à échauffement prescrit (presse, squat).
  const workingSetIndexes = exercise.sets
    .map((set, index) => (set.phase === 'warmup' ? -1 : index))
    .filter((index) => index >= 0);

  // Trouver la dernière séance terminée contenant cet exercice
  const completedSessions = [...history]
    .filter((s) => Boolean(s.completedAt))
    .sort((a, b) => (b.completedAt ?? b.updatedAt).localeCompare(a.completedAt ?? a.updatedAt));

  for (const session of completedSessions) {
    const sets = session.loggedSets.filter(
      (s) => s.exerciseId === exercise.id && workingSetIndexes.includes(s.setIndex),
    );
    if (sets.length >= targetWorkSets.length) {
      // Vérifier si toutes les séries de travail ont atteint ou dépassé les répétitions cibles
      const allRepsReached = sets.every(
        (s) =>
          typeof s.actualRepetitions === 'number' &&
          Number.isFinite(s.actualRepetitions) &&
          s.actualRepetitions >= targetReps &&
          typeof s.actualLoadKg === 'number' &&
          Number.isFinite(s.actualLoadKg) &&
          s.actualLoadKg >= basePrescribedLoad,
      );

      // Si RPE était <= 7 ou feedback positif
      const comfortable = session.perceivedExertion === undefined || session.perceivedExertion <= 7;
      const noPain = !session.pain || session.pain.toLowerCase() === 'aucune';

      // L'athlète peut demander explicitement à charger plus : sa demande tient
      // lieu d'aisance ressentie, à condition que les séries soient allées au
      // bout et qu'aucune gêne n'ait été signalée. Sans cela, une consigne
      // n'autorise jamais à progresser sur une séance dure.
      const demande = session.loadConsigne === 'increase';
      const allegement = session.loadConsigne === 'decrease';

      if (allRepsReached && noPain && !allegement && (comfortable || demande)) {
        const increment = INCREMENT_MAP[exercise.id] ?? 2.5;
        const suggestedLoadKg = basePrescribedLoad + increment;

        return {
          exerciseId: exercise.id,
          prescribedLoadKg: basePrescribedLoad,
          suggestedLoadKg,
          incrementKg: increment,
          source: demande && !comfortable ? 'demande' : 'aisance',
          reason:
            demande && !comfortable
              ? `Tu as demandé à charger plus après avoir validé les ${targetWorkSets.length} séries. On monte d'un palier et on surveille l'effort ressenti.`
              : `Toutes les séries (${targetWorkSets.length}×${targetReps}) validées avec aisance lors de ta dernière séance.`,
        };
      }

      // La dernière séance contenant l'exercice ne remplit pas les conditions :
      // on ne rattrape pas sur une séance plus ancienne (sécurité : ne pas
      // progresser après une séance dure ou une baisse de performance).
      return null;
    }
  }

  return null;
}
