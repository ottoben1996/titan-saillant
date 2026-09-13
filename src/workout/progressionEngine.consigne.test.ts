import { describe, expect, it } from 'vitest';
import { demandeAllegement, computeProgressiveOverload } from './progressionEngine';
import type { ExercisePrescription, LoadConsigne, WorkoutSession } from '../domain/types';

const exercice: ExercisePrescription = {
  id: 'presse-cuisses-inclinee',
  name: 'Presse à cuisse inclinée',
  kind: 'strength',
  sets: [
    { repetitions: 10, loadKg: 110, phase: 'working' },
    { repetitions: 10, loadKg: 110, phase: 'working' },
    { repetitions: 10, loadKg: 110, phase: 'working' },
  ],
};

const seance = (options: {
  rpe?: number;
  pain?: string;
  consigne?: LoadConsigne;
  repetitions?: number;
  charge?: number;
}): WorkoutSession =>
  ({
    id: 'sess-1',
    profileId: 'ottman',
    dayId: 'full-body-a',
    sequenceVersion: 2,
    startedAt: '2026-09-08T10:00:00Z',
    completedAt: '2026-09-08T11:00:00Z',
    updatedAt: '2026-09-08T11:00:00Z',
    currentExerciseIndex: 0,
    currentSetIndex: 0,
    perceivedExertion: options.rpe,
    pain: options.pain,
    loadConsigne: options.consigne,
    loggedSets: [0, 1, 2].map((setIndex) => ({
      exerciseId: 'presse-cuisses-inclinee',
      setIndex,
      actualRepetitions: options.repetitions ?? 10,
      actualLoadKg: options.charge ?? 110,
      completedAt: '',
    })),
  }) as WorkoutSession;

describe('la consigne du quiz entre dans la décision', () => {
  it('la valide comme une aisance quand l’athlète a demandé à charger plus', () => {
    const suggestion = computeProgressiveOverload(exercice, [seance({ rpe: 9, consigne: 'increase' })]);

    expect(suggestion).not.toBeNull();
    expect(suggestion?.suggestedLoadKg).toBe(115);
    expect(suggestion?.source).toBe('demande');
    expect(suggestion?.reason).toMatch(/tu as demandé/i);
  });

  it('n’autorise jamais à progresser après une gêne, même demandé', () => {
    expect(computeProgressiveOverload(exercice, [seance({ rpe: 9, pain: 'Douleur', consigne: 'increase' })])).toBeNull();
  });

  it('bloque la progression quand l’athlète a demandé d’alléger', () => {
    const seanceAllégée = seance({ rpe: 6, consigne: 'decrease' });

    expect(computeProgressiveOverload(exercice, [seanceAllégée])).toBeNull();
    expect(demandeAllegement(exercice, [seanceAllégée])).toBe(true);
  });

  it('distingue une progression due à l’aisance d’une progression demandée', () => {
    const suggestion = computeProgressiveOverload(exercice, [seance({ rpe: 6, consigne: 'increase' })]);
    expect(suggestion?.source).toBe('aisance');
  });

  it('ne détecte aucun allègement quand rien n’a été demandé', () => {
    expect(demandeAllegement(exercice, [seance({ rpe: 6 })])).toBe(false);
    expect(demandeAllegement(exercice, [])).toBe(false);
  });
});
