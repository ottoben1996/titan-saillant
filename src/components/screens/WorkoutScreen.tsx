import { useEffect, useMemo, useRef, useState } from 'react';
import { equipmentAlternatives } from '../../domain/alternatives';
import { exerciseMedia } from '../../domain/media';
import { getProgram } from '../../domain/programs';
import { tutorials } from '../../domain/tutorials';
import type { ProfileId, SessionTimerState, WorkoutDay, WorkoutSession } from '../../domain/types';
import { calculatePlateDelta } from '../../workout/duoManager';
import { etiquettePalier, paliersDeCharge } from '../../workout/loadSteps';
import { computeProgressiveOverload, demandeAllegement } from '../../workout/progressionEngine';
import { getNextStep, getWorkoutExercises, getWorkoutSteps } from '../../workout/runner';
import { parseSafeFloat, parseSafeInt } from '../../workout/sanitizer';
import { formatLoadKg } from '../../workout/summary';
import { generateWarmupRamp } from '../../workout/warmupRamp';
import { SessionPlanSheet } from '../modals/SessionPlanSheet';
import { ExerciseTimer } from '../timers/ExerciseTimer';
import { formatDuration, RestTimer } from '../timers/RestTimer';
import { ArrowRight, Barbell, Bolt, Check, Clock, List, Person, Repeat, Undo, Video } from '../ui/Icons';
import { PlateBadge } from '../ui/PlateBadge';
import { CompletionFeedback } from './CompletionFeedback';

function findGhostPerformance(
  history: WorkoutSession[],
  exerciseId: string,
  setIndex: number,
): { loadKg?: number; repetitions?: number; durationSeconds?: number } | null {
  if (!history || history.length === 0) return null;
  const sorted = [...history].sort(
    (a, b) => Date.parse(b.completedAt ?? b.startedAt) - Date.parse(a.completedAt ?? a.startedAt),
  );
  for (const s of sorted) {
    const matching = s.loggedSets.find((set) => set.exerciseId === exerciseId && set.setIndex === setIndex);
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
        durationSeconds: Number.isFinite(anyMatching.actualDurationSeconds)
          ? anyMatching.actualDurationSeconds
          : undefined,
      };
    }
  }
  return null;
}

/** Formate un nombre en français : `20` → « 20 », `2.5` → « 2,5 ». */
function formatFrenchNumber(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1).replace('.', ',');
}

/** Résumé lisible d'une performance passée : « 20 kg × 10 », « 45 s », « 12 répétitions ». */
function formatGhostPerformance(ghost: { loadKg?: number; repetitions?: number; durationSeconds?: number }): string {
  if (ghost.durationSeconds !== undefined) {
    return ghost.loadKg !== undefined
      ? `${formatFrenchNumber(ghost.loadKg)} kg × ${ghost.durationSeconds} s`
      : `${ghost.durationSeconds} s`;
  }
  if (ghost.repetitions !== undefined) {
    return ghost.loadKg !== undefined
      ? `${formatFrenchNumber(ghost.loadKg)} kg × ${ghost.repetitions}`
      : `${ghost.repetitions} répétitions`;
  }
  return ghost.loadKg !== undefined ? `${formatFrenchNumber(ghost.loadKg)} kg` : '';
}

/**
 * Écart entre la charge saisie et celle de la dernière fois.
 * Renvoie `null` quand la comparaison n'a pas de sens (aucune charge saisie ou
 * aucune charge de référence) ; « identique » quand les deux charges sont égales.
 */
function formatGhostDelta(currentLoadKg: number, ghostLoadKg: number): { label: string; atParity: boolean } | null {
  if (!Number.isFinite(currentLoadKg) || !Number.isFinite(ghostLoadKg) || ghostLoadKg <= 0) return null;
  const diff = Math.round((currentLoadKg - ghostLoadKg) * 100) / 100;
  if (diff === 0) return { label: 'identique', atParity: true };
  const sign = diff > 0 ? '+' : '-';
  return { label: `${sign}${formatFrenchNumber(Math.abs(diff))} kg vs la dernière fois`, atParity: false };
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
  onFinish: (
    feedback?: Pick<
      WorkoutSession,
      'perceivedExertion' | 'energy' | 'pain' | 'painLocation' | 'loadConsigne' | 'notes'
    >,
  ) => Promise<void>;
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
  const exercise = step.kind === 'exercise' && step.exerciseIndex !== undefined ? exercises[step.exerciseIndex] : null;
  const prescription = exercise && step.setIndex !== undefined ? exercise.sets[step.setIndex] : null;

  /** Paliers du mouvement en cours : larges sur les jambes, fins sur le haut du corps. */
  const paliers = paliersDeCharge(exercise?.id ?? '');

  const isAlternativeActive = Boolean(exercise && session.alternativesUsed?.includes(exercise.id));
  const activeAlternative = isAlternativeActive && exercise ? equipmentAlternatives[exercise.id] : null;

  const [reps, setReps] = useState('');
  const [load, setLoad] = useState('');
  const [duration, setDuration] = useState('');
  const [tempoSkipped, setTempoSkipped] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isComplete = step.kind === 'complete';
  const [elapsedSeconds, setElapsedSeconds] = useState(() =>
    Math.max(0, Math.floor((Date.now() - Date.parse(session.startedAt)) / 1000)),
  );

  const stepKey = `${exercise?.id ?? 'none'}-${step.setIndex ?? 0}`;

  useEffect(() => {
    setTempoSkipped(false);
    setReps(prescription?.repetitions?.toString() ?? '');
    const suggestedAltLoad = activeAlternative?.suggestedLoadKg?.(prescription?.loadKg);
    setLoad(suggestedAltLoad ? suggestedAltLoad.toString() : (prescription?.loadKg?.toString() ?? ''));
    setDuration(prescription?.durationSeconds?.toString() ?? '');
  }, [stepKey, activeAlternative]);

  useEffect(() => {
    if (isComplete) return;
    const update = () =>
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - Date.parse(session.startedAt)) / 1000)));
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
  const progression = useMemo(
    () => (exercise ? computeProgressiveOverload(exercise, history) : null),
    [exercise?.id, history],
  );
  /** L'athlète a demandé d'alléger à son dernier passage sur ce mouvement. */
  const allegementDemande = useMemo(
    () => (exercise ? demandeAllegement(exercise, history) : false),
    [exercise?.id, history],
  );
  const ghostPerf = useMemo(
    () => (exercise && step.setIndex !== undefined ? findGhostPerformance(history, exercise.id, step.setIndex) : null),
    [exercise?.id, step.setIndex, history],
  );
  const currentLoadVal = parseSafeFloat(load, 0);
  const ghostSummary = ghostPerf ? formatGhostPerformance(ghostPerf) : '';
  const ghostDelta =
    ghostPerf && ghostPerf.loadKg !== undefined && load.trim() !== ''
      ? formatGhostDelta(currentLoadVal, ghostPerf.loadKg)
      : null;
  // Séries restantes pour l'exercice à venir (la série affichée comprise).
  const remainingForExercise =
    step.kind === 'exercise' && step.exerciseIndex !== undefined
      ? steps.filter(
          (candidate) =>
            candidate.kind === 'exercise' &&
            candidate.exerciseIndex === step.exerciseIndex &&
            (candidate.sequenceIndex ?? 0) >= (step.sequenceIndex ?? 0),
        ).length
      : 0;
  const warmupSteps = useMemo(
    () => (prescription?.loadKg ? generateWarmupRamp(prescription.loadKg, exercise?.id) : []),
    [prescription?.loadKg, exercise?.id],
  );
  const [showWarmupRamp, setShowWarmupRamp] = useState(false);
  // Liste des exercices consultable à tout moment pendant la séance.
  const [planOpen, setPlanOpen] = useState(false);

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

  // Retour anticipé placé APRÈS tous les hooks : un retour avant un hook faisait
  // varier le nombre de hooks appelés en fin de séance (React : « Rendered fewer
  // hooks than expected »), ce qui cassait l'écran de bilan.
  if (isComplete) return <CompletionFeedback session={session} onFinish={onFinish} />;

  return (
    <section className="content workout-content">
      {onSwitchDuoProfile && (
        <div className="duo-wrapper">
          <div className="duo-switcher-bar">
            <button
              type="button"
              className={`duo-pill-btn ${profile === 'ottman' ? 'active' : ''}`}
              onClick={() => onSwitchDuoProfile('ottman')}
            >
              <span>
                <Bolt size={15} /> Ottman
              </span>
              {profile === 'ottman' && <span className="duo-pill-badge">en cours</span>}
            </button>
            <button
              type="button"
              className={`duo-pill-btn ${profile === 'laura' ? 'active' : ''}`}
              onClick={() => onSwitchDuoProfile('laura')}
            >
              <span>
                <Person size={15} /> Laura
              </span>
              {profile === 'laura' && <span className="duo-pill-badge">en cours</span>}
            </button>
          </div>
          {partnerDelta && partnerDelta.action !== 'keep' && (
            <div className="duo-delta-banner">
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
              <span>Alternative active (original : {exercise?.name})</span>
              {onRevertAlternative && (
                <button type="button" className="revert-alt-btn" onClick={() => onRevertAlternative(exercise!.id)}>
                  <Undo size={13} /> Revenir à la machine
                </button>
              )}
            </div>
          )}
        </div>
        <div className="workout-status">
          <span className="session-elapsed">
            <Clock size={14} /> Total {formatDuration(elapsedSeconds)}
          </span>
          <button
            type="button"
            className="progress-pill progress-pill-action"
            onClick={() => setPlanOpen(true)}
            aria-label={`Voir la liste des exercices de la séance (${completedInDay + 1} sur ${totalSets})`}
          >
            <List size={14} />
            {completedInDay + 1} / {totalSets}
          </button>
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
              <div className={`exercise-illustration${movementMedia.start ? ' animated' : ' single'}`}>
                {movementMedia.start ? (
                  <>
                    {/* Les deux positions alternent : le mouvement se lit sans vidéo
                        ni GIF, hors ligne, avec des visuels déjà sous licence. */}
                    <img
                      className="movement-frame frame-start"
                      src={movementMedia.start}
                      alt={`Position de départ : ${exercise.name}`}
                      decoding="async"
                    />
                    <img
                      className="movement-frame frame-peak"
                      src={movementMedia.peak ?? movementMedia.start}
                      alt={`Position finale : ${exercise.name}`}
                      decoding="async"
                    />
                  </>
                ) : (
                  <img
                    src={movementMedia.main ?? movementMedia.start ?? ''}
                    alt={`Illustration : ${exercise.name}`}
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
                <b>
                  {formatLoadKg(activeAlternative?.suggestedLoadKg?.(prescription.loadKg) ?? prescription.loadKg)} kg
                </b>
              )}
            </div>

            {/* Ce mouvement n'a pas d'illustration honnête : l'espace que l'image
                occuperait accueille le repère clé du tutoriel — du contenu réel
                plutôt qu'un vide au milieu de la carte. */}
            {!movementMedia && tutorials[exercise.id]?.keyCue && (
              <p className="key-cue-strip">
                <span className="eyebrow">REPÈRE CLÉ</span>
                <span>{tutorials[exercise.id]?.keyCue}</span>
              </p>
            )}

            {/* Calculateur de disques par côté avec tare automatique */}
            {prescription.loadKg !== undefined && prescription.loadKg >= 20 && !activeAlternative && (
              <PlateBadge totalLoadKg={currentLoadVal || prescription.loadKg} exerciseId={exercise.id} />
            )}

            {/* Surcharge progressive conseillée : par l'aisance, ou parce qu'elle a été demandée */}
            {progression && prescription.phase !== 'warmup' && (
              <div className="progression-hint-banner">
                <span className="prog-pill">{progression.source === 'demande' ? 'Ta consigne' : 'Défi coach'}</span>
                <span>
                  {progression.source === 'demande' ? (
                    <>
                      Tu avais demandé à charger plus : <strong>{progression.suggestedLoadKg} kg</strong> (+
                      {progression.incrementKg} kg)
                    </>
                  ) : (
                    <>
                      Objectif suggéré : <strong>{progression.suggestedLoadKg} kg</strong> (+{progression.incrementKg}{' '}
                      kg)
                    </>
                  )}
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

            {/* Demande d'allègement : la charge prescrite ne bouge pas, mais on le dit */}
            {allegementDemande && prescription.phase !== 'warmup' && (
              <p className="progression-allgement">
                Tu as demandé d’alléger la dernière fois. La charge reste celle du coach : soigne la technique et arrête
                la série dès que l’effort dépasse 8 sur 10.
              </p>
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
                  <span>
                    <Bolt size={16} /> Montée en gamme conseillée ({warmupSteps.length} paliers)
                  </span>
                  <small>{showWarmupRamp ? 'Masquer' : 'Afficher'}</small>
                </button>
                {showWarmupRamp && (
                  <div className="warmup-ramp-list">
                    {warmupSteps.map((ws) => (
                      <div key={ws.stepIndex} className="warmup-ramp-step">
                        <div className="warmup-ramp-info">
                          <span className="warmup-ramp-badge">
                            Palier {ws.stepIndex} · {ws.percentage}%
                          </span>
                          <strong>
                            {formatLoadKg(ws.loadKg)} kg × {ws.repetitions} réps
                          </strong>
                          <small>
                            {ws.purpose} · Repos {ws.restSeconds}s
                          </small>
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

          {/* Le compteur vit AU-DESSUS du formulaire et se colle en haut de
              l'écran : le temps reste lisible pendant qu'on fait défiler pour
              relire le mouvement. Pendant le repos il s'efface, le cockpit de
              repos affiche déjà son propre décompte. */}
          {prescription.durationSeconds && !resting ? (
            <div className="tempo-band">
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
            </div>
          ) : null}

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
                <div className="rest-next-preview-card" role="group" aria-label="À préparer pendant ton repos">
                  <div className="rest-next-header">
                    <span className="rest-next-badge">PROCHAINE SÉRIE</span>
                    <span className="rest-next-series">Série {(step.setIndex ?? 0) + 1}</span>
                  </div>
                  <div className="rest-next-name">{exercise.name}</div>
                  <div className="rest-next-meta">
                    <span className="rest-next-remaining">
                      {remainingForExercise > 1
                        ? `${remainingForExercise} séries restantes`
                        : remainingForExercise === 1
                          ? 'Dernière série de l’exercice'
                          : ''}
                    </span>
                    <span className="rest-next-target">
                      {prescription.durationSeconds !== undefined
                        ? `${prescription.durationSeconds} s`
                        : prescription.repetitions !== undefined
                          ? `${prescription.repetitions} répétitions`
                          : (prescription.loadLabel ?? '')}
                    </span>
                  </div>
                  {prescription.loadKg !== undefined && (
                    <div className="rest-next-prep">
                      <span className="rest-next-load">
                        Charge prévue : <strong>{formatLoadKg(prescription.loadKg)} kg</strong>
                      </span>
                      {prescription.loadKg >= 20 && (
                        <PlateBadge totalLoadKg={prescription.loadKg} exerciseId={exercise.id} />
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="log-card compact">
              <div className="log-card-heading">
                <span>Ta performance</span>
                <small>
                  {prescription.durationSeconds && !tempoReady
                    ? 'Ajuste en 1 tap ou valide directement'
                    : 'Ajuste en 1 tap ou tape la valeur'}
                </small>
              </div>

              {/* Repère de la dernière fois : visible juste au-dessus du champ,
                  avec l'écart par rapport à la charge saisie. */}
              {ghostPerf && ghostSummary && (
                <div className="ghost-perf-strip">
                  <Repeat size={14} className="ghost-icon" />
                  <span className="ghost-perf-text">
                    Dernière fois : <strong>{ghostSummary}</strong>
                  </span>
                  {ghostDelta && (
                    <span className={`ghost-delta${ghostDelta.atParity ? ' at-parity' : ''}`}>{ghostDelta.label}</span>
                  )}
                </div>
              )}

              <div className="input-row-modern">
                {prescription.durationSeconds ? (
                  <div className="stepper-group">
                    <span className="stepper-label">Durée (secondes)</span>
                    <div className="stepper-controls">
                      <button type="button" className="step-btn" onClick={() => handleAdjustDuration(-5)}>
                        -5s
                      </button>
                      <input
                        aria-label="Durée (secondes)"
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
                        aria-label="Répétitions réalisées"
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
                      <button
                        type="button"
                        className="step-btn"
                        aria-label={`Diminuer la charge de ${etiquettePalier(paliers.grand)} kg`}
                        onClick={() => handleAdjustLoad(-paliers.grand)}
                      >
                        −{etiquettePalier(paliers.grand)}
                      </button>
                      <button
                        type="button"
                        className="step-btn"
                        aria-label={`Diminuer la charge de ${etiquettePalier(paliers.fin)} kg`}
                        onClick={() => handleAdjustLoad(-paliers.fin)}
                      >
                        −{etiquettePalier(paliers.fin)}
                      </button>
                      <input
                        aria-label="Charge (kg)"
                        inputMode="decimal"
                        className="stepper-input"
                        value={load}
                        onChange={(e) => setLoad(e.target.value)}
                      />
                      <button
                        type="button"
                        className="step-btn"
                        aria-label={`Augmenter la charge de ${etiquettePalier(paliers.fin)} kg`}
                        onClick={() => handleAdjustLoad(+paliers.fin)}
                      >
                        +{etiquettePalier(paliers.fin)}
                      </button>
                      <button
                        type="button"
                        className="step-btn"
                        aria-label={`Augmenter la charge de ${etiquettePalier(paliers.grand)} kg`}
                        onClick={() => handleAdjustLoad(+paliers.grand)}
                      >
                        +{etiquettePalier(paliers.grand)}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <button
                type="button"
                className="primary-button full action-bar"
                onClick={() => void handleCompleteSet()}
                disabled={isSubmitting}
              >
                <Check size={20} weight="bold" /> {isSubmitting ? 'Enregistrement…' : 'Valider la série'}
              </button>
            </div>
          )}
        </>
      )}

      <div className="next-hint">
        <ArrowRight size={16} /> Ensuite : {nextExercise?.name ?? 'fin de séance'}
      </div>

      <SessionPlanSheet
        open={planOpen}
        onOpenChange={setPlanOpen}
        dayName={day.name}
        exercises={exercises}
        loggedSets={session.loggedSets}
        currentExerciseIndex={step.kind === 'exercise' ? step.exerciseIndex : undefined}
      />
    </section>
  );
}
