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
    // Sans série chargée, la carte musculaire n'a rien à montrer : elle reste absente.
    expect(screen.queryByText('Volume par zone musculaire')).toBeNull();
  });

  it('montre le volume par zone musculaire quand les séries portent des charges', () => {
    const current = mesure({ id: 'm-s3', week: 3, measuredOn: '2026-10-10T08:00:00.000Z', weightKg: 100 });
    // La fenêtre du bilan est glissante : la séance doit être d'aujourd'hui pour
    // que le test reste vrai quelle que soit la date d'exécution.
    const recent = new Date();
    recent.setHours(10, 0, 0, 0);
    const at = recent.toISOString();
    const avecCharge: WorkoutSession = {
      ...seance('s-charge', at),
      loggedSets: [
        { exerciseId: 'souleve-terre-roumain', setIndex: 0, actualLoadKg: 80, actualRepetitions: 10, completedAt: at },
      ],
    };

    render(
      <BilanScreen
        profileId="ottman"
        measurements={[current]}
        current={current}
        sessions={[avecCharge]}
        onBack={() => undefined}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Volume par zone musculaire' })).toBeInTheDocument();
    // Le soulevé de terre roumain : ischio-jambiers et fessiers moteurs, la
    // charge se partage aussi vers les synergistes.
    expect(screen.getAllByText('Ischio-jambiers').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Fessiers').length).toBeGreaterThan(0);
    expect(screen.getByRole('img', { name: 'Sept derniers jours' })).toBeInTheDocument();
    expect(screen.getAllByText(/kg·rép\./).length).toBeGreaterThan(0);
  });
});
