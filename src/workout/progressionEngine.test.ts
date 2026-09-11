import { describe, expect, it } from 'vitest';
import { computeProgressiveOverload } from './progressionEngine';
import type { ExercisePrescription, WorkoutSession } from '../domain/types';

describe('computeProgressiveOverload', () => {
  const mockExercise: ExercisePrescription = {
    id: 'presse-cuisses-inclinee',
    name: 'Presse à cuisse inclinée',
    kind: 'strength',
    sets: [
      { repetitions: 10, loadKg: 110, phase: 'working' },
      { repetitions: 10, loadKg: 110, phase: 'working' },
      { repetitions: 10, loadKg: 110, phase: 'working' },
    ],
  };

  it('suggère une augmentation de charge si la dernière séance était complète et avec aisance (RPE <= 7)', () => {
    const mockHistory: WorkoutSession[] = [
      {
        id: 'sess-1',
        profileId: 'ottman',
        dayId: 'full-body-a',
        sequenceVersion: 2,
        startedAt: '2026-09-08T10:00:00Z',
        completedAt: '2026-09-08T11:00:00Z',
        updatedAt: '2026-09-08T11:00:00Z',
        currentExerciseIndex: 0,
        currentSetIndex: 0,
        perceivedExertion: 6,
        pain: 'Aucune',
        loggedSets: [
          { exerciseId: 'presse-cuisses-inclinee', setIndex: 0, actualRepetitions: 10, actualLoadKg: 110, completedAt: '' },
          { exerciseId: 'presse-cuisses-inclinee', setIndex: 1, actualRepetitions: 10, actualLoadKg: 110, completedAt: '' },
          { exerciseId: 'presse-cuisses-inclinee', setIndex: 2, actualRepetitions: 10, actualLoadKg: 110, completedAt: '' },
        ],
      },
    ];

    const suggestion = computeProgressiveOverload(mockExercise, mockHistory);
    expect(suggestion).not.toBeNull();
    expect(suggestion?.suggestedLoadKg).toBe(115); // +5 kg pour presse
    expect(suggestion?.incrementKg).toBe(5);
  });

  it('ne suggère pas daugmentation si la séance a eu un RPE >= 8 ou de la douleur', () => {
    const mockHistoryHard: WorkoutSession[] = [
      {
        id: 'sess-1',
        profileId: 'ottman',
        dayId: 'full-body-a',
        sequenceVersion: 2,
        startedAt: '2026-09-08T10:00:00Z',
        completedAt: '2026-09-08T11:00:00Z',
        updatedAt: '2026-09-08T11:00:00Z',
        currentExerciseIndex: 0,
        currentSetIndex: 0,
        perceivedExertion: 9, // Effort trop dur
        loggedSets: [
          { exerciseId: 'presse-cuisses-inclinee', setIndex: 0, actualRepetitions: 10, actualLoadKg: 110, completedAt: '' },
          { exerciseId: 'presse-cuisses-inclinee', setIndex: 1, actualRepetitions: 10, actualLoadKg: 110, completedAt: '' },
          { exerciseId: 'presse-cuisses-inclinee', setIndex: 2, actualRepetitions: 10, actualLoadKg: 110, completedAt: '' },
        ],
      },
    ];

    const suggestion = computeProgressiveOverload(mockExercise, mockHistoryHard);
    expect(suggestion).toBeNull();
  });
});
