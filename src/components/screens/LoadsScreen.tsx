import { useEffect, useState } from 'react';
import { getProgram } from '../../domain/programs';
import type { ManualLoadOverrides, ProfileId } from '../../domain/types';
import { formatLoadKg } from '../../workout/summary';
import { ArrowLeft } from '../ui/Icons';

interface LoadsScreenProps {
  profile: ProfileId;
  manualLoads: ManualLoadOverrides;
  onBack: () => void;
  onNotice: (notice: string) => void;
  onSave: (loads: ManualLoadOverrides) => Promise<void> | void;
}

export function LoadsScreen({ profile, manualLoads, onBack, onNotice, onSave }: LoadsScreenProps) {
  const [draft, setDraft] = useState<ManualLoadOverrides>(manualLoads);
  const weeks = [1, 2, 3, 4, 5] as const;
  const exercises = getProgram(profile)
    .days.filter((day) => day.id === 'full-body-a' || day.id === 'full-body-b')
    .flatMap((day) => day.exercises.filter((exercise) => exercise.kind === 'strength'));

  useEffect(() => setDraft(manualLoads), [manualLoads]);

  const prescribed = (exercise: (typeof exercises)[number], weekIndex: number) => {
    const sets = exercise.weeklySetLoadsKg?.[weekIndex];
    if (sets) {
      const unique = [...new Set(sets)];
      if (unique.length === 1) return `${formatLoadKg(unique[0])} kg`;
      return `${formatLoadKg(exercise.weeklyLoadKg?.[weekIndex] ?? Math.max(...sets))} kg`;
    }
    const load = exercise.weeklyLoadKg?.[weekIndex];
    return load === undefined ? '—' : `${formatLoadKg(load)} kg`;
  };

  const update = (exerciseId: string, index: number, raw: string) => {
    const value = raw.trim() === '' ? null : Number(raw.replace(',', '.'));
    setDraft((current) => {
      const values = [...(current[exerciseId] ?? Array.from({ length: 5 }, () => null))];
      values[index] = Number.isFinite(value) && value !== null && value >= 0 ? value : null;
      const next = { ...current, [exerciseId]: values };
      if (values.every((item) => item === null)) delete next[exerciseId];
      return next;
    });
  };

  const reset = (exerciseId: string) =>
    setDraft((current) => {
      const next = { ...current };
      delete next[exerciseId];
      return next;
    });

  const save = async () => {
    await onSave(draft);
    onNotice('Charges personnalisées enregistrées. L’historique reste inchangé.');
  };

  return (
    <section className="content">
      <div className="page-heading">
        <div>
          <p className="eyebrow">RÉGLAGE DES EXERCICES</p>
          <h1>Mes charges</h1>
        </div>
        <button className="text-button" onClick={onBack} type="button">
          <ArrowLeft size={16} /> Retour
        </button>
      </div>
      <p className="settings-section-intro">
        Modifie ici les charges de chaque exercice et de chaque semaine. Les prescriptions originales et ton historique
        restent conservés.
      </p>
      <div className="manual-loads-list">
        {exercises.map((exercise) => {
          const overrides = draft[exercise.id] ?? [];
          return (
            <article className="manual-load-card" key={exercise.id}>
              <div className="manual-load-card-head">
                <div>
                  <strong>{exercise.name}</strong>
                  <small>Valeur prescrite affichée comme repère</small>
                </div>
                <button
                  className="text-button"
                  type="button"
                  onClick={() => reset(exercise.id)}
                  disabled={!draft[exercise.id]}
                >
                  Réinitialiser
                </button>
              </div>
              <div className="manual-load-grid">
                {weeks.map((week, index) => (
                  <label key={`${exercise.id}-${week}`}>
                    <span>S{week}</span>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      inputMode="decimal"
                      value={overrides[index] ?? ''}
                      placeholder={prescribed(exercise, index)}
                      aria-label={`${exercise.name} semaine ${week}`}
                      onChange={(event) => update(exercise.id, index, event.target.value)}
                    />
                  </label>
                ))}
              </div>
            </article>
          );
        })}
      </div>
      <button className="primary-button full" type="button" onClick={() => void save()}>
        Enregistrer mes charges
      </button>
    </section>
  );
}
