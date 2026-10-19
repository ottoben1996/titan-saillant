import { useMemo } from 'react';
import type { WeeklyMeasurement } from '../../domain/measurements';
import { PROGRAM_WEEKS } from '../../domain/programs';
import type { ProfileId, WorkoutDay, WorkoutPlan, WorkoutSession } from '../../domain/types';
import type { SerieAssiduite } from '../../workout/assiduite';
import { getWorkoutExercises } from '../../workout/runner';
import { type WeekSlotState, weeklyComparison, weekSlots, workoutDayLabel } from '../../workout/summary';
import { Check, Play, Trash } from '../ui/Icons';
import { NombreAnime } from '../ui/NombreAnime';

export const profileLabels: Record<ProfileId, string> = { ottman: 'Ottman', laura: 'Laura' };

const SLOT_STATES: Record<WeekSlotState, string> = {
  done: 'Terminée',
  today: 'Aujourd’hui',
  upcoming: 'À venir',
};

/** Le volume hebdomadaire cible : chaque profil a 4 créneaux prescrits. */
const WEEKLY_TARGET = 4;

/** Forfait d'une étape sans durée prescrite, en secondes. */
const FORFAIT_ETAPE_SECONDES = 120;
/** Marge hors séance : installation, transitions, réglage des machines. */
const MARGE_HORS_SEANCE_MINUTES = 12;

export type NextBestAction =
  | { kind: 'resume'; label: string; description: string }
  | { kind: 'workout'; label: string; description: string; day: WorkoutDay }
  | { kind: 'measurement'; label: string; description: string }
  | { kind: 'recovery'; label: string; description: string };

export function getNextBestAction(options: {
  program: WorkoutPlan;
  history: readonly WorkoutSession[];
  activeSession: WorkoutSession | null;
  measurements: readonly WeeklyMeasurement[];
  now?: Date;
}): NextBestAction {
  const { program, history, activeSession, measurements, now = new Date() } = options;
  if (activeSession && !activeSession.completedAt) {
    return { kind: 'resume', label: 'Reprendre la séance', description: 'Continue là où tu t’es arrêté.' };
  }
  const today = weekSlots(program.days, history, now).find((slot) => slot.state === 'today');
  if (today) {
    return { kind: 'workout', label: `Démarrer ${today.day.name}`, description: today.day.subtitle, day: today.day };
  }
  const latestMeasurement = [...measurements]
    .filter((item) => item.measuredOn)
    .sort((a, b) => Date.parse(b.measuredOn ?? '') - Date.parse(a.measuredOn ?? ''))[0];
  if (latestMeasurement && now.getTime() - Date.parse(latestMeasurement.measuredOn ?? '') >= 7 * 86_400_000) {
    return {
      kind: 'measurement',
      label: 'Faire ton point hebdomadaire',
      description: 'Mets à jour tes mesures pour suivre ta progression.',
    };
  }
  return {
    kind: 'recovery',
    label: 'Prendre un jour de récupération',
    description: 'Les créneaux sont validés. Marche, hydrate-toi et récupère.',
  };
}

/**
 * Durée annoncée d'une séance.
 *
 * Le compte se faisait sur un forfait de deux minutes par étape, quelle que soit
 * l'étape : la quatrième séance annonçait donc 28 min alors qu'elle prescrit
 * 15 min de rameur et 25 min de marche — la personne croyait y passer une
 * demi-heure, sur la plus longue séance du programme.
 *
 * On prend la PLUS GRANDE des deux valeurs, durée prescrite ou forfait, et non la
 * durée prescrite seule : le forfait de deux minutes couvre le temps réel d'une
 * série courte — exécution, récupération, réglage — et compter une planche de
 * 45 s pour 45 s ferait mentir l'annonce dans l'autre sens.
 */
export function estimatedMinutes(day: WorkoutDay) {
  const secondes = getWorkoutExercises(day).reduce(
    (total, exercise) =>
      total +
      exercise.sets.reduce((somme, set) => somme + Math.max(set.durationSeconds ?? 0, FORFAIT_ETAPE_SECONDES), 0),
    0,
  );
  return Math.max(1, Math.round(secondes / 60) + MARGE_HORS_SEANCE_MINUTES);
}

interface HomeScreenProps {
  profile: ProfileId;
  program: WorkoutPlan;
  history: WorkoutSession[];
  measurements?: WeeklyMeasurement[];
  onOpenFollowup?: () => void;
  onOpenProgression?: () => void;
  /** Vrai tant que la première lecture du stockage n'est pas revenue. */
  chargement?: boolean;
  activeSession: WorkoutSession | null;
  onStart: (day: WorkoutDay) => void;
  onReviewSlot?: (day: WorkoutDay) => void;
  onPreviewSlot?: (day: WorkoutDay) => void;
  onResume: () => void;
  /** Supprime la séance en cours (lancée par erreur). */
  onDiscard: () => void;
  /** Série de semaines complètes, calculée par l'application. */
  serie?: SerieAssiduite;
  /** Semaine de charges active, affichée dans le sous-titre. */
  programWeek?: number;
}

/** Anneau de la semaine : séances faites sur les créneaux prescrits. */
function WeekRing({ done, total }: { done: number; total: number }) {
  const rayon = 22;
  const circonference = 2 * Math.PI * rayon;
  const part = Math.min(1, done / total);
  return (
    <span
      className="week-ring"
      role="img"
      aria-label={`${done} séance${done > 1 ? 's' : ''} sur ${total} cette semaine`}
    >
      <svg viewBox="0 0 56 56" width="56" height="56" aria-hidden="true">
        <circle cx="28" cy="28" r={rayon} className="week-ring-fond" />
        <circle
          cx="28"
          cy="28"
          r={rayon}
          className="week-ring-arc"
          strokeDasharray={circonference}
          strokeDashoffset={circonference * (1 - part)}
        />
      </svg>
      <b aria-hidden="true">
        {done}/{total}
      </b>
    </span>
  );
}

export function HomeScreen({
  program,
  history,
  measurements = [],
  onOpenFollowup = () => undefined,
  onOpenProgression = () => undefined,
  chargement = false,
  activeSession,
  onStart,
  onReviewSlot = onOpenProgression,
  onPreviewSlot = () => undefined,
  onResume,
  onDiscard,
  serie,
  programWeek = 1,
}: HomeScreenProps) {
  const view = useMemo(() => {
    const now = new Date();
    const comparison = weeklyComparison(history, now);
    return {
      now,
      slots: weekSlots(program.days, history, now),
      weekSessions: comparison.current.sessions,
      weekVolume: comparison.current.volumeKg,
    };
  }, [program.days, history]);

  const nextAction = useMemo(
    () => getNextBestAction({ program, history, activeSession, measurements }),
    [program, history, activeSession, measurements],
  );
  const dateLabel = view.now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const ring = <WeekRing done={view.weekSessions} total={WEEKLY_TARGET} />;
  const seriesFaites = activeSession?.loggedSets.length ?? 0;
  const pluriel = seriesFaites > 1 ? 's' : '';

  return (
    <section className="content home-content">
      <header className="large-title">
        <h1>Aujourd’hui</h1>
        <p>
          {dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)} · Semaine {programWeek} sur {PROGRAM_WEEKS}
        </p>
      </header>

      {/* Première lecture du stockage : une silhouette, pas une page vide.
          Le lecteur d'écran n'a rien à annoncer d'un dessin. */}
      {chargement && (
        <div className="loading-status" role="status" aria-live="polite">
          Chargement de ton accueil…
        </div>
      )}
      {chargement && (
        <div className="skeleton-card" aria-hidden="true">
          <span className="skeleton-line short" />
          <span className="skeleton-line strong" />
          <span className="skeleton-line" />
          <span className="skeleton-line half" />
        </div>
      )}

      {/* Une seule carte, une seule action dominante : ce qu'il y a à faire maintenant. */}
      {!chargement && (
        <article className="hero-card" aria-labelledby="hero-title">
          {nextAction.kind === 'resume' && (
            <>
              <div className="hero-head">
                <div>
                  <p className="eyebrow">SÉANCE EN COURS</p>
                  <h2 id="hero-title">{activeSession ? workoutDayLabel(activeSession.dayId) : nextAction.label}</h2>
                  <p className="hero-sub">
                    {`${seriesFaites} série${pluriel} déjà validée${pluriel}`} · {nextAction.description}
                  </p>
                </div>
                {ring}
              </div>
              <div className="hero-actions">
                <button
                  className="primary-button"
                  type="button"
                  onClick={onResume}
                  aria-label="Reprendre la séance en cours"
                >
                  <Play size={18} weight="fill" /> Reprendre
                </button>
                <button type="button" className="resume-discard" onClick={onDiscard} aria-label="Supprimer la séance">
                  <Trash size={18} />
                </button>
              </div>
            </>
          )}
          {nextAction.kind === 'workout' && (
            <>
              <div className="hero-head">
                <div>
                  <p className="eyebrow">SÉANCE DU JOUR</p>
                  <h2 id="hero-title">{nextAction.day.name}</h2>
                  <p className="hero-sub">{nextAction.description}</p>
                </div>
                {ring}
              </div>
              <p className="hero-meta">
                {nextAction.day.exercises.length} mouvement{nextAction.day.exercises.length > 1 ? 's' : ''} · ≈{' '}
                {estimatedMinutes(nextAction.day)} min
              </p>
              <button
                className="primary-button full"
                type="button"
                onClick={() => onStart(nextAction.day)}
                aria-label={`Commencer ${nextAction.day.name}, ${estimatedMinutes(nextAction.day)} min`}
              >
                <Play size={18} weight="fill" /> Commencer
              </button>
            </>
          )}
          {nextAction.kind === 'measurement' && (
            <>
              <div className="hero-head">
                <div>
                  <p className="eyebrow">POINT HEBDOMADAIRE</p>
                  <h2 id="hero-title">{nextAction.label}</h2>
                  <p className="hero-sub">{nextAction.description}</p>
                </div>
                {ring}
              </div>
              <button
                className="primary-button full"
                type="button"
                onClick={onOpenFollowup}
                aria-label="Faire le point hebdomadaire"
              >
                Faire le point
              </button>
            </>
          )}
          {nextAction.kind === 'recovery' && (
            <>
              <div className="hero-head">
                <div>
                  <p className="eyebrow">SEMAINE COMPLÈTE</p>
                  <h2 id="hero-title">{nextAction.label}</h2>
                  <p className="hero-sub">{nextAction.description}</p>
                </div>
                {ring}
              </div>
              <button className="primary-button full" type="button" onClick={onOpenProgression}>
                Voir mes progrès
              </button>
            </>
          )}
        </article>
      )}

      {!chargement && (
        <nav className="home-section" aria-label="Créneaux de la semaine en cours">
          <h2 className="section-title">Cette semaine</h2>
          <div className="week-rail">
            {view.slots.map((slot) => {
              const actionLabel =
                slot.state === 'done'
                  ? `Revoir ${slot.day.name}`
                  : slot.state === 'upcoming'
                    ? `Prévisualiser ${slot.day.name}`
                    : `Commencer ${slot.day.name}`;
              const handleSlot = () =>
                slot.state === 'done'
                  ? onReviewSlot(slot.day)
                  : slot.state === 'upcoming'
                    ? onPreviewSlot(slot.day)
                    : onStart(slot.day);
              return (
                <button
                  key={slot.day.id}
                  type="button"
                  className={`week-slot ${slot.state}`}
                  onClick={handleSlot}
                  aria-label={`${actionLabel} — ${SLOT_STATES[slot.state]}`}
                >
                  <span className="week-slot-state" aria-hidden="true">
                    {slot.state === 'done' ? <Check size={14} weight="bold" /> : null}
                  </span>
                  <span className="week-slot-name">{slot.day.name}</span>
                  <small>{SLOT_STATES[slot.state]}</small>
                </button>
              );
            })}
          </div>
        </nav>
      )}

      {/* Deux repères sur la même période, pour qu'ils se lisent ensemble. */}
      {!chargement && (
        <div className="home-metrics">
          <div className="home-metric">
            <span>Séances</span>
            <strong>
              <NombreAnime valeur={view.weekSessions} decimals={0} />
              <small> / {WEEKLY_TARGET}</small>
            </strong>
            <small>cette semaine</small>
          </div>
          <div className="home-metric">
            <span>Volume</span>
            <strong>
              <NombreAnime valeur={view.weekVolume} decimals={0} />
              <small> kg·rép.</small>
            </strong>
            <small>cette semaine</small>
          </div>
        </div>
      )}

      {/* Série de semaines complètes : un repère de régularité, jamais un score. */}
      {!chargement && serie && serie.seancesFaites > 0 && (
        <aside className="streak-card" aria-label="Régularité">
          <strong>
            {serie.semainesConsecutives > 0
              ? `${serie.semainesConsecutives} semaine${serie.semainesConsecutives > 1 ? 's' : ''} d’affilée`
              : 'Aucune semaine complète'}
          </strong>
          <small>{serie.seancesFaites} séances sur 8 semaines</small>
          {/* Le détail est déjà écrit : ces points le répètent visuellement. */}
          <div className="streak-weeks" aria-hidden="true">
            {serie.semaines.map((semaine) => (
              <i key={semaine.decalage} className={semaine.faite ? 'fait' : ''} />
            ))}
          </div>
        </aside>
      )}
    </section>
  );
}
