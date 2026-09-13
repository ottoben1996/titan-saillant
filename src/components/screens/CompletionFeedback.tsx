import { useMemo, useState } from 'react';
import type { LoadConsigne, WorkoutSession } from '../../domain/types';
import { formatLoadKg, formatMinutes, formatVolume, summarizeSession, workoutDayLabel } from '../../workout/summary';
import { ArrowRight, Check, Clock } from '../ui/Icons';

interface CompletionFeedbackProps {
  session: WorkoutSession;
  onFinish: (
    feedback?: Pick<
      WorkoutSession,
      'perceivedExertion' | 'energy' | 'pain' | 'painLocation' | 'loadConsigne' | 'notes'
    >,
  ) => Promise<void> | void;
}

/** Énergie (1 à 5) : 5 « mieux que d'habitude », 3 « comme d'habitude », 1 « moins bien ». */
const formes: readonly { label: string; energy: number }[] = Object.freeze([
  { label: "Mieux que d'habitude", energy: 5 },
  { label: "Comme d'habitude", energy: 3 },
  { label: 'Moins bien', energy: 1 },
]);

const douleurs: readonly string[] = Object.freeze(['Aucune', 'Gêne légère', 'Douleur']);

const consignes: readonly { label: string; value: LoadConsigne }[] = Object.freeze([
  { label: 'Charger plus', value: 'increase' },
  { label: 'Même charge', value: 'same' },
  { label: 'Alléger', value: 'decrease' },
]);

/**
 * Quiz de fin de séance : quatre réponses, en boutons, à donner debout dans la
 * salle. Tout est facultatif — un athlète fatigué doit pouvoir terminer en un
 * geste — mais chaque réponse alimente le bilan du samedi et le coaching de la
 * prochaine séance.
 */
export function CompletionFeedback({ session, onFinish }: CompletionFeedbackProps) {
  const [rpe, setRpe] = useState(() => session.perceivedExertion?.toString() ?? '');
  const [energy, setEnergy] = useState(() => session.energy ?? 0);
  const [pain, setPain] = useState(() => session.pain ?? 'Aucune');
  const [painLocation, setPainLocation] = useState(() => session.painLocation ?? '');
  const [loadConsigne, setLoadConsigne] = useState<LoadConsigne | ''>(() => session.loadConsigne ?? '');
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
              energy: energy > 0 ? energy : undefined,
              pain: pain || undefined,
              painLocation: pain !== 'Aucune' ? painLocation.trim() || undefined : undefined,
              loadConsigne: loadConsigne || undefined,
              notes: notes.trim() || undefined,
            },
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

      {/* 2. Le ressenti : il alimente le bilan du samedi et le coaching. */}
      <div className="feedback-card">
        <div className="feedback-heading">
          <p className="eyebrow">TON RESSENTI</p>
          <p className="muted-copy">
            Quatre réponses rapides. Elles partent dans ton bilan du samedi et ajustent la prochaine séance.
          </p>
        </div>

        <div className="quiz-question">
          <span className="quiz-label" id="quiz-rpe">
            Effort ressenti
          </span>
          <div className="quiz-scale" role="group" aria-labelledby="quiz-rpe">
            {Array.from({ length: 10 }, (_, index) => index + 1).map((value) => (
              <button
                key={value}
                type="button"
                className={`quiz-chip${rpe === String(value) ? ' on' : ''}`}
                aria-pressed={rpe === String(value)}
                onClick={() => setRpe(rpe === String(value) ? '' : String(value))}
              >
                {value}
              </button>
            ))}
          </div>
          <small className="quiz-help">{rpe ? `${rpe}/10` : '1 = très facile, 10 = effort maximal'}</small>
        </div>

        <div className="quiz-question">
          <span className="quiz-label" id="quiz-forme">
            Forme du jour
          </span>
          <div className="quiz-choices" role="group" aria-labelledby="quiz-forme">
            {formes.map((forme) => (
              <button
                key={forme.energy}
                type="button"
                className={`quiz-choice${energy === forme.energy ? ' on' : ''}`}
                aria-pressed={energy === forme.energy}
                onClick={() => setEnergy(energy === forme.energy ? 0 : forme.energy)}
              >
                {forme.label}
              </button>
            ))}
          </div>
        </div>

        <div className="quiz-question">
          <span className="quiz-label" id="quiz-gene">
            Gêne ou douleur
          </span>
          <div className="quiz-choices" role="group" aria-labelledby="quiz-gene">
            {douleurs.map((option) => (
              <button
                key={option}
                type="button"
                className={`quiz-choice${pain === option ? ' on' : ''}`}
                aria-pressed={pain === option}
                onClick={() => setPain(option)}
              >
                {option}
              </button>
            ))}
          </div>
          {pain !== 'Aucune' && (
            <input
              className="quiz-input"
              value={painLocation}
              onChange={(event) => setPainLocation(event.target.value)}
              placeholder="Où ? Ex. épaule droite, genou gauche…"
              aria-label="Où se situe la gêne"
            />
          )}
        </div>

        <div className="quiz-question">
          <span className="quiz-label" id="quiz-consigne">
            Prochaine fois
          </span>
          <div className="quiz-choices" role="group" aria-labelledby="quiz-consigne">
            {consignes.map((consigne) => (
              <button
                key={consigne.value}
                type="button"
                className={`quiz-choice${loadConsigne === consigne.value ? ' on' : ''}`}
                aria-pressed={loadConsigne === consigne.value}
                onClick={() => setLoadConsigne(loadConsigne === consigne.value ? '' : consigne.value)}
              >
                {consigne.label}
              </button>
            ))}
          </div>
        </div>

        <label className="quiz-notes">
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
        <button className="primary-button full" onClick={() => void submit()} disabled={saving} type="button">
          {saving ? 'Enregistrement…' : 'Enregistrer et terminer'} <ArrowRight size={19} />
        </button>
        <button className="secondary-button full" onClick={() => void submit(true)} disabled={saving} type="button">
          Terminer sans renseigner le ressenti
        </button>
      </div>
    </section>
  );
}
