import { describe, expect, it } from 'vitest';
import type { ExercisePrescription, WorkoutSession } from '../domain/types';
import { getAdaptiveAdvice, getExerciseRecommendation } from './coaching';

const session = (overrides: Partial<WorkoutSession> = {}): WorkoutSession => ({
  id: 's1',
  profileId: 'ottman',
  dayId: 'full-body-a',
  sequenceVersion: 2,
  currentStepIndex: 3,
  startedAt: '2026-09-08T08:00:00.000Z',
  updatedAt: '2026-09-08T09:00:00.000Z',
  completedAt: '2026-09-08T09:00:00.000Z',
  currentExerciseIndex: 0,
  currentSetIndex: 0,
  loggedSets: [],
  ...overrides,
});

const strengthExercise: ExercisePrescription = {
  id: 'presse-cuisses-inclinee',
  name: 'Presse à cuisse inclinée',
  kind: 'strength',
  sets: [
    { repetitions: 10, loadKg: 110, phase: 'working' },
    { repetitions: 10, loadKg: 110, phase: 'working' },
    { repetitions: 10, loadKg: 110, phase: 'working' },
  ],
};

const timedExercise: ExercisePrescription = {
  id: 'rameur',
  name: 'Rameur',
  kind: 'timed',
  sets: [{ durationSeconds: 30 }, { durationSeconds: 30 }, { durationSeconds: 30 }],
};

const completeSets = (exercise: ExercisePrescription) =>
  exercise.sets.map((set, setIndex) => ({
    exerciseId: exercise.id,
    setIndex,
    actualRepetitions: set.repetitions,
    actualDurationSeconds: set.durationSeconds,
    actualLoadKg: set.loadKg,
    completedAt: '2026-09-08T09:00:00.000Z',
  }));

const exposure = (
  id: string,
  exercise: ExercisePrescription,
  overrides: Partial<WorkoutSession> = {},
): WorkoutSession => session({ id, loggedSets: completeSets(exercise), perceivedExertion: 6, energy: 5, ...overrides });

describe('adaptive coaching', () => {
  it('prioritises safety when pain is reported', () => {
    expect(getAdaptiveAdvice([session({ pain: 'Douleur' })])?.recommendation).toBe('reduce');
  });
  it('suggests gradual progression after an easy session', () => {
    expect(getAdaptiveAdvice([session({ perceivedExertion: 5, energy: 5 })])?.recommendation).toBe('increase');
  });
  it('does not invent advice without a completed session', () => {
    expect(getAdaptiveAdvice([])).toBeNull();
  });

  describe('exercise recommendations', () => {
    const options = { profileId: 'ottman' as const, maxDurationSeconds: 90 };

    it.each([
      ['pain', { pain: 'Douleur au genou' }],
      ['low energy', { energy: 1 }],
      ['high effort', { perceivedExertion: 9 }],
      ['incomplete sets', { loggedSets: completeSets(strengthExercise).slice(0, 2) }],
    ])('never increases after %s', (_signal, overrides) => {
      const recommendation = getExerciseRecommendation(
        strengthExercise,
        [exposure('s1', strengthExercise, overrides)],
        options,
      );
      expect(recommendation?.action).not.toBe('increase');
      expect(recommendation?.suggestedLoadKg).toBeUndefined();
    });

    it('keeps the prescription when there is no usable history', () => {
      const recommendation = getExerciseRecommendation(strengthExercise, [], options);
      expect(recommendation).toMatchObject({ action: 'maintain', confidence: 'low', safety: false });
      expect(recommendation?.suggestedLoadKg).toBeUndefined();
    });

    it('ignores completed exposures from another profile', () => {
      const recommendation = getExerciseRecommendation(
        strengthExercise,
        [exposure('laura', strengthExercise, { profileId: 'laura' })],
        options,
      );
      expect(recommendation).toMatchObject({ action: 'maintain', confidence: 'low' });
      expect(recommendation?.signals).not.toContain('profile');
    });

    it('stays neutral when the prescription has no active load', () => {
      const exerciseWithoutLoad: ExercisePrescription = {
        ...strengthExercise,
        sets: strengthExercise.sets.map(({ repetitions, phase }) => ({ repetitions, phase })),
      };
      const recommendation = getExerciseRecommendation(exerciseWithoutLoad, [], options);
      expect(recommendation).toMatchObject({ action: 'maintain', confidence: 'low' });
      expect(recommendation?.suggestedLoadKg).toBeUndefined();
    });

    it('does not recover an older success after a newer failed exposure', () => {
      const olderSuccess = exposure('old', strengthExercise, {
        completedAt: '2026-09-01T09:00:00.000Z',
      });
      const newerFailure = exposure('new', strengthExercise, {
        completedAt: '2026-09-08T09:00:00.000Z',
        perceivedExertion: 10,
      });
      const recommendation = getExerciseRecommendation(strengthExercise, [olderSuccess, newerFailure], options);
      expect(recommendation?.action).not.toBe('increase');
    });

    it('recommends duration rather than load for timed exercises', () => {
      const recommendation = getExerciseRecommendation(timedExercise, [exposure('timed', timedExercise)], options);
      expect(recommendation?.suggestedLoadKg).toBeUndefined();
      expect(recommendation?.suggestedDurationSeconds).toBeGreaterThan(30);
      expect(recommendation?.suggestedDurationSeconds).toBeLessThanOrEqual(90);
    });
  });
});
