import { describe, expect, it } from 'vitest';
import { getAdaptiveAdvice } from './coaching';
import type { WorkoutSession } from '../domain/types';

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
});
