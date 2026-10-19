import { type KeyboardEvent, useRef } from 'react';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  /** Nom accessible du groupe, lu avant les options. */
  label: string;
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

/**
 * Contrôle segmenté à la manière d'iOS : un groupe de boutons radio.
 * Les flèches déplacent la sélection, comme un groupe radio natif.
 */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  className = '',
}: SegmentedControlProps<T>) {
  const groupe = useRef<HTMLDivElement>(null);

  const deplacer = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const pas =
      event.key === 'ArrowRight' || event.key === 'ArrowDown'
        ? 1
        : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
          ? -1
          : 0;
    if (pas === 0) return;
    event.preventDefault();
    const suivant = (index + pas + options.length) % options.length;
    onChange(options[suivant].value);
    groupe.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[suivant]?.focus();
  };

  return (
    <div ref={groupe} className={`segmented ${className}`.trim()} role="radiogroup" aria-label={label}>
      {options.map((option, index) => {
        const choisi = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={choisi}
            tabIndex={choisi ? 0 : -1}
            className={choisi ? 'segment actif' : 'segment'}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => deplacer(event, index)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export type ProgressScreen = 'progression' | 'history' | 'followup';

const PROGRESS_OPTIONS: readonly SegmentedOption<ProgressScreen>[] = [
  { value: 'progression', label: 'Tendances' },
  { value: 'history', label: 'Historique' },
  { value: 'followup', label: 'Points' },
];

/** Bascule entre les trois vues sœurs de l'onglet Progrès. */
export function ProgressTabs({
  current,
  onNavigate,
}: {
  current: ProgressScreen;
  onNavigate: (screen: ProgressScreen) => void;
}) {
  return (
    <SegmentedControl
      className="progress-tabs"
      label="Vue de la section Progrès"
      options={PROGRESS_OPTIONS}
      value={current}
      onChange={(screen) => {
        if (screen !== current) onNavigate(screen);
      }}
    />
  );
}
