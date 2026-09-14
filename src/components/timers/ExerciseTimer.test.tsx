import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ExerciseTimer } from './ExerciseTimer';

describe('ExerciseTimer (Compteur Tempo)', () => {
  it('renders initial tempo countdown and has a Passer button', () => {
    const onStateChange = vi.fn();
    const onDone = vi.fn();
    const onSkip = vi.fn();

    render(
      <ExerciseTimer
        exerciseId="bosu"
        setIndex={0}
        durationSeconds={40}
        suspended={false}
        onStateChange={onStateChange}
        onDone={onDone}
        onSkip={onSkip}
      />,
    );

    expect(screen.getByText('COMPTEUR TEMPO')).toBeInTheDocument();
    expect(screen.getByText('00:40')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /passer/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /démarrer/i })).toBeInTheDocument();
  });

  it('triggers onSkip and onDone when clicking Passer', () => {
    const onStateChange = vi.fn();
    const onDone = vi.fn();
    const onSkip = vi.fn();

    render(
      <ExerciseTimer
        exerciseId="bosu"
        setIndex={0}
        durationSeconds={40}
        suspended={false}
        onStateChange={onStateChange}
        onDone={onDone}
        onSkip={onSkip}
      />,
    );

    const skipButton = screen.getByRole('button', { name: /passer/i });
    fireEvent.click(skipButton);

    expect(onSkip).toHaveBeenCalledTimes(1);
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Temps terminé')).toBeInTheDocument();
  });

  it('toggles start and pause properly', () => {
    const onStateChange = vi.fn();
    const onDone = vi.fn();

    render(
      <ExerciseTimer
        exerciseId="bosu"
        setIndex={0}
        durationSeconds={30}
        suspended={false}
        onStateChange={onStateChange}
        onDone={onDone}
      />,
    );

    const startBtn = screen.getByRole('button', { name: /démarrer/i });
    fireEvent.click(startBtn);

    expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
  });
});
