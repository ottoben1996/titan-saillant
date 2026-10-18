import { useMemo } from 'react';
import type { WeeklyMeasurement } from '../../domain/measurements';
import type { getProgram } from '../../domain/programs';
import type { ProfileId, WorkoutDay, WorkoutSession } from '../../domain/types';
import type { SerieAssiduite } from '../../workout/assiduite';
import { getWorkoutExercises } from '../../workout/runner';
import {
  formatVolume,
  startOfWeek,
  volumeLastDays,
  type WeekSlotState,
  weeklyComparison,
  weekSlots,
} from '../../workout/summary';
import { ProgramLoadCard } from '../ProgramLoadCard';
import { ArrowRight, Bolt, Check, Clock, DownloadSimple, Play, Trash } from '../ui/Icons';

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
  program: ReturnType<typeof getProgram>;
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
  program: ReturnType<typeof getProgram>;
  /** Programme d'origine affiché dans la feuille des charges prescrites. */
  prescribedProgram?: ReturnType<typeof getProgram>;
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
  programWeek?: number;
  onProgramWeekChange?: (week: number) => void;
  /** Présent seulement quand les données méritent d'être mises à l'abri. */
  sauvegarde?: {
    sessions: number;
    joursDepuisExport?: number;
    onExport: () => void;
    onLater: () => void;
  };
}

export function HomeScreen({
  profile,
  program,
  prescribedProgram = program,
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
  sauvegarde,
  serie,
  programWeek = 1,
  onProgramWeekChange = () => undefined,
}: HomeScreenProps) {
  const view = useMemo(() => {
    const now = new Date();
    const slots = weekSlots(program.days, history, now);
    const comparison = weeklyComparison(history, now);
    const isResuming = Boolean(activeSession && !activeSession.completedAt);
    const todaySlot = slots.find((slot) => slot.state === 'today') ?? null;
    return {
      weekStart: startOfWeek(now),
      slots,
      todaySlot,
      isResuming,
      weekSessions: comparison.current.sessions,
      weekVolume: comparison.current.volumeKg,
      volume7Days: volumeLastDays(history, now),
    };
  }, [program.days, history, activeSession]);

  const weekProgress = Math.min(100, (view.weekSessions / WEEKLY_TARGET) * 100);
  const todaySlot = view.todaySlot;
  const nextAction = useMemo(
    () => getNextBestAction({ program, history, activeSession, measurements }),
    [program, history, activeSession, measurements],
  );
  const weekStartLabel = view.weekStart.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
  });

  return (
    <section className="content home-content">
      {/* En-tête compact : aucun espace mort avant l'action principale. */}
      <header className="home-head">
        <div>
          <p className="eyebrow">SEMAINE DU {weekStartLabel.toUpperCase()}</p>
          <h1>Bonjour {profileLabels[profile]}</h1>
        </div>
        <div className={`avatar avatar-${profile}`} aria-hidden="true">
          {profileLabels[profile][0]}
        </div>
      </header>

      {view.isResuming && (
        <div className="resume-banner-wrap">
          <button className="resume-banner" onClick={onResume} type="button">
            <span className="resume-icon">
              <Play size={18} weight="fill" />
            </span>
            <span>
              <strong>Séance en cours</strong>
              <small>
                {activeSession?.loggedSets.length ?? 0} séries déjà validées — reprendre là où tu t’es arrêté
              </small>
            </span>
            <ArrowRight size={20} />
          </button>
          <button type="button" className="resume-discard" onClick={onDiscard} aria-label="Supprimer la séance">
            <Trash size={17} />
          </button>
        </div>
      )}

      {!chargement && !view.isResuming && nextAction.kind !== 'workout' && (
        <article className="next-action-card" aria-labelledby="next-action-title">
          <p className="eyebrow">À FAIRE MAINTENANT</p>
          <h2 id="next-action-title">{nextAction.label}</h2>
          <p>{nextAction.description}</p>
          {nextAction.kind === 'measurement' && (
            <button
              className="primary-button"
              type="button"
              onClick={onOpenFollowup}
              aria-label="Ouvrir le suivi hebdomadaire"
            >
              Faire le point
            </button>
          )}
          {nextAction.kind === 'recovery' && (
            <button
              className="primary-button"
              type="button"
              onClick={onOpenProgression}
              aria-label="Voir ma progression"
            >
              Voir ma progression
            </button>
          )}
        </article>
      )}

      {/* Le suivi ne vit que dans ce téléphone : on propose de le mettre à l'abri. */}
      {sauvegarde && (
        <aside className="backup-card">
          <div>
            <p className="eyebrow">SAUVEGARDE</p>
            <strong>Ton suivi n'existe que sur ce téléphone</strong>
            <small>
              {sauvegarde.sessions} séances enregistrées
              {sauvegarde.joursDepuisExport !== undefined
                ? ` · dernière sauvegarde il y a ${sauvegarde.joursDepuisExport} jours`
                : ' · jamais sauvegardé'}
            </small>
          </div>
          <div className="backup-actions">
            <button type="button" className="primary-button" onClick={sauvegarde.onExport}>
              <DownloadSimple size={16} /> Exporter
            </button>
            <button type="button" className="text-button" onClick={sauvegarde.onLater}>
              Plus tard
            </button>
          </div>
        </aside>
      )}

      {/* Action dominante : la séance du jour, ou l'état « semaine complète ». */}
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

      {!chargement && !view.isResuming && todaySlot && (
        <article className="today-card">
          <div className="today-card-head">
            <p className="eyebrow">LA SÉANCE DU JOUR</p>
            <span className="tag">
              {todaySlot.day.exercises.length} mouvement
              {todaySlot.day.exercises.length > 1 ? 's' : ''}
            </span>
          </div>
          <h2>{todaySlot.day.name}</h2>
          <p className="today-card-sub">{todaySlot.day.subtitle}</p>
          <div className="today-card-foot">
            <span className="today-meta">
              <Clock size={16} /> ≈ {estimatedMinutes(todaySlot.day)} min
            </span>
            <button className="primary-button today-cta" onClick={() => onStart(todaySlot.day)} type="button">
              <Play size={18} weight="fill" /> Démarrer {todaySlot.day.name} · {estimatedMinutes(todaySlot.day)} min
            </button>
          </div>
        </article>
      )}

      {!view.isResuming && !todaySlot && (
        <article className="today-card done" aria-labelledby="week-complete-title">
          <p className="eyebrow">SEMAINE COMPLÈTE</p>
          <h2 id="week-complete-title">Les {WEEKLY_TARGET} créneaux sont validés</h2>
          <p className="today-card-sub">
            Rien d’obligatoire aujourd’hui. Tu peux revoir ta progression ou refaire une séance si tu te sens frais.
          </p>
          <button className="primary-button" type="button" onClick={onOpenProgression}>
            Revoir ma progression
          </button>
        </article>
      )}

      {!chargement && (
        <ProgramLoadCard program={prescribedProgram} week={programWeek} onWeekChange={onProgramWeekChange} />
      )}

      {/* Série de semaines complètes : un repère de régularité, jamais un score. */}
      {serie && serie.seancesFaites > 0 && (
        <aside className="streak-card">
          <div className="streak-head">
            <p className="eyebrow">RÉGULARITÉ</p>
            <strong>
              {serie.semainesConsecutives > 0
                ? `${serie.semainesConsecutives} semaine${serie.semainesConsecutives > 1 ? 's' : ''} d’affilée`
                : 'Aucune semaine complète'}
            </strong>
          </div>
          {/* Le détail semaine par semaine est déjà écrit juste au-dessus : ces
              points le répètent visuellement, ils n'ajoutent rien à lire. */}
          <div className="streak-weeks" aria-hidden="true">
            {serie.semaines.map((semaine) => (
              <i
                key={semaine.decalage}
                className={semaine.faite ? 'fait' : ''}
                title={`${semaine.seances} séance${semaine.seances > 1 ? 's' : ''} sur ${semaine.prevues}`}
              >
                {semaine.faite ? <Check size={12} weight="bold" /> : null}
              </i>
            ))}
          </div>
          <small>
            {serie.seancesFaites} séances sur les huit dernières semaines ·{' '}
            {serie.semaines.find((semaine) => semaine.decalage === 0)?.prevues ?? WEEKLY_TARGET} séances valident une
            semaine.
          </small>
        </aside>
      )}

      {!chargement && (
        <nav className="week-rail" aria-label="Créneaux de la semaine en cours">
          {view.slots.map((slot) => {
            const actionLabel =
              slot.state === 'done'
                ? `Revoir ${slot.day.name}`
                : slot.state === 'upcoming'
                  ? `Prévisualiser ${slot.day.name}`
                  : `Démarrer ${slot.day.name}`;
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
                <span className="week-slot-name">{slot.day.name}</span>
                <span className="week-slot-state">
                  {slot.state === 'done' && <Check size={13} weight="bold" />}
                  {SLOT_STATES[slot.state]}
                </span>
              </button>
            );
          })}
        </nav>
      )}

      {/* Métriques compactes : pas de cartes identiques de grande hauteur. */}
      {!chargement && (
        <div className="home-metrics">
          <div className="home-metric">
            <span>Séances cette semaine</span>
            <strong>
              {view.weekSessions}
              <small> / {WEEKLY_TARGET}</small>
            </strong>
            <div className="progress-track">
              <i style={{ width: `${weekProgress}%` }} />
            </div>
          </div>
          <div className="home-metric accent">
            <span>Volume 7 jours</span>
            <strong>
              {formatVolume(view.volume7Days)}
              <small> kg·rép.</small>
            </strong>
          </div>
        </div>
      )}

      <div className="coach-note">
        <div className="coach-symbol">
          <Bolt size={20} />
        </div>
        <div>
          <strong>Le conseil du coach</strong>
          <p>La qualité de chaque répétition compte plus que la vitesse. Respire, contrôle, progresse.</p>
        </div>
      </div>
    </section>
  );
}
