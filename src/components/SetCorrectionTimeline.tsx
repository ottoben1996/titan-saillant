import { useState } from 'react';
import type { ExercisePrescription, LoggedSet } from '../domain/types';
import { deleteLoggedSet, editLoggedSet, getLoggedSetKey, restoreLoggedSet } from '../workout/setCorrections';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { Check, Trash, Undo } from './ui/Icons';

interface SetCorrectionTimelineProps {
  sets: readonly LoggedSet[];
  exercises: readonly ExercisePrescription[];
  onChange: (sets: LoggedSet[]) => void;
}

const value = (number: number | undefined, suffix: string) => (number === undefined ? '—' : `${number} ${suffix}`);

export function SetCorrectionTimeline({ sets, exercises, onChange }: SetCorrectionTimelineProps) {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [draft, setDraft] = useState({ repetitions: '', durationSeconds: '', loadKg: '' });
  const [pendingDelete, setPendingDelete] = useState<{ key: string; index: number; set: LoggedSet } | null>(null);
  const [deleted, setDeleted] = useState<{ set: LoggedSet; index: number } | null>(null);

  const beginEdit = (set: LoggedSet, index: number) => {
    setEditingKey(getLoggedSetKey(set, index));
    setDraft({
      repetitions: set.actualRepetitions?.toString() ?? '',
      durationSeconds: set.actualDurationSeconds?.toString() ?? '',
      loadKg: set.actualLoadKg?.toString() ?? '',
    });
  };
  const saveEdit = (key: string) => {
    const parse = (raw: string) => (raw.trim() === '' ? undefined : Number(raw));
    onChange(
      editLoggedSet(sets, key, {
        actualRepetitions: parse(draft.repetitions),
        actualDurationSeconds: parse(draft.durationSeconds),
        actualLoadKg: parse(draft.loadKg),
      }),
    );
    setEditingKey(null);
  };
  const confirmDelete = () => {
    if (!pendingDelete) return;
    const result = deleteLoggedSet(sets, pendingDelete.key);
    if (result.deleted) {
      onChange(result.sets);
      setDeleted({ set: result.deleted, index: result.index });
    }
    setPendingDelete(null);
  };
  const restore = () => {
    if (!deleted) return;
    onChange(restoreLoggedSet(sets, deleted.set, deleted.index));
    setDeleted(null);
  };

  return (
    <section className="set-correction-timeline" aria-labelledby="set-correction-title">
      <div className="set-correction-heading">
        <div>
          <p className="eyebrow">CARNET DE LA SÉANCE</p>
          <h2 id="set-correction-title">Séries enregistrées</h2>
        </div>
        <span>
          {sets.length} série{sets.length > 1 ? 's' : ''}
        </span>
      </div>
      {sets.length === 0 ? (
        <p className="muted-copy">Aucune série enregistrée pour le moment.</p>
      ) : (
        <ol className="set-correction-list">
          {sets.map((set, index) => {
            const key = getLoggedSetKey(set, index);
            const exercise = exercises.find((item) => item.id === set.exerciseId);
            const isEditing = editingKey === key;
            return (
              <li key={key} className="set-correction-row">
                <div className="set-correction-main">
                  <strong>{exercise?.name ?? set.exerciseId}</strong>
                  <small>
                    Série {set.setIndex + 1} · {value(set.actualLoadKg, 'kg')} · {value(set.actualRepetitions, 'rép.')}{' '}
                    {set.actualDurationSeconds !== undefined ? `· ${set.actualDurationSeconds} s` : ''}
                  </small>
                </div>
                {isEditing ? (
                  <div className="set-correction-edit">
                    <input
                      aria-label="Répétitions corrigées"
                      inputMode="numeric"
                      value={draft.repetitions}
                      onChange={(event) => setDraft({ ...draft, repetitions: event.target.value })}
                      placeholder="Rép."
                    />
                    <input
                      aria-label="Durée corrigée"
                      inputMode="numeric"
                      value={draft.durationSeconds}
                      onChange={(event) => setDraft({ ...draft, durationSeconds: event.target.value })}
                      placeholder="Secondes"
                    />
                    <input
                      aria-label="Charge corrigée"
                      inputMode="decimal"
                      value={draft.loadKg}
                      onChange={(event) => setDraft({ ...draft, loadKg: event.target.value })}
                      placeholder="Kg"
                    />
                    <button type="button" className="text-button" onClick={() => saveEdit(key)}>
                      <Check size={16} /> Enregistrer
                    </button>
                  </div>
                ) : (
                  <div className="set-correction-actions">
                    <button type="button" className="text-button" onClick={() => beginEdit(set, index)}>
                      Corriger
                    </button>
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={`Supprimer la série ${set.setIndex + 1}`}
                      onClick={() => setPendingDelete({ key, index, set })}
                    >
                      <Trash size={16} />
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
      {deleted && (
        <button type="button" className="text-button set-correction-restore" onClick={restore}>
          <Undo size={16} /> Restaurer la série supprimée
        </button>
      )}
      {pendingDelete && (
        <ConfirmDialog
          eyebrow="CORRECTION DE SÉANCE"
          title="Supprimer cette série ?"
          description="Elle ne comptera plus dans le résumé, le volume ni la progression. Tu pourras la restaurer immédiatement."
          confirmLabel="Supprimer la série"
          cancelLabel="Garder la série"
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </section>
  );
}
