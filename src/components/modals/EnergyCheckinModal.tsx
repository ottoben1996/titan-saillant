import { useState } from 'react';
import type { WorkoutDay } from '../../domain/types';
import { ArrowRight, Bolt, Clock, Feather, Leaf } from '../ui/Icons';

export type EnergyLevel = 'high' | 'normal' | 'low';

interface EnergyCheckinModalProps {
  day: WorkoutDay;
  profileName: string;
  onConfirm: (energy: EnergyLevel, restMultiplier: number) => void;
  onSkip: () => void;
}

export function EnergyCheckinModal({ day, profileName, onConfirm, onSkip }: EnergyCheckinModalProps) {
  const [selectedLevel, setSelectedLevel] = useState<EnergyLevel>('normal');

  const handleStart = () => {
    const multiplier = selectedLevel === 'low' ? 1.2 : 1.0;
    onConfirm(selectedLevel, multiplier);
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="energy-checkin-title">
      <div className="tutorial-modal energy-modal">
        <p className="eyebrow">CHECK-IN D’ÉNERGIE · {profileName.toUpperCase()}</p>
        <h2 id="energy-checkin-title">Comment te sens-tu aujourd’hui ?</h2>
        <p id="energy-checkin-desc">
          On adapte la séance à ta forme du jour pour que chaque répétition reste efficace et sans risque.
        </p>

        <div className="energy-choice-grid">
          <button
            type="button"
            className={`energy-option ${selectedLevel === 'high' ? 'selected' : ''}`}
            onClick={() => setSelectedLevel('high')}
          >
            <Bolt className="energy-icon" size={24} />
            <strong>Plein d’énergie</strong>
            <small>Rythme soutenu & repos stricts du coach</small>
          </button>

          <button
            type="button"
            className={`energy-option ${selectedLevel === 'normal' ? 'selected' : ''}`}
            onClick={() => setSelectedLevel('normal')}
          >
            <Feather className="energy-icon" size={24} />
            <strong>Forme normale</strong>
            <small>Temps de repos standards prescrits</small>
          </button>

          <button
            type="button"
            className={`energy-option ${selectedLevel === 'low' ? 'selected' : ''}`}
            onClick={() => setSelectedLevel('low')}
          >
            <Leaf className="energy-icon" size={24} />
            <strong>Fatigue / Récupération</strong>
            <small>Repos allongés (+20%) pour garder un contrôle parfait</small>
          </button>
        </div>

        {selectedLevel === 'low' && (
          <div className="energy-notice">
            <Clock size={16} />
            <span>
              Les temps de repos seront majorés de 20 % (par exemple, 120 s passent à 145 s) pour préserver ta
              fraîcheur.
            </span>
          </div>
        )}

        <div className="exit-actions" style={{ marginTop: '1.25rem' }}>
          <button type="button" className="primary-button full" onClick={handleStart}>
            Démarrer {day.name} <ArrowRight size={18} />
          </button>
          <button type="button" className="secondary-button full" onClick={onSkip}>
            Démarrer directement sans ajustement
          </button>
        </div>
      </div>
    </div>
  );
}
