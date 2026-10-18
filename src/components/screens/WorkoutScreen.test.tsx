import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { getProgram } from '../../domain/programs';
import type { SessionTimerState, WorkoutSession } from '../../domain/types';
import { createRunner, getWorkoutExercises, getWorkoutSteps } from '../../workout/runner';
import { WorkoutScreen } from './WorkoutScreen';

const day = getProgram('ottman').days[0];

const sessionFor = (): WorkoutSession => ({
  ...createRunner(day, 'ottman'),
  currentStepIndex:
    getWorkoutSteps(day).find((step) => {
      const exercise = step.exerciseIndex === undefined ? undefined : getWorkoutExercises(day)[step.exerciseIndex];
      return step.kind === 'exercise' && exercise?.sets[step.setIndex ?? 0]?.loadKg !== undefined;
    })?.sequenceIndex ?? 3,
  startedAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

function renderWorkout(overrides: Partial<React.ComponentProps<typeof WorkoutScreen>> = {}) {
  const onCompleteSet = vi.fn().mockResolvedValue(undefined);
  const props: React.ComponentProps<typeof WorkoutScreen> = {
    profile: 'ottman',
    day,
    session: sessionFor(),
    resting: false,
    restSeconds: 0,
    timerSuspended: false,
    onTimerStateChange: (_state: SessionTimerState | null) => undefined,
    onTimerDone: () => undefined,
    onCompleteSet,
    onTutorial: () => undefined,
    onAlternative: () => undefined,
    onSkipExercise: () => undefined,
    onUndoSet: () => undefined,
    onDeferExercise: () => undefined,
    onJumpToExercise: () => undefined,
    onFinish: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  return { ...render(<WorkoutScreen {...props} />), onCompleteSet };
}

describe('WorkoutScreen input ergonomics', () => {
  it('forwards edited repetitions and load unchanged after dense controls are disclosed', async () => {
    const { onCompleteSet } = renderWorkout();

    const reps = screen.getByRole('textbox', { name: 'Répétitions réalisées' });
    const load = screen.getByRole('textbox', { name: 'Charge (kg)' });
    fireEvent.change(reps, { target: { value: '11' } });
    fireEvent.change(load, { target: { value: '22.5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Masquer les réglages détaillés' }));
    expect(screen.queryByRole('textbox', { name: 'Répétitions réalisées' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Afficher les réglages détaillés' }));
    expect(screen.getByRole('textbox', { name: 'Répétitions réalisées' })).toHaveValue('11');
    expect(screen.getByRole('textbox', { name: 'Charge (kg)' })).toHaveValue('22.5');
    fireEvent.click(screen.getByRole('button', { name: 'Valider la série' }));

    await waitFor(() => expect(onCompleteSet).toHaveBeenCalledWith({ repetitions: 11, loadKg: 22.5 }));
  });

  it('keeps the quick path visible and opens advanced inputs without changing values', () => {
    renderWorkout({ quickLogMode: true });

    expect(screen.getByRole('group', { name: 'Actions rapides, mains occupées' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Afficher les réglages détaillés' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Modifier' }));
    expect(screen.getByRole('textbox', { name: 'Répétitions réalisées' })).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Masquer les réglages détaillés' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByRole('textbox', { name: 'Répétitions réalisées' })).toHaveValue('10');
  });
});
