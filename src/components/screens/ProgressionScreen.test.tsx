import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { WorkoutSession } from '../../domain/types';
import { ProgressionScreen } from './ProgressionScreen';

const seance = (): WorkoutSession => {
  const at = new Date().toISOString();
  return {
    id: 's1',
    profileId: 'ottman',
    dayId: 'full-body-a',
    startedAt: at,
    updatedAt: at,
    completedAt: at,
    currentExerciseIndex: 0,
    currentSetIndex: 0,
    loggedSets: [
      {
        exerciseId: 'developpe-couche-machine',
        setIndex: 1,
        actualLoadKg: 60,
        actualRepetitions: 10,
        completedAt: at,
      },
    ],
  };
};

describe('ProgressionScreen — en-tête', () => {
  it('expose le changement de profil dans un seul contrôle segmenté', () => {
    const onSwitchDuoProfile = vi.fn();
    render(
      <ProgressionScreen
        history={[]}
        profile="laura"
        measurements={[]}
        onNavigate={vi.fn()}
        onOpenFollowup={vi.fn()}
        onOpenExercise={vi.fn()}
        onOpenBlock={vi.fn()}
        onSwitchDuoProfile={onSwitchDuoProfile}
      />,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Progrès' })).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: /profil affiché/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Ottman' })).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByRole('radio', { name: 'Laura' })).toHaveAttribute('aria-checked', 'true');

    fireEvent.click(screen.getByRole('radio', { name: 'Ottman' }));
    expect(onSwitchDuoProfile).toHaveBeenCalledWith('ottman');
  });

  it('bascule vers les vues sœurs et n’affiche plus de retour à l’accueil', () => {
    const onNavigate = vi.fn();
    render(
      <ProgressionScreen
        history={[]}
        profile="ottman"
        measurements={[]}
        onNavigate={onNavigate}
        onOpenFollowup={vi.fn()}
        onOpenExercise={vi.fn()}
        onOpenBlock={vi.fn()}
      />,
    );

    expect(screen.getByRole('radio', { name: 'Tendances' })).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(screen.getByRole('radio', { name: 'Historique' }));
    expect(onNavigate).toHaveBeenCalledWith('history');
    expect(screen.queryByRole('button', { name: /accueil/i })).not.toBeInTheDocument();
  });

  it('ouvre la fiche d’un record et la revue de bloc', () => {
    const onOpenExercise = vi.fn();
    const onOpenBlock = vi.fn();
    render(
      <ProgressionScreen
        history={[seance()]}
        profile="ottman"
        measurements={[]}
        onNavigate={vi.fn()}
        onOpenFollowup={vi.fn()}
        onOpenExercise={onOpenExercise}
        onOpenBlock={onOpenBlock}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Voir la fiche de/i }));
    expect(onOpenExercise).toHaveBeenCalledWith('developpe-couche-machine');

    fireEvent.click(screen.getByRole('button', { name: /Revue des 8 dernières semaines/i }));
    expect(onOpenBlock).toHaveBeenCalledTimes(1);
  });
});
