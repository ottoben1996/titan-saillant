import type { Goal, Recipe } from './types';

export function getMealAlternatives(current: Recipe, available: readonly Recipe[], goal?: Goal): Recipe[] {
  return available.filter(recipe => recipe.id !== current.id && (!goal || recipe.compatibleGoals.includes(goal))).slice(0, 3);
}
