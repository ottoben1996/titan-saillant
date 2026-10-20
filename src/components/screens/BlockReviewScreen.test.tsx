import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { WeeklyMeasurement } from '../../domain/measurements';
import { getProgram } from '../../domain/programs';
import type { WorkoutSession } from '../../domain/types';
import { BlockReviewScreen } from './BlockReviewScreen';

const at = (daysAgo: number) => new Date(Date.now() - daysAgo * 86_400_000).toISOString();

const programme = getProgram('ottman');
const exercice = programme.days.flatMap((day) => day.exercises).find((item) => item.kind === 'strength');

const seance = (id: string, daysAgo: number, load: number): WorkoutSession => {
  const date = at(daysAgo);
  return {
    id,
    profileId: 'ottman',
    dayId: 'full-body-a',
    startedAt: date,
    updatedAt: date,
    completedAt: date,
    currentExerciseIndex: 0,
    currentSetIndex: 0,
    loggedSets: [
      {
        exerciseId: exercice?.id ?? 'leg-press-incline',
        setIndex: 0,
        actualLoadKg: load,
        actualRepetitions: 10,
        completedAt: date,
      },
    ],
    perceivedExertion: 7,
    energy: 3,
    pain: 'aucune',
  };
};

const mesure = (id: string, daysAgo: number, weightKg: number): WeeklyMeasurement => ({
  id,
  profileId: 'ottman',
  cycle: 1,
  week: 1,
  measuredOn: at(daysAgo),
  weightKg,
});

describe('BlockReviewScreen', () => {
  it('affiche une revue vide sans fabriquer de chiffres', () => {
    render(<BlockReviewScreen profileId="ottman" history={[]} measurements={[]} />);

    expect(screen.getByRole('heading', { name: 'Revue de bloc' })).toBeInTheDocument();
    expect(screen.getByText(/Aucune séance terminée sur les 8 dernières semaines/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Exporter en PDF/i })).toBeInTheDocument();
  });

  it('résume les huit semaines, les charges et les mensurations', () => {
    render(
      <BlockReviewScreen
        profileId="ottman"
        history={[seance('a', 40, 60), seance('b', 20, 70), seance('c', 3, 75)]}
        measurements={[mesure('m1', 45, 100), mesure('m2', 2, 98)]}
      />,
    );

    expect(screen.getByText('3 séances')).toBeInTheDocument();
    expect(screen.getByText('Volume par zone')).toBeInTheDocument();
    expect(screen.getByText('Meilleures charges du bloc')).toBeInTheDocument();
    expect(screen.getAllByText('75 kg').length).toBeGreaterThan(0);
    expect(screen.getByText('Progression par mouvement')).toBeInTheDocument();
    expect(screen.getByText('Mensurations')).toBeInTheDocument();
    expect(screen.getByText('100 kg')).toBeInTheDocument();
    expect(screen.getByText('98 kg')).toBeInTheDocument();
    expect(screen.getByText('Poids')).toBeInTheDocument();
    expect(screen.getByText('Ressenti')).toBeInTheDocument();
    expect(screen.getByText(/RPE moyen 7\/10/)).toBeInTheDocument();
  });
});
