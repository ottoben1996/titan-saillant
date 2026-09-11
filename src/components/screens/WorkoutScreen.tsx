import { useEffect, useMemo, useRef, useState } from 'react';
import type { ProfileId, SessionTimerState, WorkoutDay, WorkoutSession } from '../../domain/types';
import { equipmentAlternatives } from '../../domain/alternatives';
import { tutorials } from '../../domain/tutorials';
import { exerciseMedia } from '../../domain/media';
import { getProgram } from '../../domain/programs';
import { getNextStep, getWorkoutExercises, getWorkoutSteps } from '../../workout/runner';
import { computeProgressiveOverload } from '../../workout/progressionEngine';
import { generateWarmupRamp } from '../../workout/warmupRamp';
import { calculatePlateDelta } from '../../workout/duoManager';
import { parseSafeFloat, parseSafeInt } from '../../workout/sanitizer';
import { RestTimer, formatDuration } from '../timers/RestTimer';
import { ExerciseTimer } from '../timers/ExerciseTimer';
import { PlateBadge } from '../ui/PlateBadge';
import { ArrowRight, Barbell, Bolt, Check, Clock, Person, Repeat, Undo, Video } from '../ui/Icons';
import { CompletionFeedback } from './CompletionFeedback';

function findGhostPerformance(
  history: WorkoutSession[],
  exerciseId: string,
  setIndex: number
): { loadKg?: number; repetitions?: number; durationSeconds?: number } | null {
  if (!history || history.length === 0) return null;
  const sorted = [...history].sort(
    (a, b) => Date.parse(b.completedAt ?? b.startedAt) - Date.parse(a.completedAt ?? a.startedAt)
  );
  for (const s of sorted) {
    const matching = s.loggedSets.find(
      (set) => set.exerciseId === exerciseId && set.setIndex === setIndex
    );
    if (
      matching &&
      ((matching.actualLoadKg !== undefined && Number.isFinite(matching.actualLoadKg)) ||
        (matching.actualRepetitions !== undefined && Number.isFinite(matching.actualRepetitions)) ||
        (matching.actualDurationSeconds !== undefined && Number.isFinite(matching.actualDurationSeconds)))
    ) {
      return {
        loadKg: Number.isFinite(matching.actualLoadKg) ? matching.actualLoadKg : undefined,
        repetitions: Number.isFinite(matching.actualRepetitions) ? matching.actualRepetitions : undefined,
        durationSeconds: Number.isFinite(matching.actualDurationSeconds) ? matching.actualDurationSeconds : undefined,
      };
    }
    const anyMatching = s.loggedSets.filter((set) => set.exerciseId === exerciseId).pop();
    if (
      anyMatching &&
      ((anyMatching.actualLoadKg !== undefined && Number.isFinite(anyMatching.actualLoadKg)) ||
        (anyMatching.actualRepetitions !== undefined && Number.isFinite(anyMatching.actualRepetitions)) ||
        (anyMatching.actualDurationSeconds !== undefined && Number.isFinite(anyMatching.actualDurationSeconds)))
    ) {
      return {
        loadKg: Number.isFinite(anyMatching.actualLoadKg) ? anyMatching.actualLoadKg : undefined,
        repetitions: Number.isFinite(anyMatching.actualRepetitions) ? anyMatching.actualRepetitions : undefined,
        durationSeconds: Number.isFinite(anyMatching.actualDurationSeconds) ? anyMatching.actualDurationSeconds : undefined,
      };
    }
  }
  return null;
}

interface WorkoutScreenProps {
  profile?: ProfileId;
  onSwitchDuoProfile?: (target: ProfileId) => void;
  day: WorkoutDay;
  session: WorkoutSession;
  history?: WorkoutSession[];
  resting: boolean;
  restSeconds: number;
  timerSuspended: boolean;
  modalOpen?: boolean;
  onTimerStateChange: (state: SessionTimerState | null) => void;
  onTimerDone: (kind?: 'rest' | 'tempo') => void;
  onCompleteSet: (values: { repetitions?: number; durationSeconds?: number; loadKg?: number }) => Promise<void>;
  onTutorial: (id: string) => void;
  onAlternative: (id: string) => void;
  onRevertAlternative?: (id: string) => void;
  onFinish: (feedback?: Pick<WorkoutSession, 'perceivedExertion' | 'energy' | 'pain' | 'notes'>) => Promise<void>;
}

export function WorkoutScreen({
  profile,
  onSwitchDuoProfile,
  day,
  session,
  history = [],
  resting,
  restSeconds,
  timerSuspended,
  modalOpen,
  onTimerStateChange,
  onTimerDone,
  onCompleteSet,
  onTutorial,
  onAlternative,
  onRevertAlternative,
  onFinish,
}: WorkoutScreenProps) {
  const steps = getWorkoutSteps(day, session);
  const exercises = getWorkoutExercises(day, session);
  const step = getNextStep(session, day);
  const exercise =
    step.kind === 'exercise' && step.exerciseIndex !== undefined ? exercises[step.exerciseIndex] : null;
  const prescription = exercise && step.setIndex !== undefined ? exercise.sets[step.setIndex] : null;

  const isAlternativeActive = Boolean(exercise && session.alternativesUsed?.includes(exercise.id));
  const activeAlternative = isAlternativeActive && exercise ? equipmentAlternatives[exercise.id] : null;

  const [reps, setReps] = useState('');
  const [load, setLoad] = useState('');
  const [duration, setDuration] = useState('');
  const [tempoSkipped, setTempoSkipped] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isComplete = step.kind === 'complete';
  const [elapsedSeconds, setElapsedSeconds] = useState(() =>
    Math.max(0, Math.floor((Date.now() - Date.parse(session.startedAt)) / 1000))
  );

  const stepKey = `${exercise?.id ?? 'none'}-${step.setIndex ?? 0}`;

  useEffect(() => {
    setTempoSkipped(false);
    setReps(prescription?.repetitions?.toString() ?? '');
    const suggestedAltLoad = activeAlternative?.suggestedLoadKg?.(prescription?.loadKg);
    setLoad(suggestedAltLoad ? suggestedAltLoad.toString() : prescription?.loadKg?.toString() ?? '');
    setDuration(prescription?.durationSeconds?.toString() ?? '');
  }, [stepKey, activeAlternative]);

  useEffect(() => {
    if (isComplete) return;
    const update = () => setElapsedSeconds(Math.max(0, Math.floor((Date.now() - Date.parse(session.startedAt)) / 1000)));
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [isComplete, session.startedAt]);

  const phaseLabel =
    exercise?.kind === 'warmup'
      ? 'ÉCHAUFFEMENT'
      : exercise?.kind === 'cooldown'
      ? 'RETOUR AU CALME'
      : prescription?.phase === 'warmup'
      ? 'SÉRIE D’ÉCHAUFFEMENT'
      : exercise?.circuitId
      ? exercise.circuitId.replace('-', ' ').toUpperCase()
      : 'SÉRIE DE TRAVAIL';


  // Haptique légère à chaque ajustement
  const triggerHaptic = (ms = 25) => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate?.(ms);
      } catch {
        /* ignorer */
      }
    }
  };

  const handleAdjustLoad = (delta: number) => {
    triggerHaptic(20);
    const current = parseSafeFloat(load, 0);
    const nextVal = Math.max(0, Math.round((current + delta) * 10) / 10);
    setLoad(nextVal.toString());
  };

  const handleAdjustReps = (delta: number) => {
    triggerHaptic(20);
    const current = parseSafeInt(reps, 0);
    const nextVal = Math.max(0, current + delta);
    setReps(nextVal.toString());
  };

  const handleAdjustDuration = (delta: number) => {
    triggerHaptic(20);
    const current = parseSafeInt(duration, 0);
    const nextVal = Math.max(0, current + delta);
    setDuration(nextVal.toString());
    setTempoSkipped(true);
  };

  const isSubmittingRef = useRef(false);

  const handleCompleteSet = async () => {
    if (isSubmittingRef.current || isSubmitting) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    triggerHaptic(45);
    if (matchingTimer?.kind === 'tempo') {
      onTimerStateChange(null);
    }
    try {
      await onCompleteSet({
        repetitions: reps.trim() !== '' ? parseSafeInt(reps, undefined, 0, 200) : undefined,
        durationSeconds: duration.trim() !== '' ? parseSafeInt(duration, undefined, 0, 3600) : undefined,
        loadKg: load.trim() !== '' ? parseSafeFloat(load, undefined, 0, 600) : undefined,
      });
    } finally {
      window.setTimeout(() => {
        isSubmittingRef.current = false;
        setIsSubmitting(false);
      }, 350);
    }
  };

  if (isComplete) return <CompletionFeedback session={session} onFinish={onFinish} />;

  const completedInDay = session.loggedSets.length;
  const totalSets = steps.length;
  const progress = Math.round((completedInDay / totalSets) * 100);
  const nextStep = steps[(step.sequenceIndex ?? completedInDay) + 1];
  const nextExercise = nextStep?.exerciseIndex === undefined ? null : exercises[nextStep.exerciseIndex];
  const activeTimer = session.activeTimer;
  const matchingTimer =
    activeTimer && activeTimer.exerciseId === exercise?.id && activeTimer.setIndex === step.setIndex
      ? activeTimer
      : undefined;
  const tempoReady = !prescription?.durationSeconds || tempoSkipped || matchingTimer?.remainingSeconds === 0;
  const movementMedia = exercise ? exerciseMedia[exercise.id] : undefined;

  // Calcul de la surcharge progressive & performance précédente (Ghost Data) - mémoïsé
  const progression = useMemo(() => (exercise ? computeProgressiveOverload(exercise, history) : null), [exercise?.id, history]);
  const ghostPerf = useMemo(
    () => (exercise && step.setIndex !== undefined ? findGhostPerformance(history, exercise.id, step.setIndex) : null),
    [exercise?.id, step.setIndex, history]
  );
  const currentLoadVal = parseSafeFloat(load, 0);
  const warmupSteps = useMemo(
    () => (prescription?.loadKg ? generateWarmupRamp(prescription.loadKg, exercise?.id) : []),
    [prescription?.loadKg, exercise?.id]
  );
  const [showWarmupRamp, setShowWarmupRamp] = useState(false);

  const partnerProfile: ProfileId | null = profile ? (profile === 'ottman' ? 'laura' : 'ottman') : null;
  const partnerDelta = useMemo(() => {
    if (!partnerProfile || !exercise || prescription?.loadKg === undefined) return null;
    const partnerProgram = getProgram(partnerProfile);
    const pDay = partnerProgram.days.find((d) => d.id === day.id);
    if (!pDay) return null;
    const pExercises = getWorkoutExercises(pDay, undefined);
    const pEx = pExercises.find((e) => e.id === exercise.id);
    const pSet = pEx && step.setIndex !== undefined ? pEx.sets[step.setIndex] : null;
    if (pSet?.loadKg === undefined) return null;
    const currentLoad = currentLoadVal > 0 ? currentLoadVal : prescription.loadKg;
    return calculatePlateDelta(currentLoad, pSet.loadKg);
  }, [partnerProfile, exercise?.id, step.setIndex, prescription?.loadKg, currentLoadVal, day.id]);

  return (
    <section className="content workout-content">
      {onSwitchDuoProfile && (
        <div className="duo-wrapper">
          <div className="duo-switcher-bar" aria-label="Mode Duo Tour par tour">
            <button
              type="button"
              className={`duo-pill-btn ${profile === 'ottman' ? 'active' : ''}`}
              onClick={() => onSwitchDuoProfile('ottman')}
            >
              <span><Bolt size={15} /> Ottman</span>
              {profile === 'ottman' && <span className="duo-pill-badge">en cours</span>}
            </button>
            <button
              type="button"
              className={`duo-pill-btn ${profile === 'laura' ? 'active' : ''}`}
              onClick={() => onSwitchDuoProfile('laura')}
            >
              <span><Person size={15} /> Laura</span>
              {profile === 'laura' && <span className="duo-pill-badge">en cours</span>}
            </button>
          </div>
          {partnerDelta && partnerDelta.action !== 'keep' && (
            <div className="duo-delta-banner" aria-label="Différentiel disques partagés">
              <span>
                Vers <strong>{partnerProfile === 'ottman' ? 'Ottman' : 'Laura'}</strong> : {partnerDelta.summaryLabel}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="workout-heading">
        <div>
          <p className="eyebrow">
            {day.name.toUpperCase()} · {phaseLabel}
          </p>
          <h1>{activeAlternative ? activeAlternative.name : exercise?.name}</h1>
          {activeAlternative && (
            <div className="alternative-active-badge">
              <span>Alternative active (original : {exercise?.name})</span>
              {onRevertAlternative && (
                <button
                  type="button"
                  className="revert-alt-btn"
                  onClick={() => onRevertAlternative(exercise!.id)}
                >
                  <Undo size={13} /> Revenir à la machine
                </button>
              )}
            </div>
          )}
        </div>
        <div className="workout-status">
          <span className="session-elapsed" aria-label={`Durée totale de la séance ${formatDuration(elapsedSeconds)}`}>
            <Clock size={14} /> Total {formatDuration(elapsedSeconds)}
          </span>
          <span className="progress-pill">
            {completedInDay + 1} / {totalSets}
          </span>
        </div>
      </div>

      <div className="progress-track large">
        <i style={{ width: `${progress}%` }} />
      </div>

      {exercise && prescription && (
        <>
          {(tutorials[exercise.id] || (equipmentAlternatives[exercise.id] && !activeAlternative)) && (
          <div className="workout-actions">
            {tutorials[exercise.id] && (
              <button type="button" className="tutorial-link" onClick={() => onTutorial(exercise.id)}>
                <Video size={18} /> Tutoriel
              </button>
            )}
            {equipmentAlternatives[exercise.id] && !activeAlternative && (
              <button type="button" className="alternative-link" onClick={() => onAlternative(exercise.id)}>
                <Barbell size={18} /> Machine indisponible ?
              </button>
            )}
          </div>
          )}

          <div className="prescription-card compact">
            {movementMedia && (
              <div className={`exercise-illustration${movementMedia.start ? '' : ' single'}`}>
                {movementMedia.start ? (
                  <>
                    <img
                      src={movementMedia.start}
                      alt={`Position de départ : ${exercise.name}`}
                      decoding="async"
                    />
                    <ArrowRight size={16} className="illustration-arrow" />
                    <img
                      src={movementMedia.peak ?? movementMedia.start}
                      alt={`Position finale : ${exercise.name}`}
                      decoding="async"
                    />
                  </>
                ) : (
                  <img
                    src={movementMedia.main ?? movementMedia.start ?? ''}
                    alt={`Illustration : ${exercise.name}`}
                    decoding="async"
                  />
                )}
              </div>
            )}
            <span className="eyebrow">
              {phaseLabel} · SÉRIE {step.setIndex! + 1}
            </span>
            <div className="prescription-main">
              {prescription.durationSeconds ? (
                <>
                  <strong>{prescription.durationSeconds}</strong>
                  <span>secondes</span>
                </>
              ) : (
                <>
                  <strong>{prescription.repetitions}</strong>
                  <span>répétitions</span>
                </>
              )}
              {prescription.loadKg !== undefined && (
                <b>{activeAlternative?.suggestedLoadKg?.(prescription.loadKg) ?? prescription.loadKg} kg</b>
              )}
            </div>

            {/* Calculateur de disques par côté avec tare automatique */}
            {prescription.loadKg !== undefined && prescription.loadKg >= 20 && !activeAlternative && (
              <PlateBadge
                totalLoadKg={currentLoadVal || prescription.loadKg}
                exerciseId={exercise.id}
              />
            )}

            {/* Surcharge progressive conseillée */}
            {progression && prescription.phase !== 'warmup' && (
              <div className="progression-hint-banner">
                <span className="prog-pill">Défi coach</span>
                <span>
                  Objectif suggéré : <strong>{progression.suggestedLoadKg} kg</strong> (+{progression.incrementKg} kg)
                </span>
                <button
                  type="button"
                  className="prog-apply-btn"
                  onClick={() => setLoad(progression.suggestedLoadKg.toString())}
                >
                  Appliquer
                </button>
              </div>
            )}

            {/* Montée en gamme conseillée (Warm-up Ramp-up) */}
            {warmupSteps.length > 0 && prescription.phase !== 'warmup' && step.setIndex === 0 && (
              <div className="warmup-ramp-wrapper">
                <button
                  type="button"
                  className="warmup-ramp-toggle"
                  onClick={() => setShowWarmupRamp((v) => !v)}
                  aria-expanded={showWarmupRamp}
                >
                  <span><Bolt size={16} /> Montée en gamme conseillée ({warmupSteps.length} paliers)</span>
                  <small>{showWarmupRamp ? 'Masquer' : 'Afficher'}</small>
                </button>
                {showWarmupRamp && (
                  <div className="warmup-ramp-list">
                    {warmupSteps.map((ws) => (
                      <div key={ws.stepIndex} className="warmup-ramp-step">
                        <div className="warmup-ramp-info">
                          <span className="warmup-ramp-badge">Palier {ws.stepIndex} · {ws.percentage}%</span>
                          <strong>{ws.loadKg} kg × {ws.repetitions} réps</strong>
                          <small>{ws.purpose} · Repos {ws.restSeconds}s</small>
                        </div>
                        <button
                          type="button"
                          className="warmup-ramp-apply-btn"
                          onClick={() => setLoad(ws.loadKg.toString())}
                          title="Charger ce palier"
                        >
                          Tester
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <p>
              {exercise.notes ??
                prescription.loadLabel ??
                'Reste propre dans ton mouvement. Le contrôle est ta meilleure charge.'}
            </p>
          </div>

          {resting ? (
            <div className="rest-cockpit-container">
              <RestTimer
                exerciseId={exercise.id}
                setIndex={step.setIndex!}
                seconds={restSeconds}
                initialState={matchingTimer?.kind === 'rest' ? matchingTimer : undefined}
                suspended={Boolean(modalOpen)}
                onStateChange={onTimerStateChange}
                onDone={() => onTimerDone('rest')}
              />

              {exercise && prescription && (
                <div className="rest-next-preview-card" aria-label="À préparer pendant ton repos">
                  <div className="rest-next-header">
                    <span className="rest-next-badge">PROCHAINE SÉRIE</span>
                    <span className="rest-next-series">Série {(step.setIndex ?? 0) + 1}</span>
                  </div>
                  <div className="rest-next-name">{exercise.name}</div>
                  {prescription.loadKg !== undefined && (
                    <div className="rest-next-prep">
                      <span className="rest-next-load">
                        Charge prévue : <strong>{prescription.loadKg} kg</strong>
                      </span>
                      {prescription.loadKg >= 20 && (
                        <PlateBadge
                          totalLoadKg={prescription.loadKg}
                          exerciseId={exercise.id}
                        />
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="log-card compact">
              {prescription.durationSeconds && (
                <ExerciseTimer
                  key={`${exercise.id}-${step.setIndex}`}
                  exerciseId={exercise.id}
                  setIndex={step.setIndex!}
                  durationSeconds={prescription.durationSeconds}
                  initialState={matchingTimer?.kind === 'tempo' ? matchingTimer : undefined}
                  suspended={timerSuspended}
                  onStateChange={onTimerStateChange}
                  onDone={() => {
                    setTempoSkipped(true);
                    onTimerDone('tempo');
                  }}
                  onSkip={() => setTempoSkipped(true)}
                />
              )}

              {ghostPerf && (
                <div className="ghost-perf-strip" aria-label="Performance de la séance précédente">
                  <Repeat size={14} className="ghost-icon" />
                  <span>
                    Séance précédente :{' '}
                    <strong>
                      {ghostPerf.loadKg !== undefined ? `${ghostPerf.loadKg} kg` : ''}
                      {ghostPerf.loadKg !== undefined && ghostPerf.repetitions !== undefined ? ' × ' : ''}
                      {ghostPerf.repetitions !== undefined ? `${ghostPerf.repetitions} réps` : ''}
                      {ghostPerf.durationSeconds !== undefined ? `${ghostPerf.durationSeconds}s` : ''}
                    </strong>
                  </span>
                </div>
              )}

              <div className="log-card-heading">
                <span>Ta performance</span>
                <small>
                  {prescription.durationSeconds && !tempoReady
                    ? 'Ajuste en 1 tap ou valide directement'
                    : 'Ajuste en 1 tap ou tape la valeur'}
                </small>
              </div>

              <div className="input-row-modern">
                {prescription.durationSeconds ? (
                  <div className="stepper-group">
                    <span className="stepper-label">Durée (secondes)</span>
                    <div className="stepper-controls">
                      <button type="button" className="step-btn" onClick={() => handleAdjustDuration(-5)}>
                        -5s
                      </button>
                      <input
                        inputMode="numeric"
                        className="stepper-input"
                        value={duration}
                        onChange={(e) => {
                          setDuration(e.target.value);
                          setTempoSkipped(true);
                        }}
                      />
                      <button type="button" className="step-btn" onClick={() => handleAdjustDuration(+5)}>
                        +5s
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="stepper-group">
                    <span className="stepper-label">Répétitions</span>
                    <div className="stepper-controls">
                      <button type="button" className="step-btn" onClick={() => handleAdjustReps(-1)}>
                        -1
                      </button>
                      <input
                        inputMode="numeric"
                        className="stepper-input"
                        value={reps}
                        onChange={(e) => setReps(e.target.value)}
                      />
                      <button type="button" className="step-btn" onClick={() => handleAdjustReps(+1)}>
                        +1
                      </button>
                    </div>
                  </div>
                )}

                {prescription.loadKg !== undefined && (
                  <div className="stepper-group">
                    <span className="stepper-label">Charge (kg)</span>
                    <div className="stepper-controls">
                      <button type="button" className="step-btn" onClick={() => handleAdjustLoad(-5)}>
                        -5
                      </button>
                      <button type="button" className="step-btn" onClick={() => handleAdjustLoad(-2.5)}>
                        -2.5
                      </button>
                      <input
                        inputMode="decimal"
                        className="stepper-input"
                        value={load}
                        onChange={(e) => setLoad(e.target.value)}
                      />
                      <button type="button" className="step-btn" onClick={() => handleAdjustLoad(+2.5)}>
                        +2.5
                      </button>
                      <button type="button" className="step-btn" onClick={() => handleAdjustLoad(+5)}>
                        +5
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <button
                type="button"
                className="primary-button full"
                onClick={() => void handleCompleteSet()}
                disabled={isSubmitting}
              >
                <Check size={20} weight="bold" />{' '}
                {isSubmitting ? 'Enregistrement…' : 'Valider la série'}
              </button>
            </div>
          )}
        </>
      )}

      <div className="next-hint">
        <ArrowRight size={16} /> Ensuite : {nextExercise?.name ?? 'fin de séance'}
      </div>
    </section>
  );
}
