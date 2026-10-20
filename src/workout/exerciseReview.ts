import type { ExercisePrescription, WorkoutSession } from '../domain/types';
import { isCompleted } from './summary';

/**
 * Fiche d'un mouvement : ce que disent réellement les séances enregistrées.
 *
 * Les records et la progressionForce répondaient séparément à « combien » et
 * « depuis quand ». Ici, chaque passage d'un exercice devient un point : charge
 * la plus lourde, répétitions tenues à cette charge, volume et 1RM estimé. La
 * fiche n'invente rien : elle remet bout à bout les séries validées.
 */

export interface ExercisePassage {
  readonly sessionId: string;
  /** Date de fin de séance, ISO. */
  readonly at: string;
  readonly bestLoadKg: number;
  /** Répétitions réussies à la charge la plus lourde du passage. */
  readonly bestRepetitions: number;
  readonly volumeKg: number;
  readonly sets: number;
  /** Meilleure estimation Epley du passage, en kg. */
  readonly estimatedOneRepMaxKg: number;
}

export interface ExerciseReview {
  /** Du plus ancien au plus récent, limité à `limit` passages. */
  readonly passages: readonly ExercisePassage[];
  readonly bestLoadKg?: number;
  readonly bestLoadAt?: string;
  readonly bestOneRepMaxKg?: number;
  readonly bestOneRepMaxAt?: string;
  readonly totalVolumeKg: number;
  readonly totalSets: number;
  readonly firstLoadKg?: number;
  readonly lastLoadKg?: number;
  readonly deltaKg?: number;
  /** Trois derniers passages à la même charge. */
  readonly stagnates: boolean;
}

/**
 * Estimation Epley : charge × (1 + répétitions / 30).
 *
 * À une répétition, la formule majore légèrement la charge réelle : on renvoie
 * donc la charge telle quelle, ce qui est la convention des tableaux de force.
 */
export function estimatedOneRepMax(loadKg: number, repetitions: number): number {
  if (!Number.isFinite(loadKg) || !Number.isFinite(repetitions) || loadKg <= 0 || repetitions <= 0) return 0;
  if (repetitions === 1) return Math.round(loadKg * 10) / 10;
  return Math.round(loadKg * (1 + repetitions / 30) * 10) / 10;
}

const estTravail = (exercise: ExercisePrescription | undefined, setIndex: number) =>
  exercise?.sets[setIndex]?.phase !== 'warmup';

const arrondi = (value: number) => Math.round(value * 10) / 10;

/**
 * Tous les passages d'un mouvement, du plus ancien au plus récent.
 *
 * `exercise` sert uniquement à écarter les séries d'échauffement prescrites.
 * Sans lui — un mouvement venu d'une alternative, par exemple — toutes les
 * séries chargées comptent.
 */
export function exerciseReview(
  history: readonly WorkoutSession[],
  exerciseId: string,
  exercise?: ExercisePrescription,
  limit = 12,
): ExerciseReview {
  const passages: ExercisePassage[] = [];

  for (const session of history) {
    if (!isCompleted(session)) continue;
    const sets = session.loggedSets.filter(
      (set) =>
        set.exerciseId === exerciseId &&
        estTravail(exercise, set.setIndex) &&
        Number.isFinite(set.actualLoadKg) &&
        (set.actualLoadKg ?? 0) > 0 &&
        Number.isFinite(set.actualRepetitions) &&
        (set.actualRepetitions ?? 0) > 0,
    );
    if (sets.length === 0) continue;

    const bestLoadKg = Math.max(...sets.map((set) => set.actualLoadKg ?? 0));
    const bestRepetitions = Math.max(
      ...sets.filter((set) => (set.actualLoadKg ?? 0) === bestLoadKg).map((set) => set.actualRepetitions ?? 0),
    );
    const volumeKg = sets.reduce((total, set) => total + (set.actualLoadKg ?? 0) * (set.actualRepetitions ?? 0), 0);
    const estimated = sets.reduce(
      (best, set) => Math.max(best, estimatedOneRepMax(set.actualLoadKg ?? 0, set.actualRepetitions ?? 0)),
      0,
    );

    passages.push({
      sessionId: session.id,
      at: session.completedAt ?? session.startedAt,
      bestLoadKg,
      bestRepetitions,
      volumeKg: arrondi(volumeKg),
      sets: sets.length,
      estimatedOneRepMaxKg: estimated,
    });
  }

  passages.sort((a, b) => Date.parse(a.at) - Date.parse(b.at));

  const bestLoad = passages.reduce<ExercisePassage | undefined>(
    (best, passage) =>
      !best || passage.bestLoadKg > best.bestLoadKg
        ? passage
        : passage.bestLoadKg === best.bestLoadKg && passage.bestRepetitions > best.bestRepetitions
          ? passage
          : best,
    undefined,
  );
  const bestOneRepMax = passages.reduce<ExercisePassage | undefined>(
    (best, passage) =>
      !best || passage.estimatedOneRepMaxKg > best.estimatedOneRepMaxKg
        ? passage
        : passage.estimatedOneRepMaxKg === best.estimatedOneRepMaxKg && passage.bestLoadKg > best.bestLoadKg
          ? passage
          : best,
    undefined,
  );

  const dernieres = passages.slice(-3);
  const firstLoadKg = passages[0]?.bestLoadKg;
  const lastLoadKg = passages.at(-1)?.bestLoadKg;

  return {
    passages: passages.slice(-limit),
    bestLoadKg: bestLoad?.bestLoadKg,
    bestLoadAt: bestLoad?.at,
    bestOneRepMaxKg: bestOneRepMax?.estimatedOneRepMaxKg,
    bestOneRepMaxAt: bestOneRepMax?.at,
    totalVolumeKg: arrondi(passages.reduce((total, passage) => total + passage.volumeKg, 0)),
    totalSets: passages.reduce((total, passage) => total + passage.sets, 0),
    firstLoadKg,
    lastLoadKg,
    deltaKg: firstLoadKg !== undefined && lastLoadKg !== undefined ? arrondi(lastLoadKg - firstLoadKg) : undefined,
    stagnates: dernieres.length === 3 && dernieres.every((passage) => passage.bestLoadKg === dernieres[0].bestLoadKg),
  };
}
