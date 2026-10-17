import type { WorkoutSession } from '../domain/types';

export type CoachingRecommendation = 'increase' | 'maintain' | 'reduce';

export interface AdaptiveAdvice {
  recommendation: CoachingRecommendation;
  title: string;
  message: string;
  safety: boolean;
}

/** Retourne le conseil basé sur le dernier bilan complet, sans modifier la prescription PDF. */
export function getAdaptiveAdvice(history: readonly WorkoutSession[]): AdaptiveAdvice | null {
  const latest = [...history]
    .filter((session) => Boolean(session.completedAt))
    .sort((a, b) => (b.completedAt ?? b.updatedAt).localeCompare(a.completedAt ?? a.updatedAt))[0];
  if (!latest) return null;

  const pain = latest.pain?.trim().toLowerCase();
  if (pain && pain !== 'aucune') {
    return {
      recommendation: 'reduce',
      title: 'Priorité à la sécurité',
      message:
        'Une gêne ou une douleur a été signalée. Garde la charge ou réduis-la, et arrête l’exercice si la douleur est vive ou inhabituelle.',
      safety: true,
    };
  }

  const rpe = latest.perceivedExertion;
  const energy = latest.energy;
  if (rpe !== undefined && rpe >= 9) {
    return {
      recommendation: 'reduce',
      title: 'Allège la prochaine séance',
      message:
        'L’effort était très élevé. Maintiens la technique et réduis légèrement la charge ou le volume au prochain passage.',
      safety: false,
    };
  }
  if (rpe !== undefined && rpe <= 6 && (energy === undefined || energy >= 4)) {
    return {
      recommendation: 'increase',
      title: 'Tu peux progresser',
      message:
        'La séance semble bien maîtrisée. Si la technique reste propre, augmente très progressivement la charge lors de la prochaine séance.',
      safety: false,
    };
  }
  return {
    recommendation: 'maintain',
    title: 'Reste sur cette base',
    message: 'Conserve la charge actuelle et cherche des répétitions régulières et contrôlées avant de progresser.',
    safety: false,
  };
}
