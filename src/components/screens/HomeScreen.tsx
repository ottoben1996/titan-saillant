import { useMemo } from 'react';
import type { ProfileId, WorkoutDay, WorkoutSession } from '../../domain/types';
import { getProgram } from '../../domain/programs';
import { getWorkoutSteps } from '../../workout/runner';
import {
  formatVolume,
  startOfWeek,
  volumeLastDays,
  weekSlots,
  weeklyComparison,
  type WeekSlotState,
} from '../../workout/summary';
import { ArrowRight, Bolt, Check, Clock, Play } from '../ui/Icons';

export const profileLabels: Record<ProfileId, string> = { ottman: 'Ottman', laura: 'Laura' };

const SLOT_STATES: Record<WeekSlotState, string> = {
  done: 'Terminée',
  today: "Aujourd’hui",
  upcoming: 'À venir',
};

/** Le volume hebdomadaire cible : chaque profil a 3 créneaux prescrits. */
const WEEKLY_TARGET = 3;

function estimatedMinutes(day: WorkoutDay) {
  return Math.round(getWorkoutSteps(day).length * 2 + 12);
}

interface HomeScreenProps {
  profile: ProfileId;
  program: ReturnType<typeof getProgram>;
  history: WorkoutSession[];
  activeSession: WorkoutSession | null;
  onStart: (day: WorkoutDay) => void;
  onResume: () => void;
}

export function HomeScreen({
  profile,
  program,
  history,
  activeSession,
  onStart,
  onResume,
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
      completedCount: history.filter((item) => item.completedAt).length,
    };
  }, [program.days, history, activeSession]);

  const weekProgress = Math.min(100, (view.weekSessions / WEEKLY_TARGET) * 100);
  const todaySlot = view.todaySlot;
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
        <button className="resume-banner" onClick={onResume}>
          <span className="resume-icon">
            <Play size={18} weight="fill" />
          </span>
          <span>
            <strong>Séance en cours</strong>
            <small>{activeSession?.loggedSets.length ?? 0} séries déjà validées — reprendre là où tu t’es arrêté</small>
          </span>
          <ArrowRight size={20} />
        </button>
      )}

      {/* Action dominante : la séance du jour, ou l'état « semaine complète ». */}
      {!view.isResuming && todaySlot && (
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
            <button
              className="primary-button today-cta"
              onClick={() => onStart(todaySlot.day)}
            >
              <Play size={18} weight="fill" /> Démarrer
            </button>
          </div>
        </article>
      )}

      {!view.isResuming && !todaySlot && (
        <article className="today-card done">
          <p className="eyebrow">SEMAINE COMPLÈTE</p>
          <h2>Les {WEEKLY_TARGET} créneaux sont validés</h2>
          <p className="today-card-sub">
            Rien d’obligatoire aujourd’hui. Tu peux refaire une séance si tu te sens frais.
          </p>
        </article>
      )}

      {/* Rail de la semaine : état explicite de chaque créneau. */}
      <nav className="week-rail" aria-label="Créneaux de la semaine en cours">
        {view.slots.map((slot) => (
          <button
            key={slot.day.id}
            type="button"
            className={`week-slot ${slot.state}`}
            onClick={() => onStart(slot.day)}
            aria-label={`${slot.day.name} — ${SLOT_STATES[slot.state]}`}
          >
            <span className="week-slot-name">{slot.day.name}</span>
            <span className="week-slot-state">
              {slot.state === 'done' && <Check size={13} weight="bold" />}
              {SLOT_STATES[slot.state]}
            </span>
          </button>
        ))}
      </nav>

      {/* Métriques compactes : pas de cartes identiques de grande hauteur. */}
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
          <small className="home-metric-foot">
            {view.completedCount} séance{view.completedCount > 1 ? 's' : ''} au total
          </small>
        </div>
      </div>

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
