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
  /** Exercices reportés à plus tard dans la séance (machine occupée). */
  deferredIds?: readonly string[];
  /**
   * Aller directement à un exercice : c'est le chemin de retour sur un mouvement
   * mis de côté, depuis la liste, à n'importe quel moment.
   */
  onJumpToExercise?: (exerciseId: string) => void;
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
  deferredIds,
  onJumpToExercise,
}: SessionPlanSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="session-plan-sheet">
        <SheetHeader>
          <p className="eyebrow">SÉANCE EN COURS</p>
          <SheetTitle>Exercices de la séance</SheetTitle>
          <SheetDescription>
            {dayName} · {exercises.length} mouvement{exercises.length > 1 ? 's' : ''} dans l’ordre. Appuie sur un
            mouvement pour y aller directement.
          </SheetDescription>
        </SheetHeader>

        <ol className="session-plan-list">
          {exercises.map((exercise, index) => {
            const done = loggedSets.filter((set) => set.exerciseId === exercise.id).length;
            const total = exercise.sets.length;
            const isCurrent = index === currentExerciseIndex;
            const isDone = done >= total;
            // Un exercice reporté s'annonce comme tel : « À VENIR » ne dit pas
            // qu'il a déjà été mis de côté une fois.
            const isReporte = (deferredIds ?? []).includes(exercise.id) && !isDone;
            const state = isCurrent ? 'EN COURS' : isDone ? 'TERMINÉ' : isReporte ? 'PLUS TARD' : 'À VENIR';
            // Un mouvement terminé n'a plus rien à faire : on ne le rend pas
            // cliquable plutôt que de promettre un saut sans effet.
            const joignable = !isDone && onJumpToExercise !== undefined;
            const aller = () => onJumpToExercise?.(exercise.id);
            return (
              <li key={exercise.id} className="session-plan-slot">
                <button
                  type="button"
                  className={`session-plan-item${isCurrent ? ' current' : ''}${isDone ? ' done' : ''}${joignable ? ' reachable' : ''}`}
                  aria-current={isCurrent ? 'step' : undefined}
                  aria-label={joignable ? `Aller à ${exercise.name}` : undefined}
                  onClick={joignable ? aller : undefined}
                  disabled={!joignable}
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
                </button>
              </li>
            );
          })}
        </ol>
      </SheetContent>
    </Sheet>
  );
}
