import { useEffect, useRef, useState } from 'react';
import type { SessionTimerState } from '../../domain/types';
import {
  type AddRestPreset,
  applyRestPreset,
  REST_PRESETS,
  REST_SKIP_PRESET,
  restProgressRatio,
} from '../../workout/restPresets';
import { type CountdownController, createCountdown } from '../../workout/timer';
import { getTimerAnnouncement } from '../../workout/timerAnnouncements';
import { Play, Timer, X } from '../ui/Icons';

export const formatDuration = (seconds: number) =>
  `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0')}:${Math.max(0, seconds % 60)
    .toString()
    .padStart(2, '0')}`;

interface RestTimerProps {
  exerciseId: string;
  setIndex: number;
  seconds: number;
  initialState?: SessionTimerState;
  suspended: boolean;
  onStateChange: (state: SessionTimerState | null) => void;
  onDone: () => void;
}

export function RestTimer({
  exerciseId,
  setIndex,
  seconds,
  initialState,
  suspended,
  onStateChange,
  onDone,
}: RestTimerProps) {
  const controller = useRef<CountdownController | null>(null);
  const onStateChangeRef = useRef(onStateChange);
  const [remaining, setRemaining] = useState(initialState?.remainingSeconds ?? seconds);
  const [totalDuration, setTotalDuration] = useState(Math.max(seconds, initialState?.remainingSeconds ?? seconds));
  const [paused, setPaused] = useState(initialState?.paused ?? false);
  const autoPausedRef = useRef(false);
  const lastPublishedRef = useRef<number | null>(null);

  onStateChangeRef.current = onStateChange;

  const triggerHaptic = (ms = 25) => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate?.(ms);
      } catch {
        /* ignorer */
      }
    }
  };

  const publish = (value: number, isPaused: boolean) => {
    if (lastPublishedRef.current === value && !isPaused) return;
    lastPublishedRef.current = value;
    onStateChangeRef.current({
      kind: 'rest',
      exerciseId,
      setIndex,
      remainingSeconds: value,
      paused: isPaused,
      updatedAt: new Date().toISOString(),
    });
  };

  useEffect(() => {
    controller.current?.cancel();
    lastPublishedRef.current = null;
    const start = initialState?.remainingSeconds ?? seconds;
    const initialPaused = initialState?.paused ?? false;
    setRemaining(start);
    setTotalDuration(Math.max(seconds, start));
    setPaused(initialPaused);

    const timer = createCountdown(
      start,
      (value) => {
        setRemaining(value);
        // Sauvegarde périodique (toutes les 15s ou <= 5s) pour découpler le root React
        if (value === 0 || value <= 5 || value % 15 === 0) {
          publish(value, false);
        }
      },
      () => {
        setRemaining(0);
        setPaused(false);
        onStateChangeRef.current(null);
        onDone();
      },
    );

    controller.current = timer;
    if (initialPaused) {
      timer.pause();
    } else {
      publish(start, false);
    }

    return () => timer.cancel();
  }, [seconds, initialState?.exerciseId, initialState?.setIndex]);

  useEffect(() => {
    if (!controller.current) return;
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
  }, [suspended, paused]);

  /**
   * Retour au premier plan : le navigateur a pu geler les minuteries pendant que
   * l'application était en arrière-plan. On recolle immédiatement le décompte à
   * l'horloge réelle — le temps continue de s'écouler quand on quitte l'app.
   */
  useEffect(() => {
    const syncToClock = () => {
      if (document.visibilityState === 'visible') controller.current?.refresh();
    };
    document.addEventListener('visibilitychange', syncToClock);
    window.addEventListener('pageshow', syncToClock);
    return () => {
      document.removeEventListener('visibilitychange', syncToClock);
      window.removeEventListener('pageshow', syncToClock);
    };
  }, []);

  const handleAddPreset = (preset: AddRestPreset) => {
    triggerHaptic(25);
    const next = applyRestPreset({ remainingSeconds: remaining, totalSeconds: totalDuration }, preset);
    setRemaining(next.remainingSeconds);
    setTotalDuration(next.totalSeconds);
    controller.current?.cancel();
    lastPublishedRef.current = null;
    const timer = createCountdown(
      next.remainingSeconds,
      (value) => {
        setRemaining(value);
        if (value === 0 || value <= 5 || value % 15 === 0) {
          publish(value, false);
        }
      },
      () => {
        setRemaining(0);
        setPaused(false);
        onStateChangeRef.current(null);
        onDone();
      },
    );
    controller.current = timer;
    if (paused) {
      timer.pause();
      publish(next.remainingSeconds, true);
    } else {
      publish(next.remainingSeconds, false);
    }
  };

  const handleSkip = () => {
    triggerHaptic(30);
    const next = applyRestPreset({ remainingSeconds: remaining, totalSeconds: totalDuration }, REST_SKIP_PRESET);
    controller.current?.cancel();
    setRemaining(next.remainingSeconds);
    setTotalDuration(next.totalSeconds);
    setPaused(false);
    onStateChangeRef.current(null);
    onDone();
  };

  const toggle = () => {
    if (!controller.current) return;
    triggerHaptic(20);
    if (paused) {
      controller.current.resume();
      setPaused(false);
      publish(controller.current.getRemaining(), false);
    } else {
      controller.current.pause();
      const value = controller.current.getRemaining();
      setRemaining(value);
      setPaused(true);
      publish(value, true);
    }
  };

  const progressTotal = totalDuration > 0 ? totalDuration : seconds > 0 ? seconds : 60;
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const progressRatio = restProgressRatio({ remainingSeconds: remaining, totalSeconds: progressTotal });
  const strokeDashoffset = circumference * (1 - progressRatio);
  const isAlert = remaining <= 5 && remaining > 0;

  return (
    <div className="rest-card">
      <span className="sr-only" role="status" aria-live="polite">
        {getTimerAnnouncement(remaining) ?? ''}
      </span>
      <div className={`rest-orbit-svg-container ${isAlert ? 'rest-circle-alert' : ''}`}>
        <svg className="rest-circle-svg" viewBox="0 0 120 120" aria-hidden="true">
          <circle className="rest-circle-bg" cx="60" cy="60" r={radius} />
          <circle
            className="rest-circle-progress"
            cx="60"
            cy="60"
            r={radius}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
          />
        </svg>
        <div className="rest-orbit-content">
          <span style={{ color: isAlert ? 'var(--rest)' : 'var(--accent)', marginBottom: '0.2rem', display: 'flex' }}>
            <Timer size={20} />
          </span>
          <strong>{formatDuration(remaining)}</strong>
          <span>{paused ? 'en pause' : 'repos'}</span>
        </div>
      </div>
      <p>Récupère vraiment. La prochaine série sera plus solide.</p>
      <div className="rest-actions">
        <button type="button" onClick={handleSkip} aria-label="Passer le temps de repos">
          <X size={18} /> Passer
        </button>
        <button type="button" onClick={toggle} disabled={suspended} aria-label={paused ? 'Reprendre' : 'Pause'}>
          <Play size={16} /> {paused ? 'Reprendre' : 'Pause'}
        </button>
      </div>
      <div className="rest-presets" role="group" aria-label="Ajouter du temps de repos">
        {REST_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className="rest-preset-btn"
            onClick={() => handleAddPreset(preset)}
            aria-label={preset.ariaLabel}
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
}
