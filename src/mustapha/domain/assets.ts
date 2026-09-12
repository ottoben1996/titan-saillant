import type { Recipe } from './types';

const exerciseAssetById: Record<string, string> = {
  'goblet-squat': 'goblet-squat',
  'chest-press': 'chest-press',
  row: 'row',
  plank: 'plank',
  'leg-press': 'leg-press',
  rdl: 'rdl',
  'shoulder-press': 'shoulder-press',
  'dead-bug': 'dead-bug',
  bike: 'bike',
  'mountain-climber': 'mountain-climber',
  mobility: 'mobility',
};

export function getExerciseAsset(exerciseId: string, pose: 0 | 1 = 0): string | undefined {
  const asset = exerciseAssetById[exerciseId];
  // Même règle que les illustrations de séance : le chemin suit la base du site.
  return asset ? `${import.meta.env.BASE_URL}mustapha/assets/exercises/${asset}-${pose}.jpg` : undefined;
}

export function getRecipeAsset(recipe: Pick<Recipe, 'id'>): string | undefined {
  return recipe.id === 'chicken-bowl' ? '/mustapha/assets/food/healthy-meal.jpg' : undefined;
}

export function getIngredientAsset(ingredientName: string): string | undefined {
  const slug = ingredientName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const mapped: Record<string, string> = { banane: 'banana', concombre: 'cucumber', tomate: 'tomato', riz: 'rice', 'blanc de poulet': 'chicken-breast', 'yaourt grec': 'greek-yogurt', dinde: 'turkey', houmous: 'hummus', 'flocons d avoine': 'oats', lait: 'milk' };
  const asset = mapped[slug];
  return asset ? `/mustapha/assets/ingredients/${asset}.webp` : undefined;
}
