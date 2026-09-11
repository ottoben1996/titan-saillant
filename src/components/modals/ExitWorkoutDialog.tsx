interface ExitWorkoutDialogProps {
  onCancel: () => void;
  onPause: () => void;
}

export function ExitWorkoutDialog({ onCancel, onPause }: ExitWorkoutDialogProps) {
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
          La séance restera enregistrée en cours et tu pourras la reprendre depuis l’accueil.
        </p>
        <div className="exit-actions">
          <button type="button" className="primary-button full" onClick={onPause}>
            Mettre en pause
          </button>
          <button type="button" className="secondary-button full" onClick={onCancel}>
            Continuer la séance
          </button>
        </div>
      </div>
    </div>
  );
}
