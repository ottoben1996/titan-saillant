import { Fragment } from 'react';
import type { WorkoutPlan } from '../domain/types';
import { formatLoadKg } from '../workout/summary';
import { SegmentedControl, type SegmentedOption } from './ui/SegmentedControl';

interface ProgramLoadCardProps {
  program: WorkoutPlan;
  week: number;
  onWeekChange: (week: number) => void;
}

const WEEKS = [1, 2, 3, 4, 5] as const;

const WEEK_OPTIONS: readonly SegmentedOption<string>[] = WEEKS.map((item) => ({
  value: String(item),
  label: `S${item}`,
}));

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

/** Charges prévues par le programme, semaine par semaine, avec la semaine active. */
export function ProgramLoadCard({ program, week, onWeekChange }: ProgramLoadCardProps) {
  const strengthDays = program.days.filter((day) => day.id === 'full-body-a' || day.id === 'full-body-b');

  return (
    <section className="program-load-card" aria-labelledby="program-load-title">
      <div className="program-load-head">
        <h2 id="program-load-title" className="section-title">
          Charges prescrites
        </h2>
        <p>
          Programme {program.displayName} · semaine active S{week}
        </p>
      </div>
      <SegmentedControl
        className="program-week-select"
        label="Semaine active"
        options={WEEK_OPTIONS}
        value={String(week)}
        onChange={(value) => onWeekChange(Number(value))}
      />

      <div className="program-load-table-wrap">
        <table className="program-load-table">
          <thead>
            <tr>
              <th scope="col">Exercice</th>
              {WEEKS.map((weekNumber) => (
                <th key={weekNumber} scope="col" className={week === weekNumber ? 'active' : undefined}>
                  S{weekNumber}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {strengthDays.map((day) => (
              <Fragment key={day.id}>
                <tr className="program-load-day">
                  <th colSpan={WEEKS.length + 1} scope="rowgroup">
                    {day.name}
                  </th>
                </tr>
                {day.exercises
                  .filter((exercise) => exercise.weeklyLoadKg)
                  .map((exercise) => (
                    <tr key={exercise.id}>
                      <th scope="row">{exercise.name}</th>
                      {WEEKS.map((weekNumber) => (
                        <td key={weekNumber} className={week === weekNumber ? 'active' : undefined}>
                          {formatWeekLoad(exercise, weekNumber)}
                        </td>
                      ))}
                    </tr>
                  ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <small className="program-load-note">
        Les semaines 6 à 8 restent à renseigner ; elles ne remplacent aucune donnée existante.
      </small>
    </section>
  );
}
