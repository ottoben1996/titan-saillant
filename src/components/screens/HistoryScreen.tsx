import { useMemo } from 'react';
import type { WorkoutSession } from '../../domain/types';
import {
  formatMinutes,
  groupSessionsByWeek,
  sessionDurationSeconds,
  sessionSetCount,
  summarizeSession,
  workoutDayLabel,
} from '../../workout/summary';
import { ArrowLeft, Check, Clock, Repeat } from '../ui/Icons';

interface HistoryScreenProps {
  history: WorkoutSession[];
  onBack: () => void;
}

function sessionDateLabel(item: WorkoutSession): string {
  return new Date(item.completedAt ?? item.startedAt).toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export function HistoryScreen({ history, onBack }: HistoryScreenProps) {
  const groups = useMemo(() => groupSessionsByWeek(history), [history]);

  return (
    <section className="content">
      <div className="page-heading">
        <div>
          <p className="eyebrow">TON PARCOURS</p>
          <h1>Historique</h1>
        </div>
        <button className="text-button" onClick={onBack}>
          <ArrowLeft size={16} /> Accueil
        </button>
      </div>

      {history.length === 0 ? (
        <div className="empty-state">
          <Repeat size={34} />
          <h2>Aucune séance enregistrée</h2>
          <p>Ta première séance apparaîtra ici, avec sa durée, tes séries validées et ton ressenti.</p>
          <button className="primary-button empty-cta" onClick={onBack}>
            Choisir ma séance
          </button>
        </div>
      ) : (
        <div className="history-weeks">
          {groups.map((group) => (
            <section className="history-week" key={group.key}>
              <div className="week-heading">
                <h2>{group.label}</h2>
                <span>
                  {group.sessions.length} séance{group.sessions.length > 1 ? 's' : ''}
                </span>
              </div>
              <div className="history-list">
                {group.sessions.map((item) => {
                  const summary = summarizeSession(item);
                  const done = Boolean(item.completedAt);
                  return (
                    <article className={`history-row${done ? '' : ' in-progress'}`} key={item.id}>
                      <div className="history-row-main">
                        <strong>{workoutDayLabel(item.dayId)}</strong>
                        <small>{sessionDateLabel(item)}</small>
                      </div>
                      <div className="history-row-meta">
                        <span className="history-figure">
                          <Clock size={13} />
                          {done ? formatMinutes(sessionDurationSeconds(item)) : 'En cours'}
                        </span>
                        <span className="history-figure">
                          {sessionSetCount(item)} série{sessionSetCount(item) > 1 ? 's' : ''}
                        </span>
                        {item.perceivedExertion ? (
                          <span className="history-figure">RPE {item.perceivedExertion}/10</span>
                        ) : null}
                        {summary.volumeKg > 0 && (
                          <span className="history-figure">{summary.volumeKg.toLocaleString('fr-FR')} kg·rép.</span>
                        )}
                      </div>
                      <span className={done ? 'history-check done' : 'history-check'} aria-hidden="true">
                        <Check size={15} />
                      </span>
                      <span className="sr-only">{done ? 'Séance terminée' : 'Séance en cours'}</span>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}
