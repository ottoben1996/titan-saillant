/**
 * Assistant Gym Ping-Pong : calcul du différentiel de disques entre partenaires.
 * Permet à Ottman et Laura d'ajuster instantanément les manchons de la machine ou barre.
 */

import { calculatePlates, type PlateCount } from './plateCalculator';

export interface PlateDelta {
  fromTotalKg: number;
  toTotalKg: number;
  differenceKg: number;
  deltaPerSideKg: number;
  action: 'add' | 'remove' | 'keep';
  summaryLabel: string;
  platesPerSide: PlateCount[];
}

export function calculatePlateDelta(
  fromTotalKg: number,
  toTotalKg: number
): PlateDelta {
  const diff = Math.round((toTotalKg - fromTotalKg) * 100) / 100;

  if (Math.abs(diff) < 0.1) {
    return {
      fromTotalKg,
      toTotalKg,
      differenceKg: 0,
      deltaPerSideKg: 0,
      action: 'keep',
      summaryLabel: 'Même charge : aucun changement de disques.',
      platesPerSide: [],
    };
  }

  const action: 'add' | 'remove' = diff > 0 ? 'add' : 'remove';
  const absDiff = Math.abs(diff);
  const deltaPerSideKg = absDiff / 2;

  // Le delta à ajouter ou enlever par côté correspond à la moitié de la différence totale
  const breakdown = calculatePlates(absDiff, 0);

  const platesDesc = breakdown.platesPerSide
    .map((p) => `${p.count > 1 ? `${p.count}×` : ''}${p.plateKg}kg`)
    .join(' + ');

  const summaryLabel =
    action === 'add'
      ? `Ajouter ${deltaPerSideKg} kg / côté${platesDesc ? ` : ${platesDesc}` : ''}`
      : `Retirer ${deltaPerSideKg} kg / côté${platesDesc ? ` : ${platesDesc}` : ''}`;

  return {
    fromTotalKg,
    toTotalKg,
    differenceKg: diff,
    deltaPerSideKg,
    action,
    summaryLabel,
    platesPerSide: breakdown.platesPerSide,
  };
}
