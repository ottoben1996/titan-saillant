import { ArrowLeft, Gear } from '../ui/Icons';

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
      <div className="topbar-brand">
        <span className="brand-mark small">
          {/* La marque de l'application : l'anneau et le carre arrondi qui se
              chevauchent. Détourée depuis l'image source (lime sur fond noir),
              elle flotte sur le fond de l'en-tête sans raccord visible. */}
          <img src="/icons/logo-mark.png" alt="" width={20} height={20} />
        </span>
        <span>COACH</span>
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
