import { useState } from 'react';
import type { WorkoutSession } from '../../domain/types';
import { ArrowRight, Check } from '../ui/Icons';

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

  const totalVolume = session.loggedSets.reduce(
    (acc, set) => acc + (set.actualLoadKg ?? 0) * (set.actualRepetitions ?? 0),
    0
  );
  const totalSets = session.loggedSets.length;

  return (
    <section className="content completion-screen">
      <div className="completion-icon">
        <Check size={42} weight="bold" />
      </div>
      <p className="eyebrow">SÉANCE TERMINÉE</p>
      <h1>
        Tu l’as<br />
        <em>fait.</em>
      </h1>
      <p className="intro">Chaque effort compte. Donne-nous ton ressenti pour adapter les prochains conseils.</p>

      <div className="session-summary-strip">
        <div className="summary-pill">
          <span>Volume de la séance</span>
          <strong>{totalVolume > 0 ? `${totalVolume.toLocaleString('fr-FR')} kg·rép` : 'Séance PDC / Cardio'}</strong>
        </div>
        <div className="summary-pill">
          <span>Séries complétées</span>
          <strong>{totalSets} séries</strong>
        </div>
      </div>

      <div className="feedback-card">
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
        <button className="primary-button full" onClick={() => void submit()} disabled={saving}>
          {saving ? 'Enregistrement…' : 'Enregistrer mon bilan'} <ArrowRight size={19} />
        </button>
        <button className="secondary-button full" onClick={() => void submit(true)} disabled={saving}>
          Passer pour le moment
        </button>
      </div>
    </section>
  );
}
