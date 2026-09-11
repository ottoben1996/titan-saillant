import type { ProfileId, WorkoutDay, WorkoutSession } from '../../domain/types';
import { getProgram } from '../../domain/programs';
import { getWorkoutSteps } from '../../workout/runner';
import { ArrowRight, ChartLine, Clock, Play } from '../ui/Icons';

export const profileLabels: Record<ProfileId, string> = { ottman: 'Ottman', laura: 'Laura' };

interface HomeScreenProps {
  profile: ProfileId;
  program: ReturnType<typeof getProgram>;
  history: WorkoutSession[];
  activeSession: WorkoutSession | null;
  onStart: (day: WorkoutDay) => void;
  onResume: () => void;
  onHistory: () => void;
  onProgression: () => void;
}

export function HomeScreen({
  profile,
  program,
  history,
  activeSession,
  onStart,
  onResume,
  onHistory,
  onProgression,
}: HomeScreenProps) {
  const completedCount = history.filter((item) => item.completedAt).length;
  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  const dayOfWeek = weekStart.getDay();
  weekStart.setDate(weekStart.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  const weekCount = history.filter((item) => item.completedAt && new Date(item.startedAt) >= weekStart).length;

  return (
    <section className="content home-content">
      <div className="hero-row">
        <div>
          <p className="eyebrow">BONJOUR {profileLabels[profile].toUpperCase()}</p>
          <h1>
            On s’entraîne<br />
            <em>avec intention.</em>
          </h1>
        </div>
        <div className={`avatar avatar-${profile}`}>{profileLabels[profile][0]}</div>
      </div>

      <div className="metric-grid">
        <div className="metric-card">
          <span>Cette semaine</span>
          <strong>
            {Math.min(weekCount, 7)} <small>/ 3</small>
          </strong>
          <div className="progress-track">
            <i style={{ width: `${Math.min(100, (weekCount / 3) * 100)}%` }} />
          </div>
        </div>
        <div className="metric-card accent">
          <span>Séances réalisées</span>
          <strong>{completedCount}</strong>
          <small>depuis le début</small>
        </div>
      </div>

      {activeSession && !activeSession.completedAt && (
        <button className="resume-banner" onClick={onResume}>
          <span className="resume-icon">
            <Play size={18} weight="fill" />
          </span>
          <span>
            <strong>Séance en cours</strong>
            <small>Reprendre là où tu t’es arrêté</small>
          </span>
          <ArrowRight size={20} />
        </button>
      )}

      <div className="section-heading">
        <div>
          <p className="eyebrow">PROGRAMME PRESCRIT</p>
          <h2>Choisis ta séance</h2>
        </div>
        <div className="section-heading-actions">
          <button className="text-button" onClick={onProgression}>
            Progression <ChartLine size={16} />
          </button>
          <button className="text-button" onClick={onHistory}>
            Historique <ArrowRight size={16} />
          </button>
        </div>
      </div>

      <div className="workout-grid">
        {program.days.map((day, index) => (
          <article className={`workout-card card-${index}`} key={day.id}>
            <div className="card-top">
              <span className="day-number">0{index + 1}</span>
              <span className="tag">{day.exercises.length} mouvements</span>
            </div>
            <h3>{day.name}</h3>
            <p>{day.subtitle}</p>
            <div className="card-footer">
              <span>
                <Clock size={16} /> {Math.round(getWorkoutSteps(day).length * 2 + 12)} min
              </span>
              <button
                className="round-action"
                onClick={() => onStart(day)}
                aria-label={`Démarrer ${day.name}`}
              >
                <Play size={18} weight="fill" />
              </button>
            </div>
          </article>
        ))}
      </div>

      <div className="coach-note">
        <div className="coach-symbol">✦</div>
        <div>
          <strong>Le conseil du coach</strong>
          <p>La qualité de chaque répétition compte plus que la vitesse. Respire, contrôle, progresse.</p>
        </div>
      </div>
    </section>
  );
}
