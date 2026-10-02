import type { ExercisePrescription, LoggedSet, ProfileId, WorkoutDay, WorkoutSession } from '../domain/types';

export type RunnerStep = {
  kind: 'exercise' | 'complete';
  exerciseIndex?: number;
  setIndex?: number;
  sequenceIndex?: number;
};

const cooldownExercise = (day: WorkoutDay): ExercisePrescription => ({
  // La séance cardio supplémentaire reprend le retour au calme cardio déjà documenté.
  id: day.id === 'cardio-4' ? 'cooldown-cardio' : `cooldown-${day.id}`,
  name: day.cooldown.name,
  kind: 'cooldown',
  sets: [
    {
      durationSeconds: day.cooldown.durationSeconds,
      loadLabel: day.cooldown.loadLabel,
    },
  ],
  notes: day.cooldown.loadLabel,
});

export function getWorkoutExercises(day: WorkoutDay, session?: WorkoutSession): readonly ExercisePrescription[] {
  if (session && session.sequenceVersion !== 2) return day.exercises;
  return [...(day.warmup ?? []), ...day.exercises, cooldownExercise(day)];
}

export function getWorkoutSteps(day: WorkoutDay, session?: WorkoutSession): readonly RunnerStep[] {
  const exercises = getWorkoutExercises(day, session);
  const steps: RunnerStep[] = [];
  let exerciseIndex = 0;

  while (exerciseIndex < exercises.length) {
    const exercise = exercises[exerciseIndex];
    if (!exercise.circuitId) {
      exercise.sets.forEach((_, setIndex) => {
        steps.push({ kind: 'exercise', exerciseIndex, setIndex, sequenceIndex: steps.length });
      });
      exerciseIndex += 1;
      continue;
    }

    const circuitId = exercise.circuitId;
    const circuitIndexes: number[] = [];
    while (exerciseIndex < exercises.length && exercises[exerciseIndex].circuitId === circuitId) {
      circuitIndexes.push(exerciseIndex);
      exerciseIndex += 1;
    }
    const rounds = Math.max(...circuitIndexes.map((index) => exercises[index].sets.length));
    for (let setIndex = 0; setIndex < rounds; setIndex += 1) {
      for (const index of circuitIndexes) {
        if (exercises[index].sets[setIndex]) {
          steps.push({ kind: 'exercise', exerciseIndex: index, setIndex, sequenceIndex: steps.length });
        }
      }
    }
  }

  return steps;
}

export function createRunner(day: WorkoutDay, profileId: ProfileId, programWeek?: number): WorkoutSession {
  const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return {
    id,
    profileId,
    dayId: day.id,
    programWeek,
    sequenceVersion: 2,
    currentStepIndex: 0,
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    currentExerciseIndex: 0,
    currentSetIndex: 0,
    loggedSets: [],
  };
}
export function completeSet(
  session: WorkoutSession,
  day: WorkoutDay,
  actual: Omit<LoggedSet, 'completedAt'>,
): WorkoutSession {
  const current = getNextStep(session, day);
  if (
    current.kind !== 'exercise' ||
    current.exerciseIndex === undefined ||
    current.setIndex === undefined ||
    actual.exerciseId !== getWorkoutExercises(day, session)[current.exerciseIndex]?.id ||
    actual.setIndex !== current.setIndex
  ) {
    return session;
  }
  const next = structuredClone(session) as WorkoutSession;
  next.loggedSets.push({ ...actual, completedAt: new Date().toISOString() });
  next.activeTimer = undefined;
  if (next.sequenceVersion === 2) {
    const steps = getWorkoutSteps(day, next);
    const nextIndex = (next.currentStepIndex ?? 0) + 1;
    next.currentStepIndex = nextIndex;
    const nextStep = steps[nextIndex];
    if (!nextStep || nextStep.kind === 'complete') {
      next.completedAt = new Date().toISOString();
    } else {
      next.currentExerciseIndex = nextStep.exerciseIndex ?? 0;
      next.currentSetIndex = nextStep.setIndex ?? 0;
    }
  } else {
    const exercise = day.exercises[next.currentExerciseIndex];
    if (next.currentSetIndex + 1 < exercise.sets.length) next.currentSetIndex += 1;
    else if (next.currentExerciseIndex + 1 < day.exercises.length) {
      next.currentExerciseIndex += 1;
      next.currentSetIndex = 0;
    } else next.completedAt = new Date().toISOString();
  }
  next.updatedAt = new Date().toISOString();
  return next;
}
export function getNextStep(session: WorkoutSession, day?: WorkoutDay): RunnerStep {
  if (session.completedAt) return { kind: 'complete' };
  if (session.sequenceVersion === 2 && day) {
    return getWorkoutSteps(day, session)[session.currentStepIndex ?? 0] ?? { kind: 'complete' };
  }
  return { kind: 'exercise', exerciseIndex: session.currentExerciseIndex, setIndex: session.currentSetIndex };
}
