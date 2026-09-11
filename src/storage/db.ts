import Dexie, { type Table } from 'dexie';
import type { ProfileId, WorkoutSession } from '../domain/types';

export interface PreferenceRecord { profileId: ProfileId; key: string; value: unknown }

export class CoachDatabase extends Dexie {
  sessions!: Table<WorkoutSession, string>;
  preferences!: Table<PreferenceRecord, [ProfileId, string]>;
  constructor() {
    super('coach-ottman-laura');
    this.version(1).stores({
      sessions: 'id, profileId, dayId, updatedAt, completedAt',
      preferences: '[profileId+key], profileId',
    });
  }
}

export const db = new CoachDatabase();
