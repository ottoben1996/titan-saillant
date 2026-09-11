import { describe, expect, it } from 'vitest';
import { getProgram } from '../domain/programs';
import { completeSet, createRunner, getNextStep, getWorkoutExercises, getWorkoutSteps } from './runner';

describe('workout runner', () => {
  it('runs PDF warmup, interleaved circuits and cooldown before completing the session', () => {
    const day = getProgram('ottman').days[0];
    let session = createRunner(day, 'ottman');
    const exercises = getWorkoutExercises(day, session);
    const steps = getWorkoutSteps(day, session);

    expect(steps).toHaveLength(26);
    expect(steps.slice(0, 5).map(step => exercises[step.exerciseIndex!].id)).toEqual([
      'coiffe-rotateurs', 'bosu', 'bosu', 'bosu', 'rameur',
    ]);
    expect(steps.slice(-7, -1).map(step => exercises[step.exerciseIndex!].id)).toEqual([
      'jumping-jack', 'gainage-planche', 'jumping-jack', 'gainage-planche', 'jumping-jack', 'gainage-planche',
    ]);
    expect(exercises[steps.at(-1)?.exerciseIndex ?? 0].id).toBe('cooldown-full-body-a');

    for (const expectedStep of steps) {
      const step = getNextStep(session, day);
      if (step.kind !== 'exercise') break;
      expect(step).toMatchObject(expectedStep);
      session = completeSet(session, day, {
        exerciseId: exercises[step.exerciseIndex!].id,
        setIndex: step.setIndex!,
      });
    }

    expect(session.completedAt).toBeDefined();
    expect(getNextStep(session, day)).toEqual({ kind: 'complete' });
  });

  it('ignores a stale or mismatched set submission', () => {
    const day = getProgram('ottman').days[0];
    const session = createRunner(day, 'ottman');
    const updated = completeSet(session, day, {
      exerciseId: 'mauvais-exercice',
      setIndex: 0,
      actualRepetitions: 10,
    });

    expect(updated).toEqual(session);
    expect(updated.loggedSets).toHaveLength(0);
  });
});
