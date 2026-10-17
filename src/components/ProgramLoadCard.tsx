import { useState } from 'react';
import type { WorkoutPlan } from '../domain/types';
import { formatLoadKg } from '../workout/summary';
import { ArrowRight, Barbell } from './ui/Icons';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from './ui/Sheet';

interface ProgramLoadCardProps {
  program: WorkoutPlan;
  week: number;
  onWeekChange: (week: number) => void;
}

function formatWeekLoad(exercise: WorkoutPlan['days'][number]['exercises'][number], week: number): string {
  const sets = exercise.weeklySetLoadsKg?.[week - 1];
  if (sets) {
    const unique = [...new Set(sets)];
    if (unique.length === 1) return `${formatLoadKg(unique[0])} kg`;
    const max = Math.max(...sets);
    return `${formatLoadKg(exercise.weeklyLoadKg?.[week - 1] ?? max)} kg · 1 série à ${formatLoadKg(max)} kg`;
  }
  const load = exercise.weeklyLoadKg?.[week - 1];
  return load === undefined ? '—' : `${formatLoadKg(load)} kg`;
}

export function ProgramLoadCard({ program, week, onWeekChange }: ProgramLoadCardProps) {
  const strengthDays = program.days.filter((day) => day.id === 'full-body-a' || day.id === 'full-body-b');
  const weeks = [1, 2, 3, 4, 5] as const;
  const [open, setOpen] = useState(false);

  return (
    <>
      <button className="program-load-trigger" type="button" onClick={() => setOpen(true)}>
        <span className="program-load-trigger-icon" aria-hidden="true">
          <Barbell size={20} />
        </span>
        <span>
          <strong>Voir les charges prescrites</strong>
          <small>Semaine active : S{week} · tableau complet des exercices</small>
        </span>
        <ArrowRight size={19} aria-hidden="true" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="program-load-sheet" aria-describedby="program-load-description">
          <SheetHeader>
            <SheetTitle id="program-load-title">Charges prescrites</SheetTitle>
            <SheetDescription id="program-load-description">
              Les valeurs prévues par le programme. Les charges personnalisées se règlent dans Réglages.
            </SheetDescription>
          </SheetHeader>

          <div className="program-load-head">
            <div>
              <p className="eyebrow">PROGRAMME {program.displayName.toUpperCase()}</p>
              <h2>Semaine {week}</h2>
            </div>
            <label className="program-week-select">
              <span>Semaine active</span>
              <select value={week} onChange={(event) => onWeekChange(Number(event.target.value))}>
                {Array.from({ length: 5 }, (_, index) => index + 1).map((item) => (
                  <option key={item} value={item}>
                    Semaine {item}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="program-load-table-wrap">
            <table className="program-load-table">
              <thead>
                <tr>
                  <th scope="col">Exercice</th>
                  {weeks.map((weekNumber) => (
                    <th key={`week-${weekNumber}`} scope="col" className={week === weekNumber ? 'active' : undefined}>
                      S{weekNumber}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {strengthDays.map((day) => (
                  <tr className="program-load-day" key={day.id}>
                    <th colSpan={6} scope="rowgroup">
                      {day.name}
                    </th>
                  </tr>
                ))}
                {strengthDays.flatMap((day) =>
                  day.exercises
                    .filter((exercise) => exercise.weeklyLoadKg)
                    .map((exercise) => (
                      <tr key={`${day.id}-${exercise.id}`}>
                        <th scope="row">{exercise.name}</th>
                        {weeks.map((weekNumber) => (
                          <td key={`week-${weekNumber}`} className={week === weekNumber ? 'active' : undefined}>
                            {formatWeekLoad(exercise, weekNumber)}
                          </td>
                        ))}
                      </tr>
                    )),
                )}
              </tbody>
            </table>
          </div>
          <small className="program-load-note">
            Les semaines 6 à 8 restent à renseigner ; elles ne remplacent aucune donnée existante.
          </small>
        </SheetContent>
      </Sheet>
    </>
  );
}
