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
      return (
        step.kind === 'exercise' &&
        exercise?.sets[step.setIndex ?? 0]?.phase !== 'warmup' &&
        exercise?.sets[step.setIndex ?? 0]?.loadKg !== undefined
      );
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
    onOpenExercise: () => undefined,
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
  it('forwards edited repetitions and load from the quick path, fine steps folded', async () => {
    const { onCompleteSet } = renderWorkout();

    // Chemin rapide : les deux champs sont visibles sans rien déplier.
    const reps = screen.getByRole('textbox', { name: 'Répétitions réalisées' });
    const load = screen.getByRole('textbox', { name: 'Charge (kg)' });
    fireEvent.change(reps, { target: { value: '11' } });
    fireEvent.change(load, { target: { value: '22.5' } });

    // Les paliers fins sont repliés : seul le gros palier est atteignable.
    const reglages = screen.getByRole('button', { name: /réglages fins/i });
    expect(reglages).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getAllByRole('button', { name: /diminuer la charge de/i })).toHaveLength(1);
    fireEvent.click(reglages);
    expect(reglages).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getAllByRole('button', { name: /diminuer la charge de/i })).toHaveLength(2);
    expect(screen.getByRole('textbox', { name: 'Répétitions réalisées' })).toHaveValue('11');
    expect(screen.getByRole('textbox', { name: 'Charge (kg)' })).toHaveValue('22.5');
    fireEvent.click(screen.getByRole('button', { name: 'Valider la série' }));

    await waitFor(() => expect(onCompleteSet).toHaveBeenCalledWith({ repetitions: 11, loadKg: 22.5 }));
  });

  it('offers the undo pill for a few seconds after validating', async () => {
    const onUndoSet = vi.fn();
    renderWorkout({ onUndoSet });

    fireEvent.click(screen.getByRole('button', { name: 'Valider la série' }));
    const annuler = await screen.findByRole('button', { name: /annuler la série \d+/i });
    expect(screen.getByText(/série \d+ validée/i)).toBeInTheDocument();
    fireEvent.click(annuler);
    expect(onUndoSet).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: /annuler la série \d+/i })).toBeNull();
  });

  it('keeps secondary actions in the « Plus d’options » sheet', () => {
    renderWorkout();

    expect(screen.queryByRole('button', { name: /je ne peux pas faire cet exercice/i })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /plus d.options/i }));
    expect(screen.getByRole('button', { name: /je ne peux pas faire cet exercice/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /voir le plan de séance/i })).toBeInTheDocument();
  });

  it('announces the next set when the movement repeats, the next movement otherwise', () => {
    const steps = getWorkoutSteps(day);
    const exercises = getWorkoutExercises(day);
    const repeated = steps.find(
      (candidate, index) =>
        candidate.kind === 'exercise' && steps[index + 1]?.exerciseIndex === candidate.exerciseIndex,
    );
    expect(repeated).toBeDefined();
    const following = steps[repeated!.sequenceIndex! + 1]!;

    const { unmount } = renderWorkout({ session: { ...sessionFor(), currentStepIndex: repeated!.sequenceIndex } });
    expect(screen.getByText(/^Ensuite/)).toHaveTextContent(`Ensuite : série ${following.setIndex! + 1}`);
    unmount();

    const changing = steps.find(
      (candidate, index) =>
        candidate.kind === 'exercise' &&
        steps[index + 1]?.exerciseIndex !== undefined &&
        steps[index + 1]?.exerciseIndex !== candidate.exerciseIndex,
    );
    expect(changing).toBeDefined();
    const nextName = exercises[steps[changing!.sequenceIndex! + 1]!.exerciseIndex!]!.name;
    renderWorkout({ session: { ...sessionFor(), currentStepIndex: changing!.sequenceIndex } });
    expect(screen.getByText(/^Ensuite/)).toHaveTextContent(`Ensuite : ${nextName}`);
  });

  it('hides the recommendation when it only keeps the prescription', () => {
    renderWorkout();

    expect(screen.queryByRole('region', { name: 'Recommandation du coach' })).toBeNull();
  });

  it('shows a safe recommendation and applies only the current input', () => {
    renderWorkout({ history: completedHistoryForCurrentExercise() });

    expect(screen.getByRole('region', { name: 'Recommandation du coach' })).toHaveTextContent('Confiance : moyenne');
    fireEvent.click(screen.getByRole('button', { name: 'Appliquer à cette séance' }));
    expect(Number(screen.getByRole('textbox', { name: 'Charge (kg)' }).getAttribute('value'))).toBeGreaterThan(40);
    expect(screen.getByRole('textbox', { name: 'Répétitions réalisées' })).toHaveValue('12');
  });

  it('keeps the prescription when the recommendation is dismissed', () => {
    renderWorkout({ history: completedHistoryForCurrentExercise() });

    const load = screen.getByRole('textbox', { name: 'Charge (kg)' });
    expect(load).toHaveValue('40');
    fireEvent.click(screen.getByRole('button', { name: 'Garder la prescription' }));
    expect(screen.queryByRole('region', { name: 'Recommandation du coach' })).toBeNull();
    expect(load).toHaveValue('40');
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

    expect(
      screen.getByText(
        `${String(Math.floor((timedExercise.sets[0].durationSeconds ?? 0) / 60)).padStart(2, '0')}:${String((timedExercise.sets[0].durationSeconds ?? 0) % 60).padStart(2, '0')}`,
      ),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Appliquer à cette séance' }));
    const baseDuration = timedExercise.sets[0]!.durationSeconds!;
    const suggestedDuration = baseDuration + Math.max(15, Math.round(baseDuration * 0.1));
    expect(
      screen.getByText(
        `${String(Math.floor(suggestedDuration / 60)).padStart(2, '0')}:${String(suggestedDuration % 60).padStart(2, '0')}`,
      ),
    ).toBeInTheDocument();
  });
});
