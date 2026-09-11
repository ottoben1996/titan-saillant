import { describe, expect, it } from 'vitest';
import { getTrainingDays, getSessionLabel } from './domain/programGenerator';
import { getMealPlanForProfile } from './domain/mealGenerator';
import { getCoachMessage } from './domain/coachTone';

const base = { goal: 'recomposition' as const, allergies: [], excludedFoods: [], availableDays: [] };

describe('MUSTAPHA personalization', () => {
  it('builds the requested number of sessions from two to six', () => {
    for (const count of [2, 3, 4, 5, 6] as const) {
      const days = getTrainingDays({ ...base, weeklySessions: count });
      expect(days).toHaveLength(count);
      expect(new Set(days.map(day => day.id)).size).toBe(count);
      expect(getSessionLabel({ weeklySessions: count })).toContain(`${count} séances`);
    }
  });

  it('ignores available-day preferences when generating the volume', () => {
    expect(getTrainingDays({ ...base, availableDays: ['Samedi'], weeklySessions: 4 })).toHaveLength(4);
  });

  it('generates sessions according to the selected split', () => {
    expect(getTrainingDays({ ...base, split: 'full-body', weeklySessions: 3 }).map(day => day.name)).toEqual(['Full body A', 'Full body B', 'Full body C']);
    expect(getTrainingDays({ ...base, split: 'ppl', weeklySessions: 3 }).map(day => day.name)).toEqual(['Push', 'Pull', 'Legs']);
    expect(getTrainingDays({ ...base, split: 'upper-lower', weeklySessions: 4 }).map(day => day.name)).toEqual(['Upper A', 'Lower A', 'Upper B', 'Lower B']);
  });

  it('filters meals containing an allergy or excluded food', () => {
    const meals = getMealPlanForProfile({ ...base, allergies: ['lait'] });
    expect(meals.every(meal => !meal.allergens.includes('lait'))).toBe(true);
  });

  it('supports a safe fictional directive mode', () => {
    expect(getCoachMessage('dictator-rp', 'before-session', 'Mustapha')).toMatch(/salle|soldat/i);
    expect(getCoachMessage(undefined, 'welcome', 'Mustapha')).toContain('Mustapha');
  });
});
