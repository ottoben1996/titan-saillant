import type { ExercisePrescription, LoggedSet } from '../../domain/types';
import { formatLoadKg } from '../../workout/summary';
import { Check } from '../ui/Icons';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../ui/Sheet';

/**
 * Liste des exercices de la séance, consultable à tout moment.
 *
 * Pendant une séance on veut savoir ce qui reste : quel mouvement vient après,
 * ce qui a déjà été validé, et sur quelle charge. La feuille reprend l'ordre
 * réel de la séance (échauffement, travail, retour au calme), marque le
 * mouvement en cours et compte les séries validées de chacun.
 */

interface SessionPlanSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dayName: string;
  exercises: readonly ExercisePrescription[];
  loggedSets: readonly LoggedSet[];
  currentExerciseIndex?: number;
}

function phaseLabelFor(exercise: ExercisePrescription): string {
  if (exercise.kind === 'warmup') return 'ÉCHAUFFEMENT';
  if (exercise.kind === 'cooldown') return 'RETOUR AU CALME';
  return 'TRAVAIL';
}

/** « 3 séries × 10 rép. · 40 kg » — la charge affichée est celle de travail. */
function prescriptionSummary(exercise: ExercisePrescription): string {
  const sets = exercise.sets;
  const first = sets[0];
  const unit = first?.durationSeconds ? `${first.durationSeconds} s` : `${first?.repetitions ?? 0} rép.`;
  const loads = sets.map((set) => set.loadKg).filter((value): value is number => value !== undefined);
  const workingLoad = loads.length ? Math.max(...loads) : undefined;
  const base = `${sets.length} série${sets.length > 1 ? 's' : ''} × ${unit}`;
  return workingLoad !== undefined ? `${base} · ${formatLoadKg(workingLoad)} kg` : base;
}

export function SessionPlanSheet({
  open,
  onOpenChange,
  dayName,
  exercises,
  loggedSets,
  currentExerciseIndex,
}: SessionPlanSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="session-plan-sheet">
        <SheetHeader>
          <p className="eyebrow">SÉANCE EN COURS</p>
          <SheetTitle>Exercices de la séance</SheetTitle>
          <SheetDescription>
            {dayName} · {exercises.length} mouvement{exercises.length > 1 ? 's' : ''} dans l’ordre
          </SheetDescription>
        </SheetHeader>

        <ol className="session-plan-list">
          {exercises.map((exercise, index) => {
            const done = loggedSets.filter((set) => set.exerciseId === exercise.id).length;
            const total = exercise.sets.length;
            const isCurrent = index === currentExerciseIndex;
            const isDone = done >= total;
            const state = isCurrent ? 'EN COURS' : isDone ? 'TERMINÉ' : 'À VENIR';
            return (
              <li
                key={exercise.id}
                className={`session-plan-item${isCurrent ? ' current' : ''}${isDone ? ' done' : ''}`}
                aria-current={isCurrent ? 'step' : undefined}
              >
                <span className="session-plan-index" aria-hidden="true">
                  {isDone ? <Check size={14} weight="bold" /> : index + 1}
                </span>
                <span className="session-plan-body">
                  <span className="session-plan-phase">
                    {phaseLabelFor(exercise)} · {state}
                  </span>
                  <strong>{exercise.name}</strong>
                  <small>{prescriptionSummary(exercise)}</small>
                </span>
                <span className="session-plan-progress">
                  <b>
                    {Math.min(done, total)} / {total}
                  </b>
                  <small>séries</small>
                </span>
              </li>
            );
          })}
        </ol>
      </SheetContent>
    </Sheet>
  );
}
