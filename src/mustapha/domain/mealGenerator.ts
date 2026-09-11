import type { Goal, MustaphaProfile, Recipe } from './types';
import { recipes } from './plan';

const normalize = (value: string) => value.trim().toLocaleLowerCase('fr-FR');

export function getMealPlanForProfile(profile: Pick<MustaphaProfile, 'goal' | 'allergies' | 'excludedFoods'>): Recipe[] {
  const blocked = [...profile.allergies, ...profile.excludedFoods].map(normalize);
  return recipes.filter(recipe => {
    if (!recipe.compatibleGoals.includes(profile.goal as Goal)) return false;
    const haystack = [recipe.name, ...recipe.ingredients.map(ingredient => ingredient.name), ...recipe.allergens].map(normalize);
    return !blocked.some(term => term.length > 0 && haystack.some(value => value.includes(term)));
  });
}
