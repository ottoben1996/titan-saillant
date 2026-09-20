import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RestTimer } from './RestTimer';

describe('RestTimer', () => {
  it('renders countdown, skip action, Pause and the mockup rest actions', () => {
    const onStateChange = vi.fn();
    const onDone = vi.fn();

    render(
      <RestTimer
        exerciseId="press"
        setIndex={0}
        seconds={90}
        suspended={false}
        onStateChange={onStateChange}
        onDone={onDone}
      />,
    );

    expect(screen.getByText('01:30')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Passer le repos' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retirer 15 secondes/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ajouter 15 secondes/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /marquer la série/i })).toBeInTheDocument();
  });

  it('adjusts remaining time by 15 seconds in either direction', () => {
    const onStateChange = vi.fn();
    const onDone = vi.fn();

    render(
      <RestTimer
        exerciseId="press"
        setIndex={0}
        seconds={60}
        suspended={false}
        onStateChange={onStateChange}
        onDone={onDone}
      />,
    );

    expect(screen.getByText('01:00')).toBeInTheDocument();

    const removeBtn = screen.getByRole('button', { name: /retirer 15 secondes/i });
    fireEvent.click(removeBtn);
    expect(screen.getByText('00:45')).toBeInTheDocument();

    const addBtn = screen.getByRole('button', { name: /ajouter 15 secondes/i });
    fireEvent.click(addBtn);
    expect(screen.getByText('01:30')).toBeInTheDocument();
  });

  it('terminates rest when clicking Passer', () => {
    const onStateChange = vi.fn();
    const onDone = vi.fn();

    render(
      <RestTimer
        exerciseId="press"
        setIndex={0}
        seconds={60}
        suspended={false}
        onStateChange={onStateChange}
        onDone={onDone}
      />,
    );

    const skipBtn = screen.getByRole('button', { name: /passer/i });
    fireEvent.click(skipBtn);

    expect(onStateChange).toHaveBeenCalledWith(null);
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
