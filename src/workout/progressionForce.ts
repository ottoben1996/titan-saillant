import type { ExercisePrescription, WorkoutPlan, WorkoutSession } from '../domain/types';

/**
 * Progression de la charge, exercice par exercice.
 *
 * Le bilan montrait « séance précédente / dernière séance », c'est-à-dire une
 * photographie de la semaine. Le coach, lui, veut voir la pente : ce qui monte
 * depuis le début du cycle, ce qui stagne, ce qui a reculé. Les données sont
 * déjà dans les séances enregistrées, il suffisait de les mettre bout à bout.
 */
export interface ProgressionExercice {
  exerciseId: string;
  nom: string;
  /** Charge la plus lourde validée à chaque passage, du plus ancien au plus récent. */
  charges: number[];
  premier?: number;
  dernier?: number;
  /** Écart entre le premier et le dernier passage. */
  ecart?: number;
  /** Vrai quand la charge n'a pas bougé sur les trois derniers passages. */
  stagnation: boolean;
}

const estTravail = (exercise: ExercisePrescription, setIndex: number) => exercise.sets[setIndex]?.phase !== 'warmup';

/** Charge la plus lourde réellement validée sur les séries de travail d'une séance. */
function chargeDeLaSeance(session: WorkoutSession, exercise: ExercisePrescription): number | undefined {
  const charges = session.loggedSets
    .filter((set) => set.exerciseId === exercise.id && estTravail(exercise, set.setIndex))
    .map((set) => set.actualLoadKg)
    .filter((valeur): valeur is number => typeof valeur === 'number' && Number.isFinite(valeur));
  return charges.length > 0 ? Math.max(...charges) : undefined;
}

export function progressionForce(history: readonly WorkoutSession[], program: WorkoutPlan): ProgressionExercice[] {
  const exercices = new Map<string, ExercisePrescription>();
  for (const jour of program.days) {
    for (const exercise of jour.exercises) {
      if (exercise.kind === 'strength' && !exercices.has(exercise.id)) exercices.set(exercise.id, exercise);
    }
  }

  const seances = [...history]
    .filter((item) => Boolean(item.completedAt))
    .sort((a, b) => (a.completedAt ?? '').localeCompare(b.completedAt ?? ''));

  const resultats: ProgressionExercice[] = [];
  for (const exercise of exercices.values()) {
    const charges = seances
      .map((session) => chargeDeLaSeance(session, exercise))
      .filter((charge): charge is number => charge !== undefined);
    if (charges.length === 0) continue;

    const premier = charges[0];
    const dernier = charges[charges.length - 1];
    const trois = charges.slice(-3);
    resultats.push({
      exerciseId: exercise.id,
      nom: exercise.name,
      charges,
      premier,
      dernier,
      ecart: charges.length > 1 ? Math.round((dernier - premier) * 10) / 10 : undefined,
      stagnation: trois.length === 3 && trois.every((charge) => charge === trois[0]),
    });
  }

  return resultats;
}
