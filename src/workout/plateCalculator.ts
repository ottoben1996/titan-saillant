/**
 * Calculateur de disques par côté pour barre et machines à disques (Presse, Smith Machine).
 */

export interface PlateCount {
  plateKg: number;
  count: number;
}

export interface PlateBreakdown {
  totalWeightKg: number;
  weightPerSideKg: number;
  platesPerSide: PlateCount[];
  remainderKg: number;
}

export const AVAILABLE_PLATES = [20, 10, 5, 2.5, 1.25] as const;

/**
 * Mouvements où l'on enfile réellement des disques.
 *
 * Le calculateur s'affichait dès que la charge atteignait 20 kg, donc sur les
 * machines à pile — leg curl, leg extension, tirage horizontal et vertical,
 * développé couché machine — où le calcul n'a aucun sens : on y règle une
 * goupille au kilo, et l'application annonçait « il manque 0,5 kg » pour une
 * charge impossible à poser. Une personne a cherché où mettre les disques sur un
 * appareil à goupille. La règle est donc explicite, et courte.
 */
const MOUVEMENTS_A_DISQUES: readonly string[] = ['presse-cuisses-inclinee', 'squat-smith'];

/** Le calcul par côté n'a de sens que là où il y a une barre ou un chariot à charger. */
export function seChargeEnDisques(exerciseId: string | undefined): boolean {
  return exerciseId !== undefined && MOUVEMENTS_A_DISQUES.includes(exerciseId);
}

/**
 * Calcule la combinaison optimale de disques par côté pour atteindre la charge cible.
 *
 * @param totalWeightKg Charge totale à charger
 * @param barWeightKg Poids de la barre à vide (0 par défaut pour les presses, 10-20kg pour barre libre)
 */
export function calculatePlates(
  totalWeightKg: number,
  barWeightKg = 0,
  availablePlates: readonly number[] = AVAILABLE_PLATES,
): PlateBreakdown {
  if (totalWeightKg <= 0) {
    return {
      totalWeightKg: 0,
      weightPerSideKg: 0,
      platesPerSide: [],
      remainderKg: 0,
    };
  }

  const weightToDistribute = Math.max(0, totalWeightKg - barWeightKg);
  const weightPerSide = weightToDistribute / 2;

  let remaining = weightPerSide;
  const platesPerSide: PlateCount[] = [];

  // Tri décroissant pour utiliser les plus gros disques en premier
  const sortedPlates = [...availablePlates].sort((a, b) => b - a);

  for (const plate of sortedPlates) {
    if (remaining >= plate) {
      const count = Math.floor(remaining / plate);
      platesPerSide.push({ plateKg: plate, count });
      remaining = Math.round((remaining - count * plate) * 100) / 100;
    }
  }

  return {
    totalWeightKg,
    weightPerSideKg: weightPerSide,
    platesPerSide,
    remainderKg: remaining,
  };
}
