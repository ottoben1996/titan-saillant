import { describe, expect, it } from 'vitest';
import { getProgram } from '../domain/programs';
import type { WorkoutSession } from '../domain/types';
import { getWorkoutExercises, getWorkoutSteps } from './runner';

type Session = WorkoutSession;
const sessionVide = (profileId: 'ottman' | 'laura', dayId: string): Session => ({
  id: 'repos-test',
  profileId,
  dayId: dayId as Session['dayId'],
  sequenceVersion: 2,
  currentStepIndex: 0,
  currentExerciseIndex: 0,
  currentSetIndex: 0,
  startedAt: '',
  updatedAt: '',
  loggedSets: [],
});

describe('prescription de repos du programme PDF', () => {
  it('les échauffements n’en prescrivent aucun', () => {
    const exercises = getWorkoutExercises(getProgram('ottman').days[0], sessionVide('ottman', 'full-body-a'));
    for (const name of ['Coiffe des rotateurs', 'Équilibre sur bosu']) {
      const exercise = exercises.find((item) => item.name === name);
      expect(exercise?.sets.every((item) => item.restSeconds === undefined)).toBe(true);
      expect(exercise?.restAfterSeconds).toBeUndefined();
    }
  });

  it('conserve les repos explicitement prescrits dans les PDF', () => {
    const ottman = getProgram('ottman');
    const laura = getProgram('laura');
    expect(ottman.days[0].exercises.find((item) => item.id === 'souleve-terre-roumain')?.restAfterSeconds).toBe(105);
    expect(ottman.days[1].exercises.find((item) => item.id === 'gainage-pont-pdf')?.restAfterSeconds).toBe(30);
    expect(laura.days[1].exercises.find((item) => item.id === 'gainage-planche-pdf')?.restAfterSeconds).toBe(20);
    expect(laura.days[2].exercises.find((item) => item.id === 'kick-back-pdf')?.restAfterSeconds).toBe(60);
  });

  it('la séance commence bien par un échauffement', () => {
    const day = getProgram('ottman').days[0];
    const steps = getWorkoutSteps(day, sessionVide('ottman', day.id));
    const exercises = getWorkoutExercises(day);
    expect(exercises[steps[0].exerciseIndex ?? 0]?.id).toBe('coiffe-rotateurs');
  });
});
