import { describe, expect, it } from 'vitest';
import { getMealAlternatives } from './mealAlternatives';
import { recipes } from './plan';

describe('MUSTAPHA meal alternatives', () => {
  it('returns another compatible recipe without the current recipe', () => {
    const alternatives = getMealAlternatives(recipes[0], recipes);
    expect(alternatives.every(recipe => recipe.id !== recipes[0].id)).toBe(true);
    expect(alternatives.length).toBeGreaterThan(0);
  });

  it('keeps alternatives compatible with the requested goal', () => {
    const alternatives = getMealAlternatives(recipes[0], recipes, 'fat-loss');
    expect(alternatives.every(recipe => recipe.compatibleGoals.includes('fat-loss'))).toBe(true);
  });
});
