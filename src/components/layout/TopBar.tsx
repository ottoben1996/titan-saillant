import { ChevronLeft, X } from '../ui/Icons';

/**
 * Ce que porte le bord gauche de la barre :
 *  - `onglet` : rien à gauche, l'avatar du profil à droite ;
 *  - `retour` : un chevron qui remonte d'un niveau (bilan) ;
 *  - `fermer` : une croix qui quitte la séance.
 */
export type ModeBarre = 'onglet' | 'retour' | 'fermer';

interface TopBarProps {
  mode: ModeBarre;
  onBack: () => void;
  backLabel: string;
  isOnline: boolean;
  /** Titre de l'écran courant : il apparaît au défilement, quand le grand titre s'efface. */
  titre?: string;
  /** Initiale du profil actif, affichée dans l'avatar des écrans racines. */
  initiale: string;
  onChangerProfil: () => void;
}

export function TopBar({ mode, onBack, backLabel, isOnline, titre, initiale, onChangerProfil }: TopBarProps) {
  return (
    <header className="topbar" data-mode={mode}>
      <div className="topbar-gauche">
        {mode !== 'onglet' && (
          <button className="icon-button" type="button" onClick={onBack} aria-label={backLabel}>
            {mode === 'fermer' ? <X size={20} /> : <ChevronLeft size={22} />}
          </button>
        )}
      </div>
      {titre && (
        <span className="topbar-titre" aria-hidden="true">
          {titre}
        </span>
      )}
      <div className="topbar-droite">
        {/* L'état « en ligne » est la situation normale : seul le passage hors
            ligne mérite d'être signalé. */}
        <span className={`connection-pill ${isOnline ? 'online' : 'offline'}`} role="status">
          <span className="connection-dot" aria-hidden="true" />
          {isOnline ? 'En ligne' : 'Hors ligne'}
        </span>
        {mode === 'onglet' && (
          <button className="topbar-avatar" type="button" onClick={onChangerProfil} aria-label="Changer de profil">
            <span aria-hidden="true">{initiale}</span>
          </button>
        )}
      </div>
    </header>
  );
}
