import { ArrowLeft, Barbell, Gear } from '../ui/Icons';

interface TopBarProps {
  onBack: () => void;
  backLabel: string;
  isOnline: boolean;
  onOpenSettings: () => void;
}

export function TopBar({ onBack, backLabel, isOnline, onOpenSettings }: TopBarProps) {
  return (
    <header className="topbar">
      <button className="icon-button" type="button" onClick={onBack} aria-label={backLabel}>
        <ArrowLeft size={21} />
      </button>
      <div className="topbar-brand">
        <span className="brand-mark small">
          <Barbell size={18} weight="duotone" />
        </span>
        <span>COACH</span>
      </div>
      <div
        className={`connection-pill ${isOnline ? 'online' : 'offline'}`}
        role="status"
        aria-label={isOnline ? 'Connexion disponible' : 'Mode hors ligne'}
      >
        <span className="connection-dot" />
        {isOnline ? 'En ligne' : 'Hors ligne'}
      </div>
      <button className="icon-button" type="button" onClick={onOpenSettings} aria-label="Réglages">
        <Gear size={21} />
      </button>
    </header>
  );
}
