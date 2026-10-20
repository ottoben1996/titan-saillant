import { useEffect, useMemo, useRef, useState } from 'react';
import { equipmentAlternatives } from '../../domain/alternatives';
import { getProgram } from '../../domain/programs';
import { tutorials } from '../../domain/tutorials';
import type { ProfileId, SessionTimerState, WorkoutDay, WorkoutSession } from '../../domain/types';
import { getExerciseRecommendation } from '../../workout/coaching';
import { calculatePlateDelta } from '../../workout/duoManager';
import { etiquettePalier, paliersDeCharge } from '../../workout/loadSteps';
import { computeProgressiveOverload, demandeAllegement } from '../../workout/progressionEngine';
import { estReporte, getNextStep, getWorkoutExercises, getWorkoutSteps } from '../../workout/runner';
import { parseSafeFloat, parseSafeInt } from '../../workout/sanitizer';
import { formatLoadKg } from '../../workout/summary';
import { generateWarmupRamp } from '../../workout/warmupRamp';
import { ImpossibleSheet } from '../modals/ImpossibleSheet';
import { SessionPlanSheet } from '../modals/SessionPlanSheet';
import { ExerciseTimer } from '../timers/ExerciseTimer';
import { formatDuration, RestTimer } from '../timers/RestTimer';
import {
  ArrowRight,
  Barbell,
  Bolt,
  ChartLine,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Ellipsis,
  List,
  Minus,
  Plus,
  Repeat,
  Undo,
  Video,
} from '../ui/Icons';
import { NombreAnime } from '../ui/NombreAnime';
import { PlateBadge } from '../ui/PlateBadge';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../ui/Sheet';
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
    // Seules les séances TERMINÉES servent de repère : la séance en cours est
    // dans l'historique, rafraîchie après chaque série. Sans ce filtre, la série
    // faite cinq minutes plus tôt dans la même séance s'affichait comme « la
    // dernière fois », et l'athlète se comparait à lui-même.
    if (!s.completedAt) continue;
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
  day: WorkoutDay;
  session: WorkoutSession;
  history?: WorkoutSession[];
  resting: boolean;
  restSeconds: number;
  timerSuspended: boolean;
  modalOpen?: boolean;
  onTimerStateChange: (state: SessionTimerState | null) => void;
  onTimerDone: (kind?: 'rest' | 'tempo', manuel?: boolean) => void;
  onCompleteSet: (values: { repetitions?: number; durationSeconds?: number; loadKg?: number }) => Promise<void>;
  onTutorial: (id: string) => void;
  /** Ouvre la fiche de progression du mouvement en cours. */
  onOpenExercise: (id: string) => void;
  onAlternative: (id: string) => void;
  /** Passe l'exercice en cours sans rien enregistrer (machine occupée, pas d'alternative). */
  onSkipExercise: () => void;
  /** Annule la dernière série validée : le seul moyen de rattraper un appui de trop. */
  onUndoSet: () => void;
  /** Reporte l'exercice en cours à plus tard (machine occupée), sans rien abandonner. */
  onDeferExercise: () => void;
  /** Va directement à un exercice choisi dans la liste — le retour sur un reporté. */
  onJumpToExercise: (exerciseId: string) => void;
  onSessionChange?: (session: WorkoutSession) => void;
  onRevertAlternative?: (id: string) => void;
  // Les réglages détaillés restent disponibles via un panneau repliable.
  onFinish: (
    feedback?: Pick<
      WorkoutSession,
      'perceivedExertion' | 'energy' | 'pain' | 'painLocation' | 'loadConsigne' | 'notes'
    >,
  ) => Promise<void>;
}

export function WorkoutScreen({
  profile,
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
  onOpenExercise,
  onAlternative,
  onSkipExercise,
  onUndoSet,
  onDeferExercise,
  onJumpToExercise,
  onSessionChange,
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
  const [recommendationDismissed, setRecommendationDismissed] = useState(false);
  const [timerRestartNonce, setTimerRestartNonce] = useState(0);
  const [loadDirty, setLoadDirty] = useState(false);
  const [durationDirty, setDurationDirty] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Le chemin rapide d'abord : les paliers fins restent derrière « Réglages fins ».
  const [advancedInputsOpen, setAdvancedInputsOpen] = useState(false);
  /** Série tout juste validée, annulable quelques secondes depuis la pastille. */
  const [annulable, setAnnulable] = useState<{ numero: number; id: number } | null>(null);

  const isComplete = step.kind === 'complete';
  const [elapsedSeconds, setElapsedSeconds] = useState(() =>
    Math.max(0, Math.floor((Date.now() - Date.parse(session.startedAt)) / 1000)),
  );

  const stepKey = `${exercise?.id ?? 'none'}-${step.setIndex ?? 0}`;

  /**
   * La charge telle qu'elle doit s'afficher : convertie si une alternative est
   * active.
   *
   * La carte de repos lisait la charge de la machine d'origine — les ratios de
   * conversion vont de ×0,25 à ×1,5 — au moment précis où l'on va charger les
   * disques. Le repère « Dernière fois » et la carte principale convertissaient
   * déjà ; seule la carte de préparation avait été oubliée.
   */
  const chargeAffichee = activeAlternative?.suggestedLoadKg?.(prescription?.loadKg) ?? prescription?.loadKg;

  /**
   * L'exercice en cours avait-il été reporté plus tôt ?
   *
   * Oui veut dire : la machine était prise, on y revient maintenant. Le dire à
   * l'écran évite l'impression de refaire un mouvement déjà fait.
   */
  const reporte = estReporte(session, day);

  useEffect(() => {
    setAdvancedInputsOpen(false);
    setTempoSkipped(false);
    setReps(prescription?.repetitions?.toString() ?? '');
    const suggestedAltLoad = activeAlternative?.suggestedLoadKg?.(prescription?.loadKg);
    setLoad(suggestedAltLoad ? suggestedAltLoad.toString() : (prescription?.loadKg?.toString() ?? ''));
    setDuration(prescription?.durationSeconds?.toString() ?? '');
    setLoadDirty(false);
    setDurationDirty(false);
    setTimerRestartNonce(0);
  }, [stepKey, activeAlternative]);

  useEffect(() => {
    if (isComplete) return;
    const update = () =>
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - Date.parse(session.startedAt)) / 1000)));
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [isComplete, session.startedAt]);

  useEffect(() => {
    if (!annulable) return;
    const minuterie = window.setTimeout(() => setAnnulable(null), 5000);
    return () => window.clearTimeout(minuterie);
  }, [annulable]);

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
    setLoadDirty(true);
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
    setDurationDirty(true);
    setTimerRestartNonce((value) => value + 1);
    setTempoSkipped(false);
  };

  const isSubmittingRef = useRef(false);

  const handleCompleteSet = async () => {
    if (isSubmittingRef.current || isSubmitting) return;
    if (reps.trim() !== '' && Number.isNaN(parseSafeInt(reps, Number.NaN, 0, 200))) return;
    if (load.trim() !== '' && Number.isNaN(parseSafeFloat(load, Number.NaN, 0, 600))) return;
    if (duration.trim() !== '' && Number.isNaN(parseSafeInt(duration, Number.NaN, 0, 3600))) return;
    const numeroValide = (step.setIndex ?? 0) + 1;
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
      setAnnulable({ numero: numeroValide, id: Date.now() });
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
  // Même mouvement à l'étape suivante (bosu ×3) : nommer l'exercice qu'on fait
  // déjà se lisait comme une erreur. On annonce alors la série qui vient.
  const nextLabel =
    nextStep && nextStep.exerciseIndex === step.exerciseIndex && nextStep.setIndex !== undefined
      ? `série ${nextStep.setIndex + 1}`
      : (nextExercise?.name ?? 'fin de séance');
  const activeTimer = session.activeTimer;
  const matchingTimer =
    activeTimer && activeTimer.exerciseId === exercise?.id && activeTimer.setIndex === step.setIndex
      ? activeTimer
      : undefined;
  const tempoReady = !prescription?.durationSeconds || tempoSkipped || matchingTimer?.remainingSeconds === 0;

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
  const recommendation = useMemo(
    () =>
      exercise && !activeAlternative ? getExerciseRecommendation(exercise, history, { profileId: profile }) : null,
    [exercise, history, profile, activeAlternative],
  );
  useEffect(() => {
    setRecommendationDismissed(false);
  }, [stepKey]);
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
  /** Ouverte par « Je ne peux pas faire cet exercice » : les trois issues. */
  const [impossibleOpen, setImpossibleOpen] = useState(false);
  /** Menu « Plus d'options » : les actions secondaires, hors de la trajectoire du pouce. */
  const [menuOpen, setMenuOpen] = useState(false);
  // Le menu se referme avant d'agir : l'action ouvre une autre feuille ou change d'écran.
  const choisirOption = (action: () => void) => () => {
    setMenuOpen(false);
    action();
  };

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
  if (isComplete)
    return (
      <CompletionFeedback
        session={session}
        profileId={profile}
        history={history}
        onSessionChange={onSessionChange}
        onFinish={onFinish}
      />
    );

  return (
    <section className="content workout-content">
      <div className="workout-heading">
        {/* En-tête minimal : la phase, le nom entier, la progression, et un seul
            bouton pour tout le reste. Les trois pastilles d'action passaient sur
            deux lignes à 390 px, au-dessus de la prescription. */}
        <div className="workout-heading-ligne">
          <p className="eyebrow">{phaseLabel}</p>
          <span className="session-elapsed">
            <Clock size={13} />
            <span className="sr-only">Durée de la séance</span>
            {formatDuration(elapsedSeconds)}
          </span>
          <button
            type="button"
            className="icon-button workout-menu-btn"
            aria-label="Plus d’options"
            onClick={() => setMenuOpen(true)}
          >
            <Ellipsis size={22} />
          </button>
        </div>
        <h1>{activeAlternative ? activeAlternative.name : exercise?.name}</h1>
        {activeAlternative && (
          <p className="alternative-active-badge">{`Alternative active · original\u00a0: ${exercise?.name ?? ''}`}</p>
        )}
        <button type="button" className="workout-progress" onClick={() => setPlanOpen(true)}>
          <span className="workout-progress-texte">
            Exercice {(step.exerciseIndex ?? exercises.length - 1) + 1} sur {exercises.length}
            <span className="sr-only"> · voir la liste des exercices</span>
          </span>
          <span className="progress-track" aria-hidden="true">
            <i style={{ width: `${progress}%` }} />
          </span>
        </button>
      </div>

      {/* Le profil ne se change plus pendant la séance : le sélecteur vivait à
          quelques pixels sous le titre de l'exercice, dans la trajectoire du
          pouce — un appui de travers changeait d'espace au milieu d'une série.
          Le repère « Vers Laura » demeure : c'est une consigne du coach, pas une
          commande, et il ne change rien à l'espace où l'on s'entraîne. */}
      {partnerDelta && partnerDelta.action !== 'keep' && (
        <div className="duo-wrapper">
          <div className="duo-delta-banner">
            <span>
              Vers <strong>{partnerProfile === 'ottman' ? 'Ottman' : 'Laura'}</strong> : {partnerDelta.summaryLabel}
            </span>
          </div>
        </div>
      )}

      {exercise && prescription && (
        <>
          {/* Le tempo défile avec la page. Figé en haut, son anneau et ses deux
              boutons occupaient environ 330 px sur 844, en plus de la barre de
              validation : la consigne passait dessous, à moitié cachée. Il est
              en tête de colonne, donc visible dès l'arrivée sur la série. */}
          {prescription.durationSeconds && !resting ? (
            <ExerciseTimer
              key={`${exercise.id}-${step.setIndex}`}
              exerciseId={exercise.id}
              setIndex={step.setIndex!}
              durationSeconds={
                duration.trim() !== ''
                  ? parseSafeInt(duration, prescription.durationSeconds, 0, 3600)
                  : prescription.durationSeconds
              }
              initialState={matchingTimer?.kind === 'tempo' ? matchingTimer : undefined}
              suspended={timerSuspended}
              onStateChange={onTimerStateChange}
              onDone={() => {
                setTempoSkipped(true);
                onTimerDone('tempo');
              }}
              onSkip={() => setTempoSkipped(true)}
              restartNonce={timerRestartNonce}
            />
          ) : null}

          <div className={`prescription-card compact${resting ? ' repose' : ''}`}>
            {/* Décision A du 6 octobre : pendant le repos, la carte de la série
                terminée se réduit à cette seule ligne. Ce qui reste à l'écran est
                ce qui sert — le compte à rebours, ses boutons, et ce qu'il faut
                préparer pour la suite. */}
            {resting && (
              <p className="repose-line">
                <span>
                  Série {step.setIndex! + 1} validée
                  {reporte && <span className="report-chip">REPRISE</span>}
                </span>
                <strong>
                  {prescription.durationSeconds
                    ? `${prescription.durationSeconds} s`
                    : `${prescription.repetitions} répétitions`}
                  {prescription.loadKg !== undefined
                    ? ` · ${formatLoadKg(activeAlternative?.suggestedLoadKg?.(prescription.loadKg) ?? prescription.loadKg)} kg`
                    : ''}
                </strong>
              </p>
            )}
            <span className="eyebrow">
              {phaseLabel} · SÉRIE {step.setIndex! + 1}
              {reporte && <span className="report-chip">REPRISE</span>}
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

            {/* Calculateur de disques par côté avec tare automatique */}
            {prescription.loadKg !== undefined && prescription.loadKg >= 20 && !activeAlternative && (
              <PlateBadge totalLoadKg={currentLoadVal || prescription.loadKg} exerciseId={exercise.id} />
            )}

            {/* Rendue seulement quand elle propose un changement : « garder la
                prescription » prenait 180 px pour ne rien proposer. */}
            {recommendation &&
              recommendation.action !== 'maintain' &&
              prescription.phase !== 'warmup' &&
              !recommendationDismissed && (
                <div className="coaching-recommendation" role="region" aria-label="Recommandation du coach">
                  <div className="coaching-recommendation-copy">
                    <strong>
                      {recommendation.action === 'increase'
                        ? 'Progression possible'
                        : recommendation.action === 'reduce'
                          ? 'Priorité à la sécurité'
                          : 'Prescription à conserver'}
                    </strong>
                    <span>{recommendation.reason}</span>
                    <small>
                      Confiance{'\u00a0'}:{' '}
                      {recommendation.confidence === 'high'
                        ? 'élevée'
                        : recommendation.confidence === 'medium'
                          ? 'moyenne'
                          : 'prudente'}
                    </small>
                  </div>
                  <div className="coaching-recommendation-actions">
                    {recommendation.action === 'increase' &&
                      (recommendation.suggestedLoadKg !== undefined ||
                        recommendation.suggestedDurationSeconds !== undefined) && (
                        <button
                          type="button"
                          className="coaching-apply-btn"
                          onClick={() => {
                            if (recommendation.suggestedLoadKg !== undefined && !loadDirty)
                              setLoad(String(recommendation.suggestedLoadKg));
                            if (recommendation.suggestedDurationSeconds !== undefined && !durationDirty) {
                              setDuration(String(recommendation.suggestedDurationSeconds));
                              setTimerRestartNonce((value) => value + 1);
                              setTempoSkipped(false);
                            }
                          }}
                        >
                          Appliquer à cette séance
                        </button>
                      )}
                    <button
                      type="button"
                      className="coaching-keep-btn"
                      onClick={() => setRecommendationDismissed(true)}
                    >
                      Garder la prescription
                    </button>
                  </div>
                </div>
              )}

            {/* Surcharge progressive conseillée : par l'aisance, ou parce qu'elle a été demandée */}
            {progression && prescription.phase !== 'warmup' && !recommendation && (
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
                  onClick={() => {
                    setLoad(progression.suggestedLoadKg.toString());
                    setLoadDirty(true);
                  }}
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
                          onClick={() => {
                            setLoad(ws.loadKg.toString());
                            setLoadDirty(true);
                          }}
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

          {/* Pendant le repos, le compte à rebours passe en tête (décision du
              6 octobre). Sa place mesurée était à 804 px sur un écran de 844, et
              il disparaissait entièrement sous la ligne de flottaison en 390 × 620.
              Il monte dans le DOM, pas seulement à l'écran : un `order` CSS donne
              le bon dessin et laisse l'ordre de lecture faux. */}
          {resting && exercise ? (
            <div className="rest-cockpit-container">
              <RestTimer
                exerciseId={exercise.id}
                setIndex={step.setIndex!}
                seconds={restSeconds}
                initialState={matchingTimer?.kind === 'rest' ? matchingTimer : undefined}
                suspended={Boolean(modalOpen)}
                onStateChange={onTimerStateChange}
                onDone={(manuel) => onTimerDone('rest', manuel)}
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
                  {chargeAffichee !== undefined && (
                    <div className="rest-next-prep">
                      <span className="rest-next-load">
                        Charge prévue :{' '}
                        <strong>
                          <NombreAnime
                            valeur={chargeAffichee}
                            decimals={Number.isInteger(chargeAffichee) ? 0 : 1}
                            suffixe="kg"
                          />
                        </strong>
                      </span>
                      <PlateBadge totalLoadKg={chargeAffichee} exerciseId={exercise.id} />
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
                    ? 'Lance le chrono, ou valide directement'
                    : 'Ajuste si besoin, puis valide'}
                </small>
              </div>

              {/* Repère de la dernière fois : visible juste au-dessus du champ,
                  avec l'écart par rapport à la charge saisie. */}
              {ghostPerf && ghostSummary && (
                <div className="ghost-perf-strip">
                  <Repeat size={14} className="ghost-icon" />
                  <span className="ghost-perf-text">
                    Dernière fois{'\u00a0'}: <strong>{ghostSummary}</strong>
                  </span>
                  {ghostDelta && (
                    <span className={`ghost-delta${ghostDelta.atParity ? ' at-parity' : ''}`}>{ghostDelta.label}</span>
                  )}
                </div>
              )}

              {/* Chemin rapide : la valeur principale et la charge, chacune avec
                  deux grands boutons ronds. Les paliers fins sont repliés. */}
              <div className="stepper-rapide">
                {prescription.durationSeconds ? (
                  <div className="stepper-group">
                    <span className="stepper-label">Durée (secondes)</span>
                    <div className="stepper-controls">
                      <button
                        type="button"
                        className="step-btn"
                        aria-label="Retirer 5 secondes"
                        onClick={() => handleAdjustDuration(-5)}
                      >
                        <Minus size={22} />
                      </button>
                      <input
                        aria-label="Durée (secondes)"
                        inputMode="numeric"
                        className="stepper-input"
                        value={duration}
                        onChange={(e) => {
                          setDuration(e.target.value);
                          setDurationDirty(true);
                          setTimerRestartNonce((value) => value + 1);
                          setTempoSkipped(false);
                        }}
                      />
                      <button
                        type="button"
                        className="step-btn"
                        aria-label="Ajouter 5 secondes"
                        onClick={() => handleAdjustDuration(+5)}
                      >
                        <Plus size={22} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="stepper-group">
                    <span className="stepper-label">Répétitions</span>
                    <div className="stepper-controls">
                      <button
                        type="button"
                        className="step-btn"
                        aria-label="Retirer une répétition"
                        onClick={() => handleAdjustReps(-1)}
                      >
                        <Minus size={22} />
                      </button>
                      <input
                        aria-label="Répétitions réalisées"
                        inputMode="numeric"
                        className="stepper-input"
                        value={reps}
                        onChange={(e) => setReps(e.target.value)}
                      />
                      <button
                        type="button"
                        className="step-btn"
                        aria-label="Ajouter une répétition"
                        onClick={() => handleAdjustReps(+1)}
                      >
                        <Plus size={22} />
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
                        className="step-btn pas-grand"
                        aria-label={`Diminuer la charge de ${etiquettePalier(paliers.grand)} kg`}
                        onClick={() => handleAdjustLoad(-paliers.grand)}
                      >
                        −{etiquettePalier(paliers.grand)}
                      </button>
                      <input
                        aria-label="Charge (kg)"
                        inputMode="decimal"
                        className="stepper-input"
                        value={load}
                        onChange={(e) => {
                          setLoad(e.target.value);
                          setLoadDirty(true);
                        }}
                      />
                      <button
                        type="button"
                        className="step-btn pas-grand"
                        aria-label={`Augmenter la charge de ${etiquettePalier(paliers.grand)} kg`}
                        onClick={() => handleAdjustLoad(+paliers.grand)}
                      >
                        +{etiquettePalier(paliers.grand)}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {prescription.loadKg !== undefined && (
                <>
                  <button
                    type="button"
                    className="reglages-fins-toggle"
                    aria-expanded={advancedInputsOpen}
                    aria-controls="workout-advanced-inputs"
                    onClick={() => setAdvancedInputsOpen((open) => !open)}
                  >
                    Réglages fins
                    <ChevronDown size={18} />
                  </button>
                  <div id="workout-advanced-inputs" className="reglages-fins" hidden={!advancedInputsOpen}>
                    <span className="stepper-label">Palier fin</span>
                    <div className="reglages-fins-pas">
                      <button
                        type="button"
                        className="step-btn pas-fin"
                        aria-label={`Diminuer la charge de ${etiquettePalier(paliers.fin)} kg`}
                        onClick={() => handleAdjustLoad(-paliers.fin)}
                      >
                        −{etiquettePalier(paliers.fin)} kg
                      </button>
                      <button
                        type="button"
                        className="step-btn pas-fin"
                        aria-label={`Augmenter la charge de ${etiquettePalier(paliers.fin)} kg`}
                        onClick={() => handleAdjustLoad(+paliers.fin)}
                      >
                        +{etiquettePalier(paliers.fin)} kg
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* Pendant le repos, la carte « PROCHAINE SÉRIE » dit déjà ce qui vient, et
          de plus près : deux repères simultanés pour la même question, c'est un
          de trop — c'est exactement là que la lecture décroche. */}
      {resting ? null : (
        <div className="next-hint">
          <ArrowRight size={16} /> Ensuite{'\u00a0'}: {nextLabel}
        </div>
      )}

      {/* Le seul élément collé de l'écran : la barre de verre de validation.
          Tant que le chrono du tempo n'est pas écoulé, c'est lui l'action
          principale ; la validation reste possible, en second plan. */}
      {exercise && prescription && !resting && (
        <div className="barre-validation verre">
          <button
            type="button"
            className={`primary-button full action-bar${prescription.durationSeconds && !tempoReady ? ' en-attente' : ''}`}
            onClick={() => void handleCompleteSet()}
            disabled={isSubmitting}
          >
            <Check size={20} weight="bold" /> {isSubmitting ? 'Enregistrement…' : 'Valider la série'}
          </button>
        </div>
      )}

      {annulable && (
        <div className="serie-validee" key={annulable.id}>
          <span role="status">Série {annulable.numero} validée</span>
          <button
            type="button"
            aria-label={`Annuler la série ${annulable.numero}`}
            onClick={() => {
              setAnnulable(null);
              onUndoSet();
            }}
          >
            Annuler
          </button>
        </div>
      )}

      <ImpossibleSheet
        open={impossibleOpen}
        onOpenChange={setImpossibleOpen}
        exerciseName={activeAlternative ? activeAlternative.name : (exercise?.name ?? '')}
        alternativeDisponible={Boolean(exercise && equipmentAlternatives[exercise.id] && !activeAlternative)}
        onDefer={onDeferExercise}
        onAlternative={() => {
          if (exercise) onAlternative(exercise.id);
        }}
        onSkip={onSkipExercise}
      />

      <SessionPlanSheet
        open={planOpen}
        onOpenChange={setPlanOpen}
        dayName={day.name}
        exercises={exercises}
        loggedSets={session.loggedSets}
        currentExerciseIndex={step.kind === 'exercise' ? step.exerciseIndex : undefined}
        deferredIds={session.deferredExerciseIds}
        onJumpToExercise={(identifiant) => {
          onJumpToExercise(identifiant);
          setPlanOpen(false);
        }}
        onSessionChange={(loggedSets) =>
          onSessionChange?.({ ...session, loggedSets, updatedAt: new Date().toISOString() })
        }
      />

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent className="action-sheet" onClose={() => setMenuOpen(false)}>
          <SheetHeader>
            <SheetTitle>{activeAlternative ? activeAlternative.name : (exercise?.name ?? 'Séance')}</SheetTitle>
            <SheetDescription>Options de l’exercice en cours</SheetDescription>
          </SheetHeader>
          <div className="liste-groupee">
            {exercise && tutorials[exercise.id] && (
              <button type="button" className="liste-ligne" onClick={choisirOption(() => onTutorial(exercise.id))}>
                <Video size={20} />
                <span>Tutoriel</span>
                <ChevronRight size={16} className="liste-chevron" />
              </button>
            )}
            {exercise && (
              <button type="button" className="liste-ligne" onClick={choisirOption(() => onOpenExercise(exercise.id))}>
                <ChartLine size={20} />
                <span>Fiche du mouvement</span>
                <ChevronRight size={16} className="liste-chevron" />
              </button>
            )}
            {exercise && exercise.kind !== 'cooldown' && (
              <button type="button" className="liste-ligne" onClick={choisirOption(() => setImpossibleOpen(true))}>
                <Barbell size={20} />
                <span>Je ne peux pas faire cet exercice</span>
                <ChevronRight size={16} className="liste-chevron" />
              </button>
            )}
            {session.loggedSets.length > 0 && (
              <button type="button" className="liste-ligne" onClick={choisirOption(onUndoSet)}>
                <Undo size={20} />
                <span>Annuler la dernière série</span>
                <ChevronRight size={16} className="liste-chevron" />
              </button>
            )}
            {exercise && activeAlternative && onRevertAlternative && (
              <button
                type="button"
                className="liste-ligne"
                onClick={choisirOption(() => onRevertAlternative(exercise.id))}
              >
                <Repeat size={20} />
                <span>Revenir à la machine</span>
                <ChevronRight size={16} className="liste-chevron" />
              </button>
            )}
            <button type="button" className="liste-ligne" onClick={choisirOption(() => setPlanOpen(true))}>
              <List size={20} />
              <span>Voir le plan de séance</span>
              <ChevronRight size={16} className="liste-chevron" />
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </section>
  );
}
