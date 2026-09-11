import { describe, expect, it } from 'vitest';
import { getWorkoutExercises, getWorkoutModeLabel } from './workoutAdaptation';
import { trainingPlan } from './plan';

describe('MUSTAPHA workout adaptations', () => {
  const day = trainingPlan.weeks[0].days[0];

  it('keeps the complete prescription in full mode', () => {
    expect(getWorkoutExercises(day, 'full')).toHaveLength(day.exercises.length);
  });

  it('offers a shorter session without mutating prescriptions', () => {
    const before = day.exercises.length;
    const short = getWorkoutExercises(day, 'short');
    expect(short.length).toBeLessThan(before);
    expect(day.exercises).toHaveLength(before);
    expect(Object.isFrozen(day.exercises)).toBe(true);
  });

  it('labels the available modes clearly', () => {
    expect(getWorkoutModeLabel('short')).toMatch(/15|courte/i);
    expect(getWorkoutModeLabel('adapted')).toMatch(/adapt/i);
  });
});
