import { useMemo } from 'react';
import { equipmentAlternatives } from '../../domain/alternatives';
import { exerciseLabel } from '../../domain/labels';
import { tutorials } from '../../domain/tutorials';
import type { ExercisePrescription, WorkoutPlan, WorkoutSession } from '../../domain/types';
import { type ExercisePassage, exerciseReview } from '../../workout/exerciseReview';
import { formatLoadKg, formatSignedKg, formatVolume } from '../../workout/summary';
import { Bolt, ChartLine, TrendDown, TrendUp, Video } from '../ui/Icons';
import { MuscleMap } from '../ui/MuscleMap';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '../ui/Sheet';

/**
 * Fiche mouvement : la courbe de charge, les records et les repères d'un
 * exercice, ouverte depuis les records ou pendant la séance.
 *
 * Elle répond à une question que ni l'historique de séance ni le bilan
 * hebdomadaire ne traitaient : « ce mouvement, précisément, il progresse ? »
 */

interface ExerciseSheetProps {
  exerciseId: string;
  history: readonly WorkoutSession[];
  program: WorkoutPlan;
  onClose: () => void;
  onTutorial?: (exerciseId: string) => void;
}

const dateCourte = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

function prescriptionFor(program: WorkoutPlan, exerciseId: string): ExercisePrescription | undefined {
  for (const day of program.days) {
    const found = [...day.exercises, ...(day.warmup ?? [])].find((exercise) => exercise.id === exerciseId);
    if (found) return found;
  }
  return program.warmup.find((exercise) => exercise.id === exerciseId);
}

function serieLabel(exercise: ExercisePrescription | undefined): string {
  if (!exercise) return 'Historique de charge';
  const travail = exercise.sets.filter((set) => set.phase !== 'warmup');
  const series = travail.length;
  const repetitions = travail.find((set) => set.repetitions)?.repetitions;
  if (series === 0) return 'Historique de charge';
  return `${series} série${series > 1 ? 's' : ''}${repetitions ? ` × ${repetitions} rép.` : ''}`;
}

function ChargeChart({ passages }: { passages: readonly ExercisePassage[] }) {
  const width = 640;
  const height = 170;
  const padding = { top: 18, right: 12, bottom: 28, left: 12 };
  const max = Math.max(1, ...passages.map((passage) => passage.bestLoadKg));
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const coords = passages.map((passage, index) => ({
    ...passage,
    x: padding.left + (passages.length === 1 ? innerWidth / 2 : (index / (passages.length - 1)) * innerWidth),
    y: padding.top + innerHeight - (passage.bestLoadKg / max) * innerHeight,
  }));
  const line = coords
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(' ');
  const area = `${line} L ${coords.at(-1)?.x.toFixed(1) ?? padding.left} ${height - padding.bottom} L ${
    coords[0]?.x.toFixed(1) ?? padding.left
  } ${height - padding.bottom} Z`;
  const pas = passages.length > 8 ? 2 : 1;

  return (
    <div className="exercise-chart-wrap">
      <svg
        className="exercise-chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Charge la plus lourde à chaque passage, ${passages.length} passage${
          passages.length > 1 ? 's' : ''
        }, du plus ancien au plus récent`}
        preserveAspectRatio="xMidYMid meet"
      >
        <line
          x1={padding.left}
          y1={height - padding.bottom}
          x2={width - padding.right}
          y2={height - padding.bottom}
          stroke="rgba(255,255,255,.14)"
          strokeWidth="1"
        />
        <text x={padding.left} y={padding.top - 5} fill="#78877E" fontSize="11">
          {formatLoadKg(max)} kg
        </text>
        <path d={area} style={{ fill: 'rgb(var(--accent-rgb) / 0.10)' }} />
        <path
          d={line}
          fill="none"
          style={{ stroke: 'var(--accent)' }}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {coords.map((point, index) => (
          <g key={point.sessionId}>
            <circle
              cx={point.x}
              cy={point.y}
              r="3.5"
              fill="#0B0F0E"
              style={{ stroke: 'var(--accent)' }}
              strokeWidth="2.5"
            />
            {index % pas === 0 && (
              <text x={point.x} y={height - 8} textAnchor="middle" fill="#78877E" fontSize="11">
                {dateCourte(point.at)}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

export function ExerciseSheet({ exerciseId, history, program, onClose, onTutorial }: ExerciseSheetProps) {
  const prescription = useMemo(() => prescriptionFor(program, exerciseId), [program, exerciseId]);
  const tutorial = tutorials[exerciseId];
  const review = useMemo(() => exerciseReview(history, exerciseId, prescription), [history, exerciseId, prescription]);
  const alternative = equipmentAlternatives[exerciseId];
  const name = exerciseLabel(exerciseId, prescription?.name);
  const derniers = review.passages.slice(-5).reverse();
  const delta = review.deltaKg;

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" onClose={onClose} className="exercise-sheet" aria-describedby="exercise-sheet-desc">
        <p className="eyebrow">FICHE MOUVEMENT</p>
        <SheetTitle>{name}</SheetTitle>
        <SheetDescription id="exercise-sheet-desc">{serieLabel(prescription)}</SheetDescription>

        {delta !== undefined && review.passages.length > 1 && (
          <p className={`exercise-delta ${delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat'}`}>
            {delta === 0 ? (
              <>
                <ChartLine size={15} /> Charge stable depuis le premier passage
              </>
            ) : (
              <>
                {delta > 0 ? <TrendUp size={15} /> : <TrendDown size={15} />}
                {formatSignedKg(delta)} kg depuis le premier passage
              </>
            )}
          </p>
        )}

        {review.passages.length === 0 ? (
          <div className="exercise-empty">
            <ChartLine size={28} />
            <p>Aucune charge enregistrée pour ce mouvement.</p>
            <small>La fiche se remplit dès qu’une série chargée est validée.</small>
          </div>
        ) : (
          <>
            <div className="exercise-kpis">
              <div>
                <span>Record</span>
                <b>{formatLoadKg(review.bestLoadKg ?? 0)} kg</b>
                <small>{review.bestLoadAt ? dateCourte(review.bestLoadAt) : '—'}</small>
              </div>
              <div>
                <span>1RM estimé</span>
                <b>{formatLoadKg(review.bestOneRepMaxKg ?? 0)} kg</b>
                <small>Epley</small>
              </div>
              <div>
                <span>Volume cumulé</span>
                <b>{formatVolume(review.totalVolumeKg)}</b>
                <small>kg·rép.</small>
              </div>
              <div>
                <span>Séries</span>
                <b>{review.totalSets}</b>
                <small>enregistrées</small>
              </div>
            </div>

            <h3 className="exercise-sheet-heading">Charge par passage</h3>
            <ChargeChart passages={review.passages} />

            {review.stagnates && (
              <p className="exercise-signal">
                <Bolt size={15} /> Même charge sur les trois derniers passages.
              </p>
            )}

            <h3 className="exercise-sheet-heading">Derniers passages</h3>
            <div className="exercise-passages">
              {derniers.map((passage) => (
                <div className="exercise-passage" key={passage.sessionId}>
                  <span className="exercise-passage-date">{dateCourte(passage.at)}</span>
                  <span className="exercise-passage-load">
                    {formatLoadKg(passage.bestLoadKg)} kg × {passage.bestRepetitions}
                  </span>
                  <span className="exercise-passage-meta">
                    {formatVolume(passage.volumeKg)} kg·rép. · 1RM≈{formatLoadKg(passage.estimatedOneRepMaxKg)} kg
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {tutorial && (
          <MuscleMap
            primaryMuscles={tutorial.primaryMuscles ?? tutorial.muscles}
            secondaryMuscles={tutorial.secondaryMuscles ?? []}
            size="sm"
            titre="Zones travaillées"
          />
        )}

        {alternative && (
          <div className="exercise-alternative">
            <strong>Si la machine est prise</strong>
            <p>
              {alternative.name} — {alternative.setup}
            </p>
          </div>
        )}

        {tutorial && onTutorial && (
          <button type="button" className="secondary-button full" onClick={() => onTutorial(exerciseId)}>
            <Video size={16} /> Voir la technique
          </button>
        )}
      </SheetContent>
    </Sheet>
  );
}
