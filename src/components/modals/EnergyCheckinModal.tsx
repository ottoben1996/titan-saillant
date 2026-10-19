import { type ComponentType, useState } from 'react';
import type { WorkoutDay } from '../../domain/types';
import { Battery, Bolt, Check, Clock, type IconProps, Moon, Play } from '../ui/Icons';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../ui/Sheet';

export type EnergyLevel = 'high' | 'normal' | 'low';

interface EnergyCheckinModalProps {
  day: WorkoutDay;
  profileName: string;
  onConfirm: (energy: EnergyLevel, restMultiplier: number) => void;
  onSkip: () => void;
}

const OPTIONS: ReadonlyArray<{
  level: EnergyLevel;
  label: string;
  detail: string;
  Icon: ComponentType<IconProps>;
}> = [
  { level: 'high', label: 'Plein d’énergie', detail: 'Rythme soutenu, repos stricts du coach', Icon: Bolt },
  { level: 'normal', label: 'Forme normale', detail: 'Temps de repos prescrits', Icon: Battery },
  { level: 'low', label: 'Fatigue / récupération', detail: 'Repos allongés de 20 %', Icon: Moon },
];

/** Feuille du check-in d'énergie : un choix, une action. */
export function EnergyCheckinModal({ day, profileName, onConfirm, onSkip }: EnergyCheckinModalProps) {
  const [selectedLevel, setSelectedLevel] = useState<EnergyLevel>('normal');

  return (
    // Pas de fermeture implicite (Échap, voile) : « Passer » est le seul moyen
    // explicite de démarrer sans ajustement, comme avant.
    <Sheet open onOpenChange={() => undefined}>
      <SheetContent className="energy-sheet" showClose={false} aria-describedby="energy-checkin-desc">
        <SheetHeader className="energy-sheet-head">
          <SheetTitle id="energy-checkin-title">{'Comment te sens-tu aujourd’hui\u00A0?'}</SheetTitle>
          <button type="button" className="text-button" onClick={onSkip} aria-label="Passer l’ajustement">
            Passer
          </button>
        </SheetHeader>
        <SheetDescription id="energy-checkin-desc">
          {day.name} · {profileName}. On adapte les repos à ta forme du jour.
        </SheetDescription>

        <div className="energy-list" role="radiogroup" aria-label="Forme du jour">
          {OPTIONS.map(({ level, label, detail, Icon }) => {
            const choisi = selectedLevel === level;
            return (
              <button
                key={level}
                type="button"
                role="radio"
                aria-checked={choisi}
                className={choisi ? 'energy-option selected' : 'energy-option'}
                onClick={() => setSelectedLevel(level)}
              >
                <span className="energy-icon" aria-hidden="true">
                  <Icon size={20} />
                </span>
                <span className="energy-text">
                  <strong>{label}</strong>
                  <small>{detail}</small>
                </span>
                <span className="energy-check" aria-hidden="true">
                  {choisi ? <Check size={18} weight="bold" /> : null}
                </span>
              </button>
            );
          })}
        </div>

        {selectedLevel === 'low' && (
          <p className="energy-notice">
            <Clock size={16} aria-hidden="true" />
            <span>Par exemple, 120 s de repos passent à 145 s pour préserver ta fraîcheur.</span>
          </p>
        )}

        <button
          type="button"
          className="primary-button full"
          onClick={() => onConfirm(selectedLevel, selectedLevel === 'low' ? 1.2 : 1.0)}
          aria-label={`Commencer ${day.name}`}
        >
          <Play size={18} weight="fill" /> Commencer
        </button>
      </SheetContent>
    </Sheet>
  );
}
