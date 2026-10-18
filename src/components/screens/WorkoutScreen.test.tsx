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
      return step.kind === 'exercise' && exercise?.sets[step.setIndex ?? 0]?.phase !== 'warmup' && exercise?.sets[step.setIndex ?? 0]?.loadKg !== undefined;
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

function completedHistoryForCurrentExercise(): WorkoutSession[] {
  const base = sessionFor();
  const currentStep = getWorkoutSteps(day).find((step) => step.sequenceIndex === base.currentStepIndex);
  const exercise = getWorkoutExercises(day)[currentStep?.exerciseIndex ?? 0];
  const loggedSets = exercise.sets
    .map((set, setIndex) => ({ set, setIndex }))
    .filter(({ set }) => set.phase !== 'warmup')
    .map(({ set, setIndex }) => ({
      exerciseId: exercise.id,
      setIndex,
      actualLoadKg: set.loadKg,
      actualRepetitions: set.repetitions,
      actualDurationSeconds: set.durationSeconds,
      completedAt: '2026-09-01T09:00:00.000Z',
    }));
  return [
    { ...base, id: 'history-1', completedAt: '2026-09-01T09:00:00.000Z', loggedSets },
    { ...base, id: 'history-2', completedAt: '2026-09-02T09:00:00.000Z', loggedSets },
  ];
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

  it('shows a safe recommendation and applies only the current input', () => {
    renderWorkout({ history: completedHistoryForCurrentExercise() });

    expect(screen.getByRole('region', { name: 'Recommandation du coach' })).toHaveTextContent('Confiance : moyenne');
    fireEvent.click(screen.getByRole('button', { name: 'Appliquer à cette séance' }));
    expect(screen.getByRole('textbox', { name: 'Charge (kg)' })).toHaveValue('115');
    expect(screen.getByRole('textbox', { name: 'Répétitions réalisées' })).toHaveValue('10');
  });

  it('keeps the prescription when the recommendation is dismissed', () => {
    renderWorkout({ history: completedHistoryForCurrentExercise() });

    const load = screen.getByRole('textbox', { name: 'Charge (kg)' });
    expect(load).toHaveValue('110');
    fireEvent.click(screen.getByRole('button', { name: 'Garder la prescription' }));
    expect(screen.queryByRole('region', { name: 'Recommandation du coach' })).toBeNull();
    expect(load).toHaveValue('110');
  });

  it('shows safety guidance instead of an increase after pain', () => {
    const [history] = completedHistoryForCurrentExercise();
    renderWorkout({ history: [{ ...history, pain: 'Douleur au genou' }, history] });

    expect(screen.getByRole('region', { name: 'Recommandation du coach' })).toHaveTextContent('Priorité à la sécurité');
    expect(screen.queryByRole('button', { name: 'Appliquer à cette séance' })).toBeNull();
  });

  it('applies a timed recommendation to the active timer', () => {
    const timedExerciseIndex = getWorkoutExercises(day).findIndex((candidate) => candidate.kind === 'timed');
    expect(timedExerciseIndex).toBeGreaterThanOrEqual(0);
    const timedExercise = getWorkoutExercises(day)[timedExerciseIndex]!;
    const timedStep = getWorkoutSteps(day).find(
      (candidate) => candidate.exerciseIndex === timedExerciseIndex && candidate.kind === 'exercise',
    );
    expect(timedStep).toBeDefined();
    const base = sessionFor();
    const timedSession = { ...base, currentStepIndex: timedStep!.sequenceIndex };
    const loggedSets = timedExercise.sets.map((set, setIndex) => ({
      exerciseId: timedExercise.id,
      setIndex,
      actualDurationSeconds: set.durationSeconds,
      completedAt: '2026-09-01T09:00:00.000Z',
    }));
    const history = [
      { ...timedSession, id: 'timed-1', completedAt: '2026-09-01T09:00:00.000Z', loggedSets },
      { ...timedSession, id: 'timed-2', completedAt: '2026-09-02T09:00:00.000Z', loggedSets },
    ];

    renderWorkout({ session: timedSession, history });

    expect(screen.getByText(`00:${String(timedExercise.sets[0].durationSeconds).padStart(2, '0')}`)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Appliquer à cette séance' }));
    const baseDuration = timedExercise.sets[0]!.durationSeconds!;
    const suggestedDuration = baseDuration + Math.max(15, Math.round(baseDuration * 0.1));
    expect(screen.getByText(`00:${String(suggestedDuration).padStart(2, '0')}`)).toBeInTheDocument();
  });
});
