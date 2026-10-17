/**
 * Bilan de la semaine — le document remis au coach.
 *
 * Un seul test, mais qui verrouille un défaut réel : « séances cette semaine »
 * affichait le total de l'historique. Avec quarante séances au compteur, une
 * semaine à trois séances était annoncée « 40 séances enregistrées cette
 * semaine » — dans le PDF que le coach humain reçoit.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { WeeklyMeasurement } from '../../domain/measurements';
import type { WorkoutSession } from '../../domain/types';
import { BilanScreen } from './BilanScreen';

function mesure(overrides: Partial<WeeklyMeasurement> & { id: string }): WeeklyMeasurement {
  return {
    profileId: 'ottman',
    cycle: 1,
    week: 3,
    ...overrides,
  };
}

function seance(id: string, completedAt: string): WorkoutSession {
  return {
    id,
    profileId: 'ottman',
    dayId: 'full-body-a',
    sequenceVersion: 2,
    currentStepIndex: 26,
    startedAt: completedAt,
    updatedAt: completedAt,
    completedAt,
    currentExerciseIndex: 0,
    currentSetIndex: 0,
    loggedSets: [],
  };
}

describe('bilan de la semaine', () => {
  it('compte les séances de la semaine examinée, pas tout l’historique', () => {
    // Fenêtre examinée : du 3 au 10 octobre.
    const previous = mesure({ id: 'm-s2', week: 2, measuredOn: '2026-10-03T08:00:00.000Z', weightKg: 100.5 });
    const current = mesure({ id: 'm-s3', week: 3, measuredOn: '2026-10-10T08:00:00.000Z', weightKg: 100 });

    // Trois séances dans la fenêtre, trente-sept avant.
    const dansLaSemaine = [
      seance('s-1', '2026-10-05T10:00:00.000Z'),
      seance('s-2', '2026-10-07T10:00:00.000Z'),
      seance('s-3', '2026-10-09T10:00:00.000Z'),
    ];
    const anciennes = Array.from({ length: 37 }, (_, index) =>
      seance(`vieux-${index}`, `2026-08-${String((index % 28) + 1).padStart(2, '0')}T10:00:00.000Z`),
    );

    render(
      <BilanScreen
        profileId="ottman"
        measurements={[previous, current]}
        current={current}
        sessions={[...anciennes, ...dansLaSemaine]}
        onBack={() => undefined}
      />,
    );

    expect(screen.getByText(/3 séances enregistrées cette semaine/)).toBeInTheDocument();
    expect(screen.queryByText(/40 séances enregistrées cette semaine/)).toBeNull();
  });
});
