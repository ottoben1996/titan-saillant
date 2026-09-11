import { describe, expect, it } from 'vitest';
import { getProgram } from '../domain/programs';
import type { ExercisePrescription, LoggedSet, WorkoutDay, WorkoutSession } from '../domain/types';
import { completeSet, createRunner, getNextStep, getWorkoutExercises, getWorkoutSteps } from './runner';

/** Construit un exercice minimal, avec un nombre de séries donné. */
const ex = (id: string, sets: number, circuitId?: string): ExercisePrescription => ({
  id,
  name: id,
  kind: 'strength',
  sets: Array.from({ length: sets }, () => ({ repetitions: 10, loadKg: 10 })),
  ...(circuitId ? { circuitId } : {}),
});

const makeDay = (overrides: Partial<WorkoutDay> = {}): WorkoutDay => ({
  id: 'full-body-a',
  name: 'Jour de test',
  subtitle: '',
  exercises: [ex('exercice-a', 2)],
  cooldown: { name: 'Retour au calme', durationSeconds: 60 },
  ...overrides,
});

/** Fait avancer une séance jusqu'à la fin (garde-fou anti-boucle infinie). */
function runToEnd(day: WorkoutDay, session: WorkoutSession): WorkoutSession {
  let current = session;
  let guard = 0;
  for (;;) {
    const step = getNextStep(current, day);
    if (step.kind !== 'exercise') return current;
    const exercise = getWorkoutExercises(day, current)[step.exerciseIndex!];
    current = completeSet(current, day, { exerciseId: exercise.id, setIndex: step.setIndex! });
    if (++guard > 500) throw new Error('La séance ne converge pas');
  }
}

const today = (): string => new Date().toISOString();

/** Séance minimale brute, pour partir d'un état précis. */
function rawSession(overrides: Partial<WorkoutSession> = {}): WorkoutSession {
  return {
    id: 'session-1',
    profileId: 'ottman',
    dayId: 'full-body-a',
    sequenceVersion: 2,
    currentStepIndex: 0,
    currentExerciseIndex: 0,
    currentSetIndex: 0,
    startedAt: today(),
    updatedAt: today(),
    loggedSets: [],
    ...overrides,
  };
}

const logSet = (exerciseId: string, setIndex: number): Omit<LoggedSet, 'completedAt'> => ({ exerciseId, setIndex });

describe('workout runner — cas limites', () => {
  it('déroule une séance complète sans échauffement et termine sur le retour au calme', () => {
    const day = makeDay({ exercises: [ex('exercice-a', 2), ex('exercice-b', 1)], warmup: undefined });
    const exercises = getWorkoutExercises(day, createRunner(day, 'ottman'));

    // Pas d'échauffement prescrit : seuls les exercices + le retour au calme synthétique.
    expect(exercises.map((item) => item.id)).toEqual(['exercice-a', 'exercice-b', 'cooldown-full-body-a']);

    const steps = getWorkoutSteps(day, createRunner(day, 'ottman'));
    expect(steps.map((step) => exercises[step.exerciseIndex!].id)).toEqual([
      'exercice-a', 'exercice-a', 'exercice-b', 'cooldown-full-body-a',
    ]);

    const finished = runToEnd(day, createRunner(day, 'ottman'));
    expect(finished.completedAt).toBeDefined();
    expect(finished.loggedSets).toHaveLength(4);
    expect(getNextStep(finished, day)).toEqual({ kind: 'complete' });
  });

  it('altère (interleave) les exercices en circuit round par round', () => {
    const day = makeDay({
      exercises: [ex('circuit-a', 3, 'bloc-1'), ex('circuit-b', 3, 'bloc-1')],
      warmup: undefined,
    });
    const exercises = getWorkoutExercises(day, createRunner(day, 'ottman'));
    const steps = getWorkoutSteps(day, createRunner(day, 'ottman'));

    expect(steps.map((step) => exercises[step.exerciseIndex!].id)).toEqual([
      'circuit-a', 'circuit-b', 'circuit-a', 'circuit-b', 'circuit-a', 'circuit-b', 'cooldown-full-body-a',
    ]);
    expect(steps.slice(0, 6).map((step) => step.setIndex)).toEqual([0, 0, 1, 1, 2, 2]);
  });

  it('gère un circuit dont les exercices ont un nombre de séries inégal', () => {
    const day = makeDay({
      exercises: [ex('circuit-a', 3, 'bloc-1'), ex('circuit-b', 2, 'bloc-1')],
      warmup: undefined,
    });
    const exercises = getWorkoutExercises(day, createRunner(day, 'ottman'));
    const steps = getWorkoutSteps(day, createRunner(day, 'ottman'));

    // 3 rounds : le second exercice n'a pas de 3e série, il est simplement omis.
    expect(steps.map((step) => exercises[step.exerciseIndex!].id)).toEqual([
      'circuit-a', 'circuit-b', 'circuit-a', 'circuit-b', 'circuit-a', 'cooldown-full-body-a',
    ]);
  });

  it('reprend une séance depuis un index de step intermédiaire', () => {
    const day = getProgram('ottman').days[0];
    const steps = getWorkoutSteps(day, createRunner(day, 'ottman'));
    const target = 5;

    const session = rawSession({
      currentStepIndex: target,
      currentExerciseIndex: steps[target].exerciseIndex,
      currentSetIndex: steps[target].setIndex,
    });
    expect(getNextStep(session, day)).toMatchObject(steps[target]);

    const exercises = getWorkoutExercises(day, session);
    const next = completeSet(
      session,
      day,
      logSet(exercises[steps[target].exerciseIndex!].id, steps[target].setIndex!),
    );
    expect(next.currentStepIndex).toBe(target + 1);
    expect(getNextStep(next, day)).toMatchObject(steps[target + 1]);
  });

  it("dernier exercice du dernier bloc : la planche précède le retour au calme", () => {
    const day = getProgram('ottman').days[0];
    const exercises = getWorkoutExercises(day, createRunner(day, 'ottman'));
    const steps = getWorkoutSteps(day, createRunner(day, 'ottman'));

    const lastExerciseStep = steps.at(-2)!;
    const cooldownStep = steps.at(-1)!;
    expect(exercises[lastExerciseStep.exerciseIndex!].id).toBe('gainage-planche');
    expect(lastExerciseStep.setIndex).toBe(2);
    expect(exercises[cooldownStep.exerciseIndex!].id).toBe('cooldown-full-body-a');
  });

  it('déroule le jour cardio dont les 4 circuits s’enchaînent', () => {
    const day = getProgram('ottman').days[2];
    const session = createRunner(day, 'ottman');
    const exercises = getWorkoutExercises(day, session);
    const steps = getWorkoutSteps(day, session);

    // 3 exercices d'échauffement (coiffe, bosu, vélo) puis le premier circuit.
    expect(exercises.slice(0, 5).map((item) => item.id)).toEqual([
      'coiffe-rotateurs', 'bosu', 'velo', 'jumping-jack', 'mountain-climber',
    ]);
    const circuit1 = steps
      .map((step) => exercises[step.exerciseIndex!].id)
      .filter((id) => id === 'jumping-jack' || id === 'mountain-climber');
    expect(circuit1).toEqual([
      'jumping-jack', 'mountain-climber', 'jumping-jack', 'mountain-climber', 'jumping-jack', 'mountain-climber',
    ]);

    const finished = runToEnd(day, session);
    expect(finished.completedAt).toBeDefined();
    expect(getNextStep(finished, day)).toEqual({ kind: 'complete' });
  });

  it('renvoie « complete » pour un index de step hors bornes, sans planter', () => {
    const day = makeDay();
    for (const index of [9999, -1]) {
      const session = rawSession({ currentStepIndex: index });
      expect(getNextStep(session, day)).toEqual({ kind: 'complete' });
      expect(completeSet(session, day, logSet('exercice-a', 0))).toBe(session);
    }
  });

  it('ignore une série déjà validée (double soumission)', () => {
    const day = makeDay({ exercises: [ex('exercice-a', 2)], warmup: undefined });
    const session = createRunner(day, 'ottman');
    const afterFirst = completeSet(session, day, logSet('exercice-a', 0));

    expect(afterFirst.currentStepIndex).toBe(1);
    expect(afterFirst.loggedSets).toHaveLength(1);

    // Deuxième soumission identique : le step courant a changé, la série est rejetée.
    const duplicate = completeSet(afterFirst, day, logSet('exercice-a', 0));
    expect(duplicate).toBe(afterFirst);
    expect(duplicate.loggedSets).toHaveLength(1);
  });

  it('rejette une série une fois la séance terminée', () => {
    const day = makeDay({ exercises: [ex('exercice-a', 2)], warmup: undefined });
    const finished = runToEnd(day, createRunner(day, 'ottman'));
    expect(finished.loggedSets).toHaveLength(3);

    const after = completeSet(finished, day, logSet('exercice-a', 0));
    expect(after).toBe(finished);
    expect(after.loggedSets).toHaveLength(3);
  });

  it('reste inerte face à des données de séance corrompues', () => {
    const day = makeDay({ exercises: [ex('exercice-a', 2)], warmup: undefined });

    // Index d'exercice hors bornes en mode séquence v2 : le step est introuvable.
    const corruptV2 = rawSession({ currentStepIndex: 9999, currentExerciseIndex: 42, currentSetIndex: 7 });
    expect(getNextStep(corruptV2, day)).toEqual({ kind: 'complete' });
    expect(completeSet(corruptV2, day, logSet('exercice-a', 0))).toBe(corruptV2);

    // Ancienne séance (séquence 1) pointant sur un exercice inexistant : rejetée.
    const corruptLegacy = rawSession({
      sequenceVersion: undefined,
      currentStepIndex: undefined,
      currentExerciseIndex: 42,
      currentSetIndex: 0,
    });
    expect(getNextStep(corruptLegacy, day)).toEqual({ kind: 'exercise', exerciseIndex: 42, setIndex: 0 });
    expect(completeSet(corruptLegacy, day, logSet('exercice-a', 0))).toBe(corruptLegacy);
  });

  it('fait progresser une ancienne séance (séquence 1) sans échauffement ni cooldown', () => {
    const day = makeDay({ exercises: [ex('exercice-a', 2), ex('exercice-b', 1)], warmup: undefined });
    const legacy = rawSession({
      sequenceVersion: undefined,
      currentStepIndex: undefined,
      currentExerciseIndex: 0,
      currentSetIndex: 0,
    });

    // Compatibilité : une séance v1 ne voit que les exercices prescrits.
    expect(getWorkoutExercises(day, legacy).map((item) => item.id)).toEqual(['exercice-a', 'exercice-b']);

    const afterSet1 = completeSet(legacy, day, logSet('exercice-a', 0));
    expect(afterSet1.currentSetIndex).toBe(1);
    expect(afterSet1.currentExerciseIndex).toBe(0);

    const afterSet2 = completeSet(afterSet1, day, logSet('exercice-a', 1));
    expect(afterSet2.currentExerciseIndex).toBe(1);
    expect(afterSet2.currentSetIndex).toBe(0);

    const done = completeSet(afterSet2, day, logSet('exercice-b', 0));
    expect(done.completedAt).toBeDefined();
    expect(getNextStep(done, day)).toEqual({ kind: 'complete' });
  });

  it('ajoute un retour au calme synthétique pour les séances de séquence 2', () => {
    const day = makeDay();
    const exercises = getWorkoutExercises(day, createRunner(day, 'ottman'));
    const cooldown = exercises.at(-1)!;

    expect(cooldown.id).toBe('cooldown-full-body-a');
    expect(cooldown.kind).toBe('cooldown');
    expect(cooldown.name).toBe('Retour au calme');
    expect(cooldown.sets).toEqual([{ durationSeconds: 60, loadLabel: undefined }]);
  });
});
