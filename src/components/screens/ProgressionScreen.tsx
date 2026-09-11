import type { ProfileId, WorkoutSession } from '../../domain/types';
import { getProgram } from '../../domain/programs';
import { getAdaptiveAdvice, type AdaptiveAdvice } from '../../workout/coaching';
import { ArrowLeft, ChartLine, Check } from '../ui/Icons';
import { profileLabels } from './HomeScreen';

type ProgressionPoint = { label: string; volume: number; series: number };

function sessionVolume(item: WorkoutSession) {
  return item.loggedSets.reduce(
    (total, set) => total + (set.actualLoadKg ?? 0) * (set.actualRepetitions ?? 0),
    0
  );
}

function sessionActiveSeconds(item: WorkoutSession) {
  return item.loggedSets.reduce((total, set) => total + (set.actualDurationSeconds ?? 0), 0);
}

function MiniProgressChart({ points, dataKey }: { points: ProgressionPoint[]; dataKey: 'volume' | 'series' }) {
  const width = 640;
  const height = 220;
  const padding = { top: 18, right: 14, bottom: 34, left: 14 };
  const values = points.map((point) => point[dataKey]);
  const max = Math.max(1, ...values);
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const coords = points.map((point, index) => {
    const x = padding.left + (points.length === 1 ? innerWidth / 2 : (index / (points.length - 1)) * innerWidth);
    const y = padding.top + innerHeight - (point[dataKey] / max) * innerHeight;
    return { ...point, x, y };
  });
  const line = coords
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(' ');
  const area = `${line} L ${coords.at(-1)?.x.toFixed(1) ?? padding.left} ${height - padding.bottom} L ${
    coords[0]?.x.toFixed(1) ?? padding.left
  } ${height - padding.bottom} Z`;

  return (
    <svg
      className="progress-chart"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`Évolution des ${dataKey === 'volume' ? 'volumes' : 'séries'} sur les dernières séances`}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="progress-chart-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#b8f36b" stopOpacity=".42" />
          <stop offset="100%" stopColor="#b8f36b" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#progress-chart-fill)" />
      <path d={line} fill="none" stroke="#b8f36b" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      {coords.map((point) => (
        <g key={`${point.label}-${point.x}`}>
          <circle cx={point.x} cy={point.y} r="5" fill="#131b17" stroke="#b8f36b" strokeWidth="3" />
          <text x={point.x} y={height - 10} textAnchor="middle" fill="#8fa297" fontSize="12">
            {point.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

function AdaptiveAdviceCard({ advice }: { advice: AdaptiveAdvice }) {
  const label =
    advice.recommendation === 'increase'
      ? 'PROGRESSER'
      : advice.recommendation === 'reduce'
      ? 'RÉDUIRE'
      : 'MAINTENIR';
  return (
    <div className={`adaptive-advice ${advice.safety ? 'safety' : ''}`}>
      <div>
        <p className="eyebrow">COACHING APRÈS SÉANCE · {label}</p>
        <h2>{advice.title}</h2>
        <p>{advice.message}</p>
      </div>
      <span className="adaptive-icon">
        {advice.safety ? '⚠' : advice.recommendation === 'increase' ? '↗' : advice.recommendation === 'reduce' ? '↘' : '→'}
      </span>
    </div>
  );
}

interface ProgressionScreenProps {
  history: WorkoutSession[];
  profile: ProfileId;
  onBack: () => void;
}

export function ProgressionScreen({ history, profile, onBack }: ProgressionScreenProps) {
  const completed = history.filter((item) => Boolean(item.completedAt));
  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  const day = weekStart.getDay();
  weekStart.setDate(weekStart.getDate() - (day === 0 ? 6 : day - 1));
  const thisWeek = completed.filter((item) => new Date(item.startedAt) >= weekStart).length;
  const volume = completed.reduce((total, item) => total + sessionVolume(item), 0);
  const activeSeconds = completed.reduce((total, item) => total + sessionActiveSeconds(item), 0);
  const maxLoad = completed
    .flatMap((item) => item.loggedSets)
    .reduce((max, set) => Math.max(max, set.actualLoadKg ?? 0), 0);
  const points: ProgressionPoint[] = [...completed]
    .reverse()
    .slice(-8)
    .map((item) => ({
      label: new Date(item.startedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
      volume: sessionVolume(item),
      series: item.loggedSets.length,
    }));
  const hasVolume = points.some((point) => point.volume > 0);
  const program = getProgram(profile);
  const exerciseNames = new Map(program.days.flatMap((item) => item.exercises).map((exercise) => [exercise.id, exercise.name]));
  const bestByExercise = new Map<string, { load: number; reps: number }>();

  completed
    .flatMap((item) => item.loggedSets)
    .forEach((set) => {
      const existing = bestByExercise.get(set.exerciseId);
      const candidate = {
        load: set.actualLoadKg ?? 0,
        reps: set.actualRepetitions ?? set.actualDurationSeconds ?? 0,
      };
      if (
        !existing ||
        candidate.load > existing.load ||
        (candidate.load === existing.load && candidate.reps > existing.reps)
      ) {
        bestByExercise.set(set.exerciseId, candidate);
      }
    });

  const best = [...bestByExercise.entries()]
    .filter(([, value]) => value.load > 0 || value.reps > 0)
    .sort((a, b) => b[1].load - a[1].load)
    .slice(0, 5);

  const advice = getAdaptiveAdvice(completed);

  return (
    <section className="content progression-content">
      <div className="page-heading">
        <div>
          <p className="eyebrow">TON PARCOURS · {profileLabels[profile].toUpperCase()}</p>
          <h1>Progression</h1>
        </div>
        <button className="text-button" onClick={onBack}>
          <ArrowLeft size={16} /> Accueil
        </button>
      </div>
      <p className="intro progression-intro">
        Un aperçu de tes séances enregistrées sur cet appareil. Les données restent privées et séparées de l’autre profil.
      </p>

      {completed.length === 0 ? (
        <div className="empty-state">
          <ChartLine size={34} />
          <h2>Pas encore de progression</h2>
          <p>Valide ta première séance pour voir apparaître tes repères.</p>
        </div>
      ) : (
        <>
          <div className="progression-metrics">
            <div className="metric-card">
              <span>Cette semaine</span>
              <strong>{thisWeek}</strong>
              <small>séance{thisWeek > 1 ? 's' : ''}</small>
            </div>
            <div className="metric-card accent">
              <span>Volume total</span>
              <strong>{volume.toLocaleString('fr-FR')}</strong>
              <small>kg·rép.</small>
            </div>
            <div className="metric-card">
              <span>Meilleure charge</span>
              <strong>{maxLoad > 0 ? `${maxLoad}` : '—'}</strong>
              <small>{maxLoad > 0 ? 'kg' : 'à renseigner'}</small>
            </div>
            <div className="metric-card">
              <span>Temps actif</span>
              <strong>{Math.round(activeSeconds / 60)}</strong>
              <small>minutes</small>
            </div>
          </div>

          {advice && <AdaptiveAdviceCard advice={advice} />}

          <div className="progression-card">
            <div className="card-heading">
              <div>
                <p className="eyebrow">TENDANCE</p>
                <h2>Volume par séance</h2>
              </div>
              <span>{hasVolume ? 'kg·rép.' : 'Séries validées'}</span>
            </div>
            <div className="chart-wrap">
              <MiniProgressChart points={points} dataKey={hasVolume ? 'volume' : 'series'} />
            </div>
          </div>

          <div className="progression-card">
            <div className="card-heading">
              <div>
                <p className="eyebrow">REPÈRES</p>
                <h2>Meilleures performances</h2>
              </div>
              <span>
                {best.length} mouvement{best.length > 1 ? 's' : ''}
              </span>
            </div>
            {best.length === 0 ? (
              <p className="muted-copy">Renseigne une charge ou une durée réelle pendant tes séries pour créer tes repères.</p>
            ) : (
              <div className="best-list">
                {best.map(([exerciseId, value]) => (
                  <div className="best-item" key={exerciseId}>
                    <span className="best-rank">{best.findIndex(([id]) => id === exerciseId) + 1}</span>
                    <div>
                      <strong>{exerciseNames.get(exerciseId) ?? exerciseId}</strong>
                      <small>
                        {value.load > 0 ? `${value.load} kg` : `${value.reps} s`} · meilleur repère
                      </small>
                    </div>
                    <Check size={17} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
