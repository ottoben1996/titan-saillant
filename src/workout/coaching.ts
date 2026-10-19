import type { ExercisePrescription, WorkoutSession } from '../domain/types';

export type CoachingRecommendation = 'increase' | 'maintain' | 'reduce';

export interface AdaptiveAdvice {
  recommendation: CoachingRecommendation;
  title: string;
  message: string;
  safety: boolean;
}

/** Retourne le conseil basé sur le dernier bilan complet, sans modifier la prescription PDF. */
export function getAdaptiveAdvice(history: readonly WorkoutSession[]): AdaptiveAdvice | null {
  const latest = [...history]
    .filter((session) => Boolean(session.completedAt))
    .sort((a, b) => (b.completedAt ?? b.updatedAt).localeCompare(a.completedAt ?? a.updatedAt))[0];
  if (!latest) return null;

  const pain = latest.pain?.trim().toLowerCase();
  if (pain && pain !== 'aucune') {
    return {
      recommendation: 'reduce',
      title: 'Priorité à la sécurité',
      message:
        'Une gêne ou une douleur a été signalée. Garde la charge ou réduis-la, et arrête l’exercice si la douleur est vive ou inhabituelle.',
      safety: true,
    };
  }

  const rpe = latest.perceivedExertion;
  const energy = latest.energy;
  if (rpe !== undefined && rpe >= 9) {
    return {
      recommendation: 'reduce',
      title: 'Allège la prochaine séance',
      message:
        'L’effort était très élevé. Maintiens la technique et réduis légèrement la charge ou le volume au prochain passage.',
      safety: false,
    };
  }
  if (rpe !== undefined && rpe <= 6 && (energy === undefined || energy >= 4)) {
    return {
      recommendation: 'increase',
      title: 'Tu peux progresser',
      message:
        'La séance semble bien maîtrisée. Si la technique reste propre, augmente très progressivement la charge lors de la prochaine séance.',
      safety: false,
    };
  }
  return {
    recommendation: 'maintain',
    title: 'Reste sur cette base',
    message: 'Conserve la charge actuelle et cherche des répétitions régulières et contrôlées avant de progresser.',
    safety: false,
  };
}

export type RecommendationConfidence = 'low' | 'medium' | 'high';

export interface ExerciseRecommendation {
  exerciseId: string;
  kind: ExercisePrescription['kind'];
  action: CoachingRecommendation;
  suggestedLoadKg?: number;
  suggestedDurationSeconds?: number;
  reason: string;
  confidence: RecommendationConfidence;
  signals: string[];
  safety: boolean;
}

export interface ExerciseRecommendationOptions {
  profileId?: WorkoutSession['profileId'];
  maxDurationSeconds?: number;
}

const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const painFree = (pain?: string) => !pain?.trim() || pain.trim().toLowerCase() === 'aucune';
const dateOf = (session: WorkoutSession) => session.completedAt ?? session.updatedAt;

export function getExerciseRecommendation(
  exercise: ExercisePrescription,
  history: readonly WorkoutSession[],
  options: ExerciseRecommendationOptions = {},
): ExerciseRecommendation | null {
  const activeSets = exercise.sets.map((set, index) => ({ set, index })).filter(({ set }) => set.phase !== 'warmup');
  if (activeSets.length === 0) return null;
  const load = activeSets.map(({ set }) => set.loadKg).find(finite);
  const duration = activeSets.map(({ set }) => set.durationSeconds).find(finite);
  const relevant = [...history]
    .filter((session) => Boolean(session.completedAt))
    .filter((session) => !options.profileId || session.profileId === options.profileId)
    .sort((a, b) => dateOf(b).localeCompare(dateOf(a)))
    .map((session) => ({ session, sets: session.loggedSets.filter((logged) => logged.exerciseId === exercise.id) }))
    .filter(({ sets }) => sets.length > 0);
  const base = (
    action: CoachingRecommendation,
    reason: string,
    confidence: RecommendationConfidence,
    signals: string[],
    safety = false,
  ): ExerciseRecommendation => ({
    exerciseId: exercise.id,
    kind: exercise.kind,
    action,
    reason,
    confidence,
    signals,
    safety,
  });
  const latest = relevant[0];
  if (!latest)
    return base('maintain', 'Aucune séance complète et comparable pour cet exercice.', 'low', ['missing-history']);
  const expectedIndexes = new Set(activeSets.map(({ index }) => index));
  const actualIndexes = new Set(latest.sets.map((set) => set.setIndex));
  const complete =
    actualIndexes.size === expectedIndexes.size &&
    [...expectedIndexes].every((index) => actualIndexes.has(index)) &&
    latest.sets.length === expectedIndexes.size &&
    latest.sets.every((set) => finite(set.actualRepetitions) || finite(set.actualDurationSeconds));
  const malformed = latest.sets.some((set) => set.setIndex < 0 || !expectedIndexes.has(set.setIndex));
  const { session } = latest;
  const pain = !painFree(session.pain);
  const hard = finite(session.perceivedExertion) && session.perceivedExertion >= 9;
  const lowEnergy = finite(session.energy) && session.energy <= 2;
  if (pain || hard || lowEnergy) {
    const signals = [
      pain ? 'pain' : '',
      hard ? 'high-rpe' : '',
      lowEnergy ? 'low-energy' : '',
      !complete || malformed ? 'incomplete-sets' : '',
    ].filter(Boolean);
    return base(
      'reduce',
      pain
        ? 'Une douleur a été signalée : priorité à la sécurité.'
        : 'La récupération ou l’effort récent ne permet pas de progresser en sécurité.',
      'low',
      signals,
      true,
    );
  }
  if (!complete || malformed)
    return base(
      'maintain',
      'Les séries comparables sont incomplètes ou invalides : on conserve la prescription.',
      'low',
      ['incomplete-sets'],
    );
  const isCompleteExposure = (sets: typeof latest.sets, validator: (set: (typeof latest.sets)[number]) => boolean) =>
    sets.length === expectedIndexes.size &&
    new Set(sets.map((set) => set.setIndex)).size === expectedIndexes.size &&
    [...expectedIndexes].every((index) => sets.some((set) => set.setIndex === index)) &&
    sets.every(validator);
  const safeSession = (candidate: WorkoutSession) =>
    painFree(candidate.pain) &&
    (!finite(candidate.perceivedExertion) || candidate.perceivedExertion < 9) &&
    (!finite(candidate.energy) || candidate.energy > 2);
  const strengthTarget = activeSets.map(({ set }) => set.repetitions).find(finite);
  const durationTarget = activeSets.map(({ set }) => set.durationSeconds).find(finite);
  const successfulExposures =
    exercise.kind === 'strength'
      ? relevant.filter(
          ({ session: candidate, sets }) =>
            safeSession(candidate) &&
            isCompleteExposure(
              sets,
              (set) =>
                finite(set.actualLoadKg) &&
                finite(set.actualRepetitions) &&
                finite(load) &&
                set.actualLoadKg >= load &&
                (strengthTarget === undefined || set.actualRepetitions >= strengthTarget),
            ),
        )
      : relevant.filter(
          ({ session: candidate, sets }) =>
            safeSession(candidate) &&
            isCompleteExposure(
              sets,
              (set) =>
                finite(set.actualDurationSeconds) &&
                finite(durationTarget) &&
                set.actualDurationSeconds >= durationTarget,
            ),
        );
  const confidence: RecommendationConfidence =
    successfulExposures.length >= 3 ? 'high' : successfulExposures.length >= 2 ? 'medium' : 'low';
  if (successfulExposures.length < 2)
    return base('maintain', 'Deux séances comparables réussies sont nécessaires avant de progresser.', confidence, [
      'insufficient-observations',
    ]);
  if (exercise.kind === 'strength') {
    if (!finite(load))
      return base('maintain', 'La prescription ne contient pas de charge active exploitable.', 'low', ['missing-load']);
    const prescribedLoads = activeSets.map(({ set }) => set.loadKg).filter(finite);
    const prescribedRepetitions = activeSets.map(({ set }) => set.repetitions).filter(finite);
    if (new Set(prescribedLoads).size > 1 || new Set(prescribedRepetitions).size > 1) {
      return base(
        'maintain',
        'Les séries ont des prescriptions différentes : aucune progression uniforme n’est proposée.',
        'low',
        ['heterogeneous-prescription'],
      );
    }
    const repsTarget = activeSets.map(({ set }) => set.repetitions).find(finite);
    const valid = isCompleteExposure(
      latest.sets,
      (set) =>
        finite(set.actualLoadKg) &&
        finite(set.actualRepetitions) &&
        (repsTarget === undefined || set.actualRepetitions >= repsTarget) &&
        set.actualLoadKg >= load,
    );
    if (!valid)
      return base('maintain', 'Les séries n’ont pas validé la charge et les répétitions prescrites.', confidence, [
        'below-target',
      ]);
    const increment =
      (
        {
          'presse-cuisses-inclinee': 5,
          'squat-smith': 2.5,
          'chest-press': 2.5,
          'developpe-couche-machine': 2.5,
          'tirage-horizontal': 2.5,
          'tirage-vertical': 2.5,
          'leg-curl-allonge': 2,
          'leg-extension': 2,
          'developpe-clavicule': 1,
        } as Record<string, number>
      )[exercise.id] ?? 2.5;
    return {
      ...base(
        'increase',
        'Toutes les séries ont atteint la cible sans signal de risque : progression d’un seul palier.',
        confidence,
        ['completed-target', 'comfortable'],
      ),
      suggestedLoadKg: load + increment,
    };
  }
  if (!finite(duration))
    return base('maintain', 'La prescription ne contient pas de durée active exploitable.', 'low', [
      'missing-duration',
    ]);
  const prescribedDurations = activeSets.map(({ set }) => set.durationSeconds).filter(finite);
  if (new Set(prescribedDurations).size > 1)
    return base(
      'maintain',
      'Les séries ont des durées différentes : aucune progression uniforme n’est proposée.',
      confidence,
      ['heterogeneous-prescription'],
    );
  const valid = isCompleteExposure(
    latest.sets,
    (set) => finite(set.actualDurationSeconds) && set.actualDurationSeconds >= duration,
  );
  if (!valid)
    return base('maintain', 'La durée prescrite n’a pas été validée sur toutes les séries.', confidence, [
      'below-target',
    ]);
  const increment = Math.max(15, Math.round(duration * 0.1));
  const cap = finite(options.maxDurationSeconds) ? (options.maxDurationSeconds as number) : duration + increment;
  if (cap <= duration)
    return base('maintain', 'La durée maximale autorisée est déjà atteinte.', confidence, ['duration-cap']);
  return {
    ...base(
      'increase',
      'La durée a été validée avec aisance : on ajoute un petit palier, sans dépasser la limite.',
      confidence,
      ['completed-duration', 'comfortable'],
    ),
    suggestedDurationSeconds: Math.min(cap, duration + increment),
  };
}
