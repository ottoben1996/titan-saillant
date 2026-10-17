import { ArrowRight, Barbell, Clock } from '../ui/Icons';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../ui/Sheet';

/**
 * « Je ne peux pas faire cet exercice » — les trois issues, au même endroit.
 *
 * Avant, elles étaient trois pastilles voisines dans la rangée d'actions :
 * « Machine indisponible ? », « Machine occupée · plus tard » et « Passer cet
 * exercice ». À 390 px elles se rangeaient en escalier sur trois lignes (92 /
 * 182 / 213 / 162 px, 144 px consommés) et, surtout, deux gestes voisins
 * menaient à deux résultats opposés — décaler l'exercice ou l'abandonner.
 *
 * Ici chaque issue dit sa conséquence, et elles ne sont plus côte à côte avec le
 * pouce qui navigue : on ouvre, on lit, on choisit.
 */
interface ImpossibleSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exerciseName: string;
  /** Faux quand ce mouvement n'a pas d'alternative documentée : l'option disparaît. */
  alternativeDisponible: boolean;
  onDefer: () => void;
  onAlternative: () => void;
  onSkip: () => void;
}

export function ImpossibleSheet({
  open,
  onOpenChange,
  exerciseName,
  alternativeDisponible,
  onDefer,
  onAlternative,
  onSkip,
}: ImpossibleSheetProps) {
  // La feuille se referme toujours avant d'agir : l'action change d'écran, et
  // laisser une feuille ouverte par-dessus le nouvel état ferait douter du geste.
  const choisir = (action: () => void) => () => {
    onOpenChange(false);
    action();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="impossible-sheet">
        <SheetHeader>
          <p className="eyebrow">CE QUI SE PASSE</p>
          <SheetTitle>Je ne peux pas faire cet exercice</SheetTitle>
          <SheetDescription>{exerciseName} · choisis ce qui t’arrive, la séance s’adapte toute seule.</SheetDescription>
        </SheetHeader>

        <div className="impossible-choices">
          <button type="button" className="impossible-choice" onClick={choisir(onDefer)}>
            <Clock size={20} />
            <span>
              <strong>La machine est prise</strong>
              <small>Tu la retrouves après les autres mouvements, séries intactes.</small>
            </span>
          </button>

          {alternativeDisponible && (
            <button type="button" className="impossible-choice" onClick={choisir(onAlternative)}>
              <Barbell size={20} />
              <span>
                <strong>La machine est indisponible</strong>
                <small>Un autre mouvement pour le même travail, à la place.</small>
              </span>
            </button>
          )}

          <button type="button" className="impossible-choice" onClick={choisir(onSkip)}>
            <ArrowRight size={20} />
            <span>
              <strong>Je passe pour aujourd’hui</strong>
              <small>Les séries restantes ne comptent pas dans la séance.</small>
            </span>
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
