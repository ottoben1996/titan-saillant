import { useEffect, useRef, useState } from 'react';
import type { SessionTimerState } from '../../domain/types';
import { type CountdownController, createCountdown } from '../../workout/timer';
import { getTimerAnnouncement } from '../../workout/timerAnnouncements';
import { Pause, Play, Repeat, X } from '../ui/Icons';
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
  restartNonce?: number;
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
  restartNonce = 0,
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
  const lastPausedRef = useRef<boolean | null>(null);
  const startedRef = useRef(started);

  onTickRef.current = setRemaining;
  onStateChangeRef.current = onStateChange;
  startedRef.current = started;

  const publish = (value: number, isPaused: boolean, isStarted = startedRef.current) => {
    // Le dédoublonnage ne doit pas avaler un CHANGEMENT DE PAUSE. À la reprise,
    // la valeur est identique à celle publiée à la pause : l'ancien garde sortait
    // donc sans rien publier, et l'état enregistré restait « en pause ». Un
    // rechargement dans cette fenêtre faisait rendre la valeur figée au lieu de
    // suivre l'horloge — le chrono reculait.
    if (lastPublishedRef.current === value && lastPausedRef.current === isPaused && isStarted === startedRef.current) {
      return;
    }
    lastPublishedRef.current = value;
    lastPausedRef.current = isPaused;
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
    lastPausedRef.current = null;
    const isReset = resetNonce > 0 || restartNonce > 0;
    const start = isReset ? durationSeconds : (initialState?.remainingSeconds ?? durationSeconds);
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
        // Le chiffre affiché est local (onTickRef) : la publication à
        // l'application ne sert qu'à retrouver le bon restant après un arrêt
        // forcé. Or l'état publié est horodaté — publier toutes les 5 s ne coûte
        // donc aucune exactitude, alors que publier chaque seconde re-rendait
        // tout l'arbre de l'application pendant toute la série.
        if (value === 0 || value <= 5 || value % 5 === 0) publish(value, false);
      },
      () => {
        setRunning(false);
        setRemaining(0);
        publish(0, true);
        onDone();
      },
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
  }, [durationSeconds, resetNonce, restartNonce]);

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

  // Anneau à la manière du minuteur d'iOS : il se vide avec le temps restant.
  const rayon = 54;
  const circonference = 2 * Math.PI * rayon;
  const part = durationSeconds > 0 ? Math.min(1, Math.max(0, remaining / durationSeconds)) : 0;
  const enCours = started && !paused && remaining > 0;

  return (
    <div className={`exercise-timer${remaining === 0 ? ' complete' : ''}`}>
      <span className="sr-only" role="status" aria-live="polite">
        {getTimerAnnouncement(remaining) ?? ''}
      </span>
      <div className="tempo-anneau">
        <svg viewBox="0 0 120 120" aria-hidden="true" focusable="false">
          <circle className="tempo-anneau-fond" cx="60" cy="60" r={rayon} />
          <circle
            className="tempo-anneau-trace"
            cx="60"
            cy="60"
            r={rayon}
            strokeDasharray={circonference}
            strokeDashoffset={circonference * (1 - part)}
          />
        </svg>
        <div className="tempo-anneau-texte">
          <span className="eyebrow">TEMPO</span>
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
      </div>
      {/* Deux boutons ronds côte à côte tant que le temps court. Écoulé, il ne
          reste que « Recommencer », discret : « Valider la série » redevient la
          seule action en avant. */}
      <div className={`timer-actions${remaining === 0 ? ' finished' : ''}`}>
        {remaining > 0 && (
          <button
            type="button"
            onClick={handleSkip}
            disabled={suspended}
            className="tempo-rond skip-tempo-btn"
            aria-label="Passer le tempo"
          >
            <X size={22} />
            <span>Passer</span>
          </button>
        )}
        {remaining > 0 && (
          <button
            type="button"
            className={`tempo-rond tempo-rond-principal${enCours ? ' en-cours' : ''}`}
            onClick={toggle}
            disabled={!running || suspended}
          >
            {enCours ? <Pause size={22} /> : <Play size={22} />}
            <span>{!started ? 'Démarrer' : paused ? 'Reprendre' : 'Pause'}</span>
          </button>
        )}
        <button
          type="button"
          className="text-button tempo-recommencer"
          onClick={() => setResetNonce((value) => value + 1)}
          disabled={suspended}
        >
          <Repeat size={16} /> Recommencer
        </button>
      </div>
    </div>
  );
}
