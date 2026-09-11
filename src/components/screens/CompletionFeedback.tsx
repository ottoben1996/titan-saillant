import { useMemo, useState } from 'react';
import type { WorkoutSession } from '../../domain/types';
import { formatLoadKg, formatMinutes, formatVolume, summarizeSession, workoutDayLabel } from '../../workout/summary';
import { ArrowRight, Check, Clock } from '../ui/Icons';

interface CompletionFeedbackProps {
  session: WorkoutSession;
  onFinish: (feedback?: Pick<WorkoutSession, 'perceivedExertion' | 'energy' | 'pain' | 'notes'>) => Promise<void>;
}

export function CompletionFeedback({ session, onFinish }: CompletionFeedbackProps) {
  const [rpe, setRpe] = useState(() => session.perceivedExertion?.toString() ?? '');
  const [energy, setEnergy] = useState(() => session.energy?.toString() ?? '');
  const [pain, setPain] = useState(() => session.pain ?? 'Aucune');
  const [notes, setNotes] = useState(() => session.notes ?? '');
  const [saving, setSaving] = useState(false);

  const summary = useMemo(() => summarizeSession(session), [session]);

  const submit = async (skip = false) => {
    if (saving) return;
    setSaving(true);
    try {
      await onFinish(
        skip
          ? undefined
          : {
              perceivedExertion: rpe ? Number(rpe) : undefined,
              energy: energy ? Number(energy) : undefined,
              pain: pain || undefined,
              notes: notes.trim() || undefined,
            }
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="content completion-screen">
      <div className="completion-head">
        <div className="completion-icon">
          <Check size={30} weight="bold" />
        </div>
        <div>
          <p className="eyebrow">SÉANCE TERMINÉE</p>
          <h1>Bilan de {workoutDayLabel(summary.dayId)}</h1>
        </div>
      </div>

      {/* 1. Le factuel : ce qui a réellement été accompli. */}
      <div className="bilan-grid">
        <div className="bilan-cell">
          <span>
            <Clock size={14} /> Durée
          </span>
          <strong>{formatMinutes(summary.durationSeconds)}</strong>
        </div>
        <div className="bilan-cell">
          <span>Séries validées</span>
          <strong>{summary.sets}</strong>
        </div>
        <div className="bilan-cell accent">
          <span>Volume</span>
          <strong>{summary.volumeKg > 0 ? `${formatVolume(summary.volumeKg)} kg·rép.` : 'PDC / cardio'}</strong>
        </div>
        <div className="bilan-cell">
          <span>Meilleure charge</span>
          <strong>{summary.bestLoadKg > 0 ? `${formatLoadKg(summary.bestLoadKg)} kg` : '—'}</strong>
        </div>
      </div>

      {/* 2. Le ressenti : il alimente le coaching de la prochaine séance. */}
      <div className="feedback-card">
        <div className="feedback-heading">
          <p className="eyebrow">TON RESSENTI</p>
          <p className="muted-copy">Ces réponses ajustent le coaching de tes prochaines séances.</p>
        </div>
        <div className="feedback-grid">
          <label>
            <span>Effort ressenti (RPE)</span>
            <select value={rpe} onChange={(event) => setRpe(event.target.value)}>
              <option value="">—</option>
              {Array.from({ length: 10 }, (_, index) => (
                <option key={index + 1} value={index + 1}>
                  {index + 1}/10
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Énergie</span>
            <select value={energy} onChange={(event) => setEnergy(event.target.value)}>
              <option value="">—</option>
              {Array.from({ length: 5 }, (_, index) => (
                <option key={index + 1} value={index + 1}>
                  {index + 1}/5
                </option>
              ))}
            </select>
          </label>
        </div>
        <label>
          <span>Douleur ou gêne</span>
          <select value={pain} onChange={(event) => setPain(event.target.value)}>
            <option>Aucune</option>
            <option>Gêne légère</option>
            <option>Douleur</option>
          </select>
        </label>
        <label>
          <span>Note personnelle (facultatif)</span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Ex. bonne forme, machine occupée…"
            rows={2}
          />
        </label>
      </div>

      {/* 3. L'appel à l'action : dernier écran vu après une séance. */}
      <div className="bilan-actions">
        <button className="primary-button full" onClick={() => void submit()} disabled={saving}>
          {saving ? 'Enregistrement…' : 'Enregistrer et terminer'} <ArrowRight size={19} />
        </button>
        <button className="secondary-button full" onClick={() => void submit(true)} disabled={saving}>
          Terminer sans renseigner le ressenti
        </button>
      </div>
    </section>
  );
}
