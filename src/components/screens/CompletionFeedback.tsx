import { useMemo, useState } from 'react';
import { exerciseLabel } from '../../domain/labels';
import { getProgram } from '../../domain/programs';
import type { LoadConsigne, WorkoutSession } from '../../domain/types';
import {
  beatenRecords,
  formatLoadKg,
  formatMinutes,
  formatSignedInt,
  formatSignedKg,
  previousSessionFor,
  sessionBestLoadKg,
  sessionVolume,
  summarizeSession,
  workoutDayLabel,
} from '../../workout/summary';
import { SetCorrectionTimeline } from '../SetCorrectionTimeline';
import { ArrowRight, Bolt, Check, Clock } from '../ui/Icons';
import { NombreAnime } from '../ui/NombreAnime';

interface CompletionFeedbackProps {
  session: WorkoutSession;
  profileId?: import('../../domain/types').ProfileId;
  /** L'historique des séances terminées : référence des écarts et des records. */
  history?: readonly WorkoutSession[];
  onSessionChange?: (session: WorkoutSession) => void;
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
export function CompletionFeedback({
  session,
  profileId,
  history = [],
  onSessionChange,
  onFinish,
}: CompletionFeedbackProps) {
  const [rpe, setRpe] = useState(() => session.perceivedExertion?.toString() ?? '');
  const [energy, setEnergy] = useState(() => session.energy ?? 0);
  const [pain, setPain] = useState(() => session.pain ?? 'Aucune');
  const [painLocation, setPainLocation] = useState(() => session.painLocation ?? '');
  const [loadConsigne, setLoadConsigne] = useState<LoadConsigne | ''>(() => session.loadConsigne ?? '');
  const [notes, setNotes] = useState(() => session.notes ?? '');
  const [saving, setSaving] = useState(false);

  const program = useMemo(() => (profileId ? getProgram(profileId) : undefined), [profileId]);

  const exercises = useMemo(
    () => program?.days.find((item) => item.id === session.dayId)?.exercises ?? [],
    [program, session.dayId],
  );

  const summary = useMemo(() => summarizeSession(session), [session]);

  /**
   * Les écarts contre la dernière séance du même jour. Sans référence, rien ne
   * s'affiche : une première fois n'est pas un point de comparaison.
   */
  const comparaison = useMemo(() => {
    const precedente = previousSessionFor(history, session);
    if (!precedente) return null;
    return {
      volume: sessionVolume(session) - sessionVolume(precedente),
      charge: sessionBestLoadKg(session) - sessionBestLoadKg(precedente),
    };
  }, [history, session]);

  /** Records battus cette séance, contre l'historique hors séance en cours. */
  const records = useMemo(() => beatenRecords(session, history), [history, session]);

  const noms = useMemo(() => new Map(exercises.map((item) => [item.id, item.name])), [exercises]);

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
          <h1>Bilan de {workoutDayLabel(summary.dayId, program)}</h1>
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
          <strong>
            <NombreAnime valeur={summary.sets} decimals={0} />
          </strong>
        </div>
        <div className="bilan-cell accent">
          <span>Volume</span>
          <strong>
            {summary.volumeKg > 0 ? (
              <NombreAnime valeur={summary.volumeKg} decimals={0} suffixe="kg·rép." />
            ) : (
              'PDC / cardio'
            )}
          </strong>
          {comparaison && summary.volumeKg > 0 && (
            <small className="bilan-delta">{formatSignedInt(comparaison.volume)} kg·rép. vs ta dernière fois</small>
          )}
        </div>
        <div className="bilan-cell">
          <span>Meilleure charge</span>
          <strong>
            {summary.bestLoadKg > 0 ? (
              <NombreAnime
                valeur={summary.bestLoadKg}
                decimals={Number.isInteger(summary.bestLoadKg) ? 0 : 1}
                suffixe="kg"
              />
            ) : (
              '—'
            )}
          </strong>
          {comparaison && summary.bestLoadKg > 0 && (
            <small className="bilan-delta">{formatSignedKg(comparaison.charge)} kg vs ta dernière fois</small>
          )}
        </div>
      </div>

      {/* Les records tombent rarement : quand il y en a un, il se voit. Les
          valeurs restent en clair — la comparaison « avant » compte autant que
          le nouveau chiffre. */}
      {records.slice(0, 3).map((record) => (
        <p className="bilan-record" key={record.exerciseId}>
          <Bolt size={15} />
          <span>
            Record battu — {exerciseLabel(record.exerciseId, noms.get(record.exerciseId))}
            {'\u00a0'}: <b>{formatLoadKg(record.loadKg)} kg</b>{' '}
            <small>(avant {formatLoadKg(record.previousLoadKg)} kg)</small>
          </span>
        </p>
      ))}

      {/* Les chiffres ci-dessus sont ceux du carnet : ils comptent l'échauffement
          et le retour au calme, parce que c'est ce qui a réellement été fait.
          Le dire évite de les lire comme des séries de travail — la section force
          du bilan, elle, exclut bien l'échauffement. */}
      <p className="muted-copy">
        Séries et volume comptent l’échauffement et le retour au calme : c’est le travail réellement effectué, pas
        seulement les séries de travail.
      </p>
      {onSessionChange && (
        <SetCorrectionTimeline
          sets={session.loggedSets}
          exercises={exercises}
          onChange={(loggedSets) => onSessionChange({ ...session, loggedSets, updatedAt: new Date().toISOString() })}
        />
      )}
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
              placeholder="Où ? Ex. épaule droite, genou gauche…"
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
