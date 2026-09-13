interface ExitWorkoutDialogProps {
  onCancel: () => void;
  onPause: () => void;
  /** Annule la séance : les séries validées sont supprimées. */
  onAbandon: () => void;
}

export function ExitWorkoutDialog({ onCancel, onPause, onAbandon }: ExitWorkoutDialogProps) {
  return (
    <div
      className="modal-backdrop exit-backdrop"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="exit-workout-title"
      aria-describedby="exit-workout-description"
    >
      <div className="tutorial-modal exit-dialog">
        <p className="eyebrow">SÉANCE EN COURS</p>
        <h2 id="exit-workout-title">Quitter la séance ?</h2>
        <p id="exit-workout-description">
          En pause, la séance est gardée : tu la reprends depuis l’accueil, au même mouvement. L’annuler supprime les
          séries déjà validées.
        </p>
        <div className="exit-actions">
          <button type="button" className="primary-button full" onClick={onPause}>
            Mettre en pause
          </button>
          <button type="button" className="secondary-button full" onClick={onCancel}>
            Continuer la séance
          </button>
          <button type="button" className="abandon-button full" onClick={onAbandon}>
            Annuler la séance
          </button>
        </div>
      </div>
    </div>
  );
}
