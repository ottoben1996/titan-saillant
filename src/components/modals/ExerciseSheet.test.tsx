import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { WorkoutPlan, WorkoutSession } from '../../domain/types';
import { ExerciseSheet } from './ExerciseSheet';

const programme: WorkoutPlan = {
  profileId: 'ottman',
  displayName: 'Test',
  coach: 'Test',
  warmup: [],
  days: [
    {
      id: 'full-body-a',
      name: 'Full Body A',
      subtitle: '',
      exercises: [
        {
          id: 'leg-press-incline',
          name: 'Presse à cuisses',
          kind: 'strength',
          sets: [
            { repetitions: 10, phase: 'warmup', loadKg: 40 },
            { repetitions: 10, phase: 'working', loadKg: 60 },
          ],
        },
      ],
      cooldown: { name: 'Tapis', durationSeconds: 300 },
    },
  ],
};

const seance = (id: string, daysAgo: number, load: number, reps: number): WorkoutSession => {
  const at = new Date(Date.now() - daysAgo * 86_400_000).toISOString();
  return {
    id,
    profileId: 'ottman',
    dayId: 'full-body-a',
    startedAt: at,
    updatedAt: at,
    completedAt: at,
    currentExerciseIndex: 0,
    currentSetIndex: 0,
    loggedSets: [
      {
        exerciseId: 'leg-press-incline',
        setIndex: 0,
        actualLoadKg: 40,
        actualRepetitions: 10,
        completedAt: at,
      },
      {
        exerciseId: 'leg-press-incline',
        setIndex: 1,
        actualLoadKg: load,
        actualRepetitions: reps,
        completedAt: at,
      },
    ],
  };
};

describe('ExerciseSheet', () => {
  it('affiche le record, la courbe et les passages sans compter l’échauffement', () => {
    render(
      <ExerciseSheet
        exerciseId="leg-press-incline"
        history={[seance('a', 14, 60, 10), seance('b', 7, 70, 10)]}
        program={programme}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Presse à cuisses' })).toBeInTheDocument();
    expect(screen.getByText('1 série × 10 rép.')).toBeInTheDocument();
    expect(screen.getAllByText('70 kg').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/93,3 kg/).length).toBeGreaterThan(0);
    expect(screen.getByRole('img', { name: /Charge la plus lourde à chaque passage/i })).toBeInTheDocument();
    expect(screen.getByText('+10 kg depuis le premier passage')).toBeInTheDocument();
    expect(screen.getAllByText(/kg × 10/)).toHaveLength(2);
  });

  it('ouvre la technique du mouvement depuis la fiche', () => {
    const onTutorial = vi.fn();
    render(
      <ExerciseSheet
        exerciseId="leg-press-incline"
        history={[seance('a', 7, 60, 10)]}
        program={programme}
        onClose={vi.fn()}
        onTutorial={onTutorial}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Voir la technique/i }));
    expect(onTutorial).toHaveBeenCalledWith('leg-press-incline');
  });

  it('explique l’absence de données sans inventer de courbe', () => {
    render(<ExerciseSheet exerciseId="leg-press-incline" history={[]} program={programme} onClose={vi.fn()} />);

    expect(screen.getByText('Aucune charge enregistrée pour ce mouvement.')).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /Charge la plus lourde/i })).not.toBeInTheDocument();
  });

  it('ferme la feuille par le bouton prévu', () => {
    const onClose = vi.fn();
    render(<ExerciseSheet exerciseId="leg-press-incline" history={[]} program={programme} onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: 'Fermer' }));
    expect(onClose).toHaveBeenCalled();
  });
});
