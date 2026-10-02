import type { WorkoutPlan } from '../domain/types';
import { formatLoadKg } from '../workout/summary';

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

  return (
    <section className="program-load-card" aria-labelledby="program-load-title">
      <div className="program-load-head">
        <div>
          <p className="eyebrow">CHARGES PRESCRITES</p>
          <h2 id="program-load-title">Semaine {week}</h2>
          <p>Les historiques restent inchangés. Seule la prescription des prochaines séances évolue.</p>
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
    </section>
  );
}
