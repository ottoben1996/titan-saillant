import { useEffect, useRef, useState } from 'react';
import type { SessionTimerState } from '../../domain/types';
import { createCountdown, type CountdownController } from '../../workout/timer';
import { getTimerAnnouncement } from '../../workout/timerAnnouncements';
import { Play, Repeat, X } from '../ui/Icons';
import { formatDuration } from './RestTimer';

interface ExerciseTimerProps {
  exerciseId: string;
  setIndex: number;
  durationSeconds: number;
  initialState?: SessionTimerState;
  suspended: boolean;
  onStateChange: (state: SessionTimerState | null) => void;
  onDone: () => void;
  onSkip?: () => void;
}

export function ExerciseTimer({
  exerciseId,
  setIndex,
  durationSeconds,
  initialState,
  suspended,
  onStateChange,
  onDone,
  onSkip,
}: ExerciseTimerProps) {
  const controller = useRef<CountdownController | null>(null);
  const onTickRef = useRef<(remaining: number) => void>(() => undefined);
  const onStateChangeRef = useRef(onStateChange);
  const [remaining, setRemaining] = useState(initialState?.remainingSeconds ?? durationSeconds);
  const [paused, setPaused] = useState(initialState?.paused ?? false);
  const [started, setStarted] = useState(initialState ? initialState.started !== false : false);
  const [running, setRunning] = useState(true);
  const [resetNonce, setResetNonce] = useState(0);
  const autoPausedRef = useRef(false);
  const lastPublishedRef = useRef<number | null>(null);
  const startedRef = useRef(started);

  onTickRef.current = setRemaining;
  onStateChangeRef.current = onStateChange;
  startedRef.current = started;

  const publish = (value: number, isPaused: boolean, isStarted = startedRef.current) => {
    if (lastPublishedRef.current === value && !isPaused && isStarted === startedRef.current) return;
    lastPublishedRef.current = value;
    onStateChangeRef.current({
      kind: 'tempo',
      exerciseId,
      setIndex,
      remainingSeconds: value,
      paused: isPaused,
      started: isStarted,
      updatedAt: new Date().toISOString(),
    });
  };

  useEffect(() => {
    controller.current?.cancel();
    lastPublishedRef.current = null;
    const isReset = resetNonce > 0;
    const start = isReset ? durationSeconds : initialState?.remainingSeconds ?? durationSeconds;
    const initialStarted = isReset ? false : initialState ? initialState.started !== false : false;
    const initialPaused = isReset || !initialStarted || (initialState?.paused ?? false);
    setRemaining(start);
    setPaused(initialPaused);
    setStarted(initialStarted);
    startedRef.current = initialStarted;
    setRunning(true);

    const timer = createCountdown(
      start,
      (value) => {
        onTickRef.current(value);
        publish(value, false);
      },
      () => {
        setRunning(false);
        setRemaining(0);
        publish(0, true);
        onDone();
      }
    );

    controller.current = timer;
    if (initialPaused || start <= 0) {
      timer.pause();
      if (start <= 0) setRunning(false);
      publish(Math.max(0, start), true, initialStarted);
    } else {
      publish(start, false, initialStarted);
    }

    return () => timer.cancel();
  }, [durationSeconds, resetNonce]);

  useEffect(() => {
    if (!controller.current || !running) return;
    if (suspended && !paused) {
      controller.current.pause();
      const value = controller.current.getRemaining();
      setRemaining(value);
      publish(value, true);
      setPaused(true);
      autoPausedRef.current = true;
    } else if (!suspended && paused && autoPausedRef.current) {
      controller.current.resume();
      setPaused(false);
      autoPausedRef.current = false;
      publish(controller.current.getRemaining(), false);
    }
  }, [suspended, paused, running]);

  const handleSkip = () => {
    controller.current?.cancel();
    setRunning(false);
    setRemaining(0);
    setPaused(false);
    publish(0, true, true);
    onStateChangeRef.current(null);
    onSkip?.();
    onDone();
  };

  const toggle = () => {
    if (!controller.current || !running) return;
    if (!started) {
      controller.current.resume();
      setStarted(true);
      startedRef.current = true;
      setPaused(false);
      publish(controller.current.getRemaining(), false, true);
    } else if (paused) {
      controller.current.resume();
      setPaused(false);
      publish(controller.current.getRemaining(), false, true);
    } else {
      controller.current.pause();
      const value = controller.current.getRemaining();
      setRemaining(value);
      setPaused(true);
      publish(value, true, true);
    }
  };

  return (
    <div className={`exercise-timer ${remaining === 0 ? 'complete' : ''}`}>
      <span className="sr-only" role="status" aria-live="polite">
        {getTimerAnnouncement(remaining) ?? ''}
      </span>
      <div>
        <span className="eyebrow">COMPTEUR TEMPO</span>
        <strong>{formatDuration(remaining)}</strong>
        <small>
          {remaining === 0
            ? 'Temps terminé'
            : suspended
            ? 'En pause · écran masqué'
            : !started
            ? 'Prêt à démarrer'
            : paused
            ? 'En pause'
            : 'En cours'}
        </small>
      </div>
      {/* Temps écoulé : « Passer » et « Démarrer » n'ont plus d'objet, on ne garde
          qu'une action — et l'écran rend la place au bouton de validation. */}
      <div className={`timer-actions${remaining === 0 ? ' finished' : ''}`}>
        {remaining > 0 && (
          <button
            type="button"
            onClick={handleSkip}
            disabled={suspended}
            className="skip-tempo-btn"
            aria-label="Passer le tempo"
          >
            <X size={15} /> Passer
          </button>
        )}
        {remaining > 0 && (
          <button type="button" onClick={toggle} disabled={!running || suspended}>
            <Play size={15} /> {!started ? 'Démarrer' : paused ? 'Reprendre' : 'Pause'}
          </button>
        )}
        <button type="button" onClick={() => setResetNonce((value) => value + 1)} disabled={suspended}>
          <Repeat size={15} /> Recommencer
        </button>
      </div>
    </div>
  );
}
