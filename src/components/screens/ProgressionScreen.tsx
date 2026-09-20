import { useMemo } from 'react';
import { exerciseLabel } from '../../domain/labels';
import type { WeeklyMeasurement } from '../../domain/measurements';
import { getProgram } from '../../domain/programs';
import type { ProfileId, WorkoutSession } from '../../domain/types';
import { type AdaptiveAdvice, getAdaptiveAdvice } from '../../workout/coaching';
import { nextTargetWeek } from '../../workout/followup';
import {
  formatLoadKg,
  formatMinutes,
  formatSignedInt,
  formatSignedKg,
  formatSignedPercent,
  formatVolume,
  historyTotals,
  personalRecords,
  type TrendPoint,
  volumeTrendPoints,
  weeklyComparison,
} from '../../workout/summary';
import { ArrowLeft, ArrowRight, Bolt, ChartLine, ChevronRight, TrendDown, TrendUp, Warning } from '../ui/Icons';
import { profileLabels } from './HomeScreen';

/* ------------------------------------------------------------------ graphe -- */

function VolumeTrendChart({ points, dataKey }: { points: TrendPoint[]; dataKey: 'volume' | 'sets' }) {
  const width = 640;
  const height = 200;
  const padding = { top: 16, right: 12, bottom: 30, left: 12 };
  const max = Math.max(1, ...points.map((point) => point[dataKey]));
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const coords = points.map((point, index) => ({
    ...point,
    x: padding.left + (points.length === 1 ? innerWidth / 2 : (index / (points.length - 1)) * innerWidth),
    y: padding.top + innerHeight - (point[dataKey] / max) * innerHeight,
  }));
  const line = coords
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(' ');
  const area = `${line} L ${coords.at(-1)?.x.toFixed(1) ?? padding.left} ${height - padding.bottom} L ${
    coords[0]?.x.toFixed(1) ?? padding.left
  } ${height - padding.bottom} Z`;
  const last = coords.at(-1);

  return (
    <div className="trend-chart-wrap">
      <svg
        className="progress-chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Évolution des ${
          dataKey === 'volume' ? 'volumes' : 'séries validées'
        } sur les ${points.length} dernières séances, du plus ancien au plus récent`}
        preserveAspectRatio="none"
      >
        <line
          x1={padding.left}
          y1={height - padding.bottom}
          x2={width - padding.right}
          y2={height - padding.bottom}
          stroke="rgba(255,255,255,.14)"
          strokeWidth="1"
        />
        <path d={area} style={{ fill: 'rgb(var(--accent-rgb) / 0.10)' }} />
        <path
          d={line}
          fill="none"
          style={{ stroke: 'var(--accent)' }}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {coords.map((point) => (
          <g key={point.sessionId}>
            <circle
              cx={point.x}
              cy={point.y}
              r="3.5"
              fill="#0B0F0E"
              style={{ stroke: 'var(--accent)' }}
              strokeWidth="2.5"
            />
            <text x={point.x} y={height - 8} textAnchor="middle" fill="#78877E" fontSize="12">
              {point.label}
            </text>
          </g>
        ))}
      </svg>
      {last && (
        <p className="trend-last">
          Dernière séance :{' '}
          <strong>{dataKey === 'volume' ? `${formatVolume(last.volume)} kg·rép.` : `${last.sets} séries`}</strong>
        </p>
      )}
    </div>
  );
}

/* --------------------------------------------------------------- coaching -- */

function AdaptiveAdviceCard({ advice }: { advice: AdaptiveAdvice }) {
  const label =
    advice.recommendation === 'increase' ? 'PROGRESSER' : advice.recommendation === 'reduce' ? 'RÉDUIRE' : 'MAINTENIR';
  return (
    <div className={`adaptive-advice ${advice.safety ? 'safety' : ''}`}>
      <div>
        <p className="eyebrow">COACHING APRÈS SÉANCE · {label}</p>
        <h2>{advice.title}</h2>
        <p>{advice.message}</p>
      </div>
      <span className="adaptive-icon" aria-hidden="true">
        {advice.safety ? (
          <Warning size={22} />
        ) : advice.recommendation === 'increase' ? (
          <TrendUp size={22} />
        ) : advice.recommendation === 'reduce' ? (
          <TrendDown size={22} />
        ) : (
          <ArrowRight size={22} />
        )}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ écran -- */

interface ProgressionScreenProps {
  history: WorkoutSession[];
  profile: ProfileId;
  /** Points hebdomadaires : alimentent la carte du point du samedi. */
  measurements: readonly WeeklyMeasurement[];
  onBack: () => void;
  onOpenFollowup: () => void;
  onSwitchDuoProfile?: (profile: ProfileId) => void;
}

export function ProgressionScreen({
  history,
  profile,
  measurements,
  onBack,
  onOpenFollowup,
  onSwitchDuoProfile,
}: ProgressionScreenProps) {
  const view = useMemo(() => {
    const now = new Date();
    const completed = history.filter((item) => item.completedAt);
    const program = getProgram(profile);
    const exerciseNames = new Map(
      program.days.flatMap((item) => item.exercises).map((exercise) => [exercise.id, exercise.name]),
    );
    return {
      completed,
      totals: historyTotals(history),
      week: weeklyComparison(history, now),
      points: volumeTrendPoints(history, 8),
      records: personalRecords(history, 5).map((record) => ({
        ...record,
        name: exerciseLabel(record.exerciseId, exerciseNames.get(record.exerciseId)),
      })),
      advice: getAdaptiveAdvice(completed),
    };
  }, [history, profile]);

  const { week, totals } = view;
  const hasVolume = view.points.some((point) => point.volume > 0);
  const volumeTrendClass =
    week.volumeDeltaPct === null ? '' : week.volumeDeltaPct > 0 ? 'up' : week.volumeDeltaPct < 0 ? 'down' : '';

  const pointTarget = nextTargetWeek(measurements);
  const dernierPoint = [...measurements]
    .sort((a, b) => (a.cycle === b.cycle ? a.week - b.week : a.cycle - b.cycle))
    .at(-1);
  const pointAJour = Boolean(
    dernierPoint && dernierPoint.cycle === pointTarget.cycle && dernierPoint.week === pointTarget.week,
  );

  return (
    <section className={`content progression-content progression-profile-${profile}`}>
      <div className="page-heading">
        <div>
          <p className="eyebrow">PROGRESSION · TENDANCE</p>
          <h1>{profileLabels[profile]}</h1>
        </div>
        <div className={`avatar avatar-${profile}`} aria-hidden="true">
          {profileLabels[profile][0]}
        </div>
      </div>
      {onSwitchDuoProfile && (
        <fieldset className="progression-duo-switcher" aria-label="Profil de progression">
          <legend className="sr-only">Profil de progression</legend>
          <button
            type="button"
            className={`duo-pill-btn ${profile === 'ottman' ? 'active' : ''}`}
            aria-pressed={profile === 'ottman'}
            onClick={() => onSwitchDuoProfile('ottman')}
          >
            Ottman
          </button>
          <button
            type="button"
            className={`duo-pill-btn ${profile === 'laura' ? 'active' : ''}`}
            aria-pressed={profile === 'laura'}
            onClick={() => onSwitchDuoProfile('laura')}
          >
            Laura
          </button>
        </fieldset>
      )}
      <button className="text-button progression-back" onClick={onBack} type="button">
        <ArrowLeft size={16} /> Accueil
      </button>
      <p className="intro progression-intro">
        Un aperçu de tes séances enregistrées sur cet appareil. Les données restent privées et séparées de l’autre
        profil.
      </p>

      {/* Point du samedi : l'entrée vers le suivi hebdomadaire, au même endroit
          que le reste des repères de progression. */}
      <button type="button" className="followup-cta" onClick={onOpenFollowup}>
        <span className="followup-cta-icon">
          <TrendUp size={18} />
        </span>
        <span className="followup-cta-text">
          <strong>
            {pointAJour
              ? `Semaine ${pointTarget.week} déjà renseignée`
              : `Point du samedi — semaine ${pointTarget.week}`}
          </strong>
          <small>
            {dernierPoint
              ? `Dernier relevé : ${
                  typeof dernierPoint.weightKg === 'number'
                    ? `${formatLoadKg(dernierPoint.weightKg)} kg`
                    : 'poids non renseigné'
                }${typeof dernierPoint.waistCm === 'number' ? ` · taille ${formatLoadKg(dernierPoint.waistCm)} cm` : ''}`
              : 'Mensurations et poids, une fois par semaine'}
          </small>
        </span>
        <ChevronRight size={18} />
      </button>

      {view.completed.length === 0 ? (
        <div className="empty-state">
          <ChartLine size={34} />
          <h2>Aucune donnée de progression</h2>
          <p>Termine une première séance pour voir apparaître tes repères et ta tendance de volume.</p>
          <button className="primary-button empty-cta" onClick={onBack} type="button">
            Retour à l’accueil
          </button>
        </div>
      ) : (
        <>
          <div className="metric-strip">
            <div className="metric-cell">
              <span>Cette semaine</span>
              <strong>{week.current.sessions}</strong>
              <small>séance{week.current.sessions > 1 ? 's' : ''}</small>
            </div>
            <div className="metric-cell accent">
              <span>Volume total</span>
              <strong>{formatVolume(totals.volumeKg)}</strong>
              <small>kg·rép.</small>
            </div>
            <div className="metric-cell">
              <span>Meilleure charge</span>
              <strong>{totals.bestLoadKg > 0 ? formatLoadKg(totals.bestLoadKg) : '—'}</strong>
              <small>{totals.bestLoadKg > 0 ? 'kg' : 'à renseigner'}</small>
            </div>
            <div className="metric-cell">
              <span>Temps actif</span>
              <strong>{formatMinutes(totals.activeSeconds)}</strong>
              <small>temps sous tension</small>
            </div>
          </div>

          <div className="comparison-card">
            <div className="card-heading">
              <div>
                <p className="eyebrow">SEMAINE EN COURS VS PRÉCÉDENTE</p>
                <h2>Comparaison</h2>
              </div>
              <span className={`trend-chip ${volumeTrendClass}`}>
                {/* Un seul libellé par état : deux textes frères dans la même pastille
                    se collaient sans espace (« Première semainepas de repère »). */}
                {week.volumeDeltaPct === null ? (
                  'Première semaine'
                ) : (
                  <>
                    {week.volumeDeltaPct > 0 ? (
                      <TrendUp size={14} />
                    ) : week.volumeDeltaPct < 0 ? (
                      <TrendDown size={14} />
                    ) : (
                      <ArrowRight size={14} />
                    )}
                    {formatSignedPercent(week.volumeDeltaPct)}
                  </>
                )}
              </span>
            </div>
            <div className="comparison-grid">
              {/* Sans semaine de référence, un écart signé ferait croire à une
                  progression : on affiche la valeur de la semaine, sans signe. */}
              <div className="comparison-item">
                <span>Volume</span>
                <strong>
                  {week.previous.volumeKg > 0
                    ? `${formatSignedKg(week.volumeDeltaKg)} kg·rép.`
                    : `${formatVolume(week.current.volumeKg)} kg·rép.`}
                </strong>
                <small>
                  {week.previous.volumeKg > 0
                    ? `${formatVolume(week.current.volumeKg)} cette semaine vs ${formatVolume(
                        week.previous.volumeKg,
                      )} la semaine dernière`
                    : 'Rien à comparer pour l’instant'}
                </small>
              </div>
              <div className="comparison-item">
                <span>Séances</span>
                <strong>
                  {week.previous.sessions > 0 ? formatSignedInt(week.sessionsDelta) : week.current.sessions}
                </strong>
                <small>
                  {week.previous.sessions > 0
                    ? `${week.current.sessions} cette semaine vs ${week.previous.sessions} la semaine dernière`
                    : 'Rien à comparer pour l’instant'}
                </small>
              </div>
            </div>
          </div>

          {view.advice && <AdaptiveAdviceCard advice={view.advice} />}

          <div className="progression-card">
            <div className="card-heading">
              <div>
                <p className="eyebrow">TENDANCE</p>
                <h2>{hasVolume ? 'Volume par séance' : 'Séries validées par séance'}</h2>
              </div>
              <span>{hasVolume ? 'kg·rép.' : 'séries'}</span>
            </div>
            {view.points.length > 0 && (
              <>
                {!hasVolume && (
                  <p className="muted-copy">
                    Aucune charge renseignée pour l’instant : la tendance affiche les séries validées par séance.
                  </p>
                )}
                <VolumeTrendChart points={view.points} dataKey={hasVolume ? 'volume' : 'sets'} />
              </>
            )}
          </div>

          <div className="progression-card">
            <div className="card-heading">
              <div>
                <p className="eyebrow">RECORDS</p>
                <h2>Meilleure charge par mouvement</h2>
              </div>
              <span>
                {view.records.length} mouvement{view.records.length > 1 ? 's' : ''}
              </span>
            </div>
            {view.records.length === 0 ? (
              <p className="muted-copy">Renseigne une charge réelle pendant tes séries pour créer tes records.</p>
            ) : (
              <div className="records-list">
                {view.records.map((record, index) => (
                  <div className="record-row" key={record.exerciseId}>
                    <span className="record-rank">{index + 1}</span>
                    <div className="record-main">
                      <strong>{record.name}</strong>
                      <small>
                        {record.loadKg > 0
                          ? `${formatLoadKg(record.loadKg)} kg × ${record.repetitions} rép.`
                          : `${record.repetitions} s tenues`}
                      </small>
                    </div>
                    <span className="record-value">
                      {record.loadKg > 0 ? `${formatLoadKg(record.loadKg)} kg` : '—'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="coach-note">
            <div className="coach-symbol">
              <Bolt size={20} />
            </div>
            <div>
              <strong>Comment lire ces chiffres</strong>
              <p>
                Le volume (charge × répétitions) mesure le travail total. Une meilleure charge sur le même mouvement
                signale une progression réelle, même si la séance paraît plus courte.
              </p>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
