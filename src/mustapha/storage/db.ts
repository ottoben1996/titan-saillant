import Dexie, { type Table } from 'dexie';
import type { AppPreferences, BodyMetric, MealPlan, MustaphaProfile, ShoppingList, WorkoutSession } from '../domain/types';

export class MustaphaDatabase extends Dexie {
  profiles!: Table<MustaphaProfile, string>;
  sessions!: Table<WorkoutSession, string>;
  meals!: Table<MealPlan, string>;
  shopping!: Table<ShoppingList, string>;
  metrics!: Table<BodyMetric, string>;
  preferences!: Table<AppPreferences, string>;
  constructor() {
    super('mustapha-coach');
    this.version(1).stores({
      profiles: 'id, updatedAt',
      sessions: 'id, trainingDayId, week, updatedAt, completedAt',
      meals: 'id, date',
      shopping: 'id, updatedAt',
      metrics: 'id, date',
      preferences: 'id',
    });
  }
}
export const mustaphaDb = new MustaphaDatabase();
