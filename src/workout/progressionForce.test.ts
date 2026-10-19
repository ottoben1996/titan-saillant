import { describe, expect, it } from 'vitest';
import { getProgram } from '../domain/programs';
import type { WorkoutSession } from '../domain/types';
import { progressionForce } from './progressionForce';

const programme = getProgram('ottman');
// Soulevé de terre roumain : une série d'échauffement puis quatre séries de travail.
const seancePresse = (date: string, charge: number, id: string, avecEchauffement = true): WorkoutSession =>
  ({
    id,
    profileId: 'ottman',
    dayId: 'full-body-a',
    sequenceVersion: 2,
    startedAt: date,
    completedAt: date,
    updatedAt: date,
    currentExerciseIndex: 0,
    currentSetIndex: 0,
    loggedSets: [
      ...(avecEchauffement
        ? [
            {
              exerciseId: 'souleve-terre-roumain',
              setIndex: 0,
              actualRepetitions: 10,
              actualLoadKg: 50,
              completedAt: date,
            },
            {
              exerciseId: 'souleve-terre-roumain',
              setIndex: 1,
              actualRepetitions: 10,
              actualLoadKg: 80,
              completedAt: date,
            },
          ]
        : []),
      ...[2, 3, 4].map((setIndex) => ({
        exerciseId: 'souleve-terre-roumain',
        setIndex,
        actualRepetitions: 10,
        actualLoadKg: charge,
        completedAt: date,
      })),
    ],
  }) as WorkoutSession;

const presse = (resultats: ReturnType<typeof progressionForce>) =>
  resultats.find((resultat) => resultat.exerciseId === 'souleve-terre-roumain');

describe('force par exercice', () => {
  it('retient la charge de travail, jamais celle de l’échauffement', () => {
    const resultats = progressionForce([seancePresse('2026-09-01T10:00:00Z', 110, 's1')], programme);

    expect(presse(resultats)?.charges).toEqual([110]);
    expect(presse(resultats)?.dernier).toBe(110);
  });

  it('met les passages bout à bout et calcule l’écart', () => {
    const resultats = progressionForce(
      [
        seancePresse('2026-09-01T10:00:00Z', 110, 's1'),
        seancePresse('2026-09-08T10:00:00Z', 110, 's2'),
        seancePresse('2026-09-15T10:00:00Z', 115, 's3'),
      ],
      programme,
    );

    expect(presse(resultats)?.charges).toEqual([110, 110, 115]);
    expect(presse(resultats)?.ecart).toBe(5);
  });

  it('signale une charge qui n’a pas bougé sur trois passages', () => {
    const resultats = progressionForce(
      [
        seancePresse('2026-09-01T10:00:00Z', 45, 's1'),
        seancePresse('2026-09-08T10:00:00Z', 45, 's2'),
        seancePresse('2026-09-15T10:00:00Z', 45, 's3'),
      ],
      programme,
    );

    expect(presse(resultats)?.stagnation).toBe(true);
  });

  it('ne crie pas à la stagnation sur une progression récente', () => {
    const resultats = progressionForce(
      [
        seancePresse('2026-09-01T10:00:00Z', 110, 's1'),
        seancePresse('2026-09-08T10:00:00Z', 110, 's2'),
        seancePresse('2026-09-15T10:00:00Z', 115, 's3'),
      ],
      programme,
    );

    expect(presse(resultats)?.stagnation).toBe(false);
  });

  it('ignore les séances abandonnées et les exercices jamais faits', () => {
    const abandonnee = { ...seancePresse('2026-09-01T10:00:00Z', 110, 's1'), completedAt: undefined } as WorkoutSession;
    const resultats = progressionForce([abandonnee], programme);

    expect(resultats).toHaveLength(0);
  });
});
