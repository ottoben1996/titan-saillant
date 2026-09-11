import type { WorkoutSession } from '../../domain/types';
import { ArrowLeft, Check, Repeat } from '../ui/Icons';

interface HistoryScreenProps {
  history: WorkoutSession[];
  onBack: () => void;
}

export function HistoryScreen({ history, onBack }: HistoryScreenProps) {
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
          <h2>Pas encore de séance</h2>
          <p>Ta première séance apparaîtra ici.</p>
        </div>
      ) : (
        <div className="history-list">
          {history.map((item) => (
            <article className="history-item" key={item.id}>
              <div className="history-date">
                {new Date(item.startedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
              </div>
              <div>
                <strong>
                  {item.dayId === 'full-body-a' ? 'Full Body A' : item.dayId === 'full-body-b' ? 'Full Body B' : 'Cardio'}
                </strong>
                <small>
                  {item.loggedSets.length} séries validées · {item.completedAt ? 'Terminée' : 'En cours'}
                  {item.perceivedExertion ? ` · RPE ${item.perceivedExertion}/10` : ''}
                  {item.alternativesUsed?.length
                    ? ` · ${item.alternativesUsed.length} alternative${item.alternativesUsed.length > 1 ? 's' : ''}`
                    : ''}
                </small>
              </div>
              <span className={item.completedAt ? 'history-check done' : 'history-check'}>
                <Check size={15} />
              </span>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
