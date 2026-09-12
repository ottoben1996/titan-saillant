import Dexie, { type Table } from 'dexie';
import type { ProfileId, WorkoutSession } from '../domain/types';
import type { WeeklyMeasurement } from '../domain/measurements';

export interface PreferenceRecord { profileId: ProfileId; key: string; value: unknown }

export class CoachDatabase extends Dexie {
  sessions!: Table<WorkoutSession, string>;
  preferences!: Table<PreferenceRecord, [ProfileId, string]>;
  measurements!: Table<WeeklyMeasurement, string>;
  constructor() {
    super('coach-ottman-laura');
    this.version(1).stores({
      sessions: 'id, profileId, dayId, updatedAt, completedAt',
      preferences: '[profileId+key], profileId',
    });
    // Suivi hebdomadaire. Dexie conserve les tables de la version précédente :
    // seule la nouvelle table est déclarée ici.
    this.version(2).stores({
      measurements: 'id, profileId, cycle, week',
    });
  }
}

export const db = new CoachDatabase();
