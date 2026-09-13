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
