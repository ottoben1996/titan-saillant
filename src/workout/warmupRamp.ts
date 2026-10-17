/**
 * Générateur de montée en gamme (Warm-up Ramp-up)
 * Calcule les paliers d'échauffement spécifique optimaux avant une série lourde
 * sans accumuler de fatigue neuromusculaire.
 */

export interface WarmupStep {
  stepIndex: number;
  percentage: number;
  loadKg: number;
  repetitions: number;
  restSeconds: number;
  purpose: string;
}

export function roundToNearestIncrement(val: number, increment = 2.5): number {
  if (val <= 0) return 0;
  return Math.round(val / increment) * increment;
}

export function generateWarmupRamp(workingLoadKg: number, exerciseId?: string, baseBarKg = 0): WarmupStep[] {
  if (!workingLoadKg || workingLoadKg < 30) {
    return [];
  }

  const isLegPress = exerciseId?.includes('presse');
  const increment = isLegPress ? 5 : 2.5;

  // Si barre libre ou smith, la barre à vide est le minimum absolu
  const minLoad = baseBarKg > 0 ? baseBarKg : 20;

  // Palier 1 : 50% de la charge de travail x 8 réps (afflux sanguin & mobilité)
  const load1 = Math.max(minLoad, roundToNearestIncrement(workingLoadKg * 0.5, increment));

  // Palier 2 : 75% de la charge de travail x 4 réps (calibration biomécanique)
  const load2 = Math.max(load1 + increment, roundToNearestIncrement(workingLoadKg * 0.75, increment));

  // Palier 3 : 90% de la charge de travail x 2 réps (amorce nerveuse / potentiation)
  const load3 = Math.max(load2 + increment, roundToNearestIncrement(workingLoadKg * 0.9, increment));

  const steps: WarmupStep[] = [
    {
      stepIndex: 1,
      percentage: 50,
      loadKg: load1,
      repetitions: 8,
      restSeconds: 60,
      purpose: 'Afflux sanguin & mise en route articulaire',
    },
    {
      stepIndex: 2,
      percentage: 75,
      loadKg: load2,
      repetitions: 4,
      restSeconds: 75,
      purpose: 'Recrutement des unités motrices',
    },
  ];

  // Le 3e palier n'est pertinent que si la charge de travail est suffisamment lourde (>= 60kg)
  if (workingLoadKg >= 60 && load3 < workingLoadKg) {
    steps.push({
      stepIndex: 3,
      percentage: 90,
      loadKg: load3,
      repetitions: 2,
      restSeconds: 90,
      purpose: 'Activation nerveuse (sans fatigue métabolique)',
    });
  }

  return steps;
}
