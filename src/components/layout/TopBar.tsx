import { ArrowLeft, Gear } from '../ui/Icons';
import { LogoMark } from '../ui/LogoMark';

interface TopBarProps {
  onBack: () => void;
  backLabel: string;
  isOnline: boolean;
  onOpenSettings: () => void;
  /** Titre de l'écran courant : il prend la place de la marque au défilement. */
  titre?: string;
}

export function TopBar({ onBack, backLabel, isOnline, onOpenSettings, titre }: TopBarProps) {
  return (
    <header className="topbar">
      <button className="icon-button" type="button" onClick={onBack} aria-label={backLabel}>
        <ArrowLeft size={21} />
      </button>
      {titre && <span className="topbar-titre">{titre}</span>}
      <div className="topbar-brand" aria-label="Coach Ottman et Laura">
        <span className="brand-mark small" aria-hidden="true">
          <LogoMark size={18} />
        </span>
        <span className="topbar-brand-name">COACH</span>
      </div>
      {/* L'état « en ligne » est la situation normale : l'afficher en permanence
          ajoute du bruit. Seul le passage hors ligne mérite d'être signalé. */}
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
