import type { EquipmentAlternative } from '../../domain/alternatives';
import { Warning } from '../ui/Icons';
import { Sheet, SheetContent, SheetTitle } from '../ui/Sheet';

interface AlternativeModalProps {
  exerciseId: string;
  exerciseName: string;
  prescribedLoadKg?: number;
  alternative: EquipmentAlternative;
  onClose: () => void;
  onUse: (exerciseId: string, suggestedLoadKg?: number) => void;
}

export function AlternativeModal({
  exerciseId,
  exerciseName,
  prescribedLoadKg,
  alternative,
  onClose,
  onUse,
}: AlternativeModalProps) {
  const suggestedLoad = alternative.suggestedLoadKg?.(prescribedLoadKg);

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" onClose={onClose} aria-describedby="alternative-desc">
        <p className="eyebrow">ALTERNATIVE DE MATÉRIEL</p>
        <SheetTitle id="alternative-title">{alternative.name}</SheetTitle>
        <p className="alternative-for">
          À la place de <strong>{exerciseName}</strong>
        </p>
        <div id="alternative-desc" className="alternative-detail">
          <span>Matériel</span>
          <strong>{alternative.equipment}</strong>
          {suggestedLoad !== undefined && (
            <div className="alternative-suggested-load">
              <span>Charge recommandée :</span>
              <strong>{suggestedLoad} kg</strong>
              {prescribedLoadKg && <small>(au lieu de {prescribedLoadKg} kg machine)</small>}
            </div>
          )}
        </div>
        <h3>Garde la prescription</h3>
        <p>{alternative.setup}</p>
        <div className="safety-callout">
          <Warning size={16} /> {alternative.caution}
        </div>
        <p className="alternative-note">
          Cette alternative ne modifie pas ton programme : elle te permet de continuer la séance quand le matériel
          prescrit est indisponible.
        </p>
        <button
          type="button"
          className="primary-button full"
          onClick={() => {
            onUse(exerciseId, suggestedLoad);
            onClose();
          }}
        >
          Utiliser cette alternative {suggestedLoad ? `(${suggestedLoad} kg)` : ''}
        </button>
        <button type="button" className="secondary-button full" onClick={onClose} style={{ marginTop: '0.5rem' }}>
          Fermer sans l’utiliser
        </button>
      </SheetContent>
    </Sheet>
  );
}
