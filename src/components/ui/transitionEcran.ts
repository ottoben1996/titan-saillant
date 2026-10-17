import { useState } from 'react';
import type { Screen } from '../layout/BottomNav';

/**
 * Sens du passage d'un écran à l'autre.
 *
 * iOS ne traite pas tous les changements d'écran de la même façon : changer
 * d'onglet commute net, sans glissement ; entrer dans un écran le fait venir de
 * la droite ; en sortir le fait repartir vers la droite. Trois gestes, trois
 * significations. Une maquette antérieure faisait glisser les onglets aussi —
 * c'était une erreur, et c'est en lisant ce fichier qu'on s'en aperçoit.
 */
export type Sens = 'pousse' | 'revient' | 'onglet';

/**
 * Profondeur de navigation.
 *
 * Zéro : les quatre onglets, entre lesquels on ne va pas « plus loin ».
 * Un : un écran qu'on ouvre depuis un onglet. Deux : un écran qu'on ouvre
 * depuis un écran ouvert — le bilan, qui se lit depuis le point du samedi.
 */
const PROFONDEUR: Record<Screen, number> = {
  home: 0,
  history: 0,
  progression: 0,
  settings: 0,
  loads: 0,
  workout: 1,
  followup: 1,
  bilan: 2,
};

export function sensDuChangement(avant: Screen, apres: Screen): Sens {
  if (PROFONDEUR[apres] > PROFONDEUR[avant]) return 'pousse';
  if (PROFONDEUR[apres] < PROFONDEUR[avant]) return 'revient';
  return 'onglet';
}

/**
 * Sens à appliquer au rendu courant.
 *
 * L'état est ajusté pendant le rendu, pas dans un effet : un effet laisserait
 * passer une image avec l'ancien sens, et l'écran arriverait d'abord au mauvais
 * endroit avant de sauter. React traite ce cas — poser l'état pendant le rendu
 * provoque un rendu immédiat, sans commit intermédiaire.
 */
export function useSensEcran(screen: Screen): Sens {
  const [etat, setEtat] = useState<{ ecran: Screen; sens: Sens }>({ ecran: screen, sens: 'onglet' });

  if (etat.ecran !== screen) {
    setEtat({ ecran: screen, sens: sensDuChangement(etat.ecran, screen) });
  }

  return etat.sens;
}
