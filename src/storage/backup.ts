import type { ProfileId, WorkoutSession } from '../domain/types';
import { db } from './db';
import { listSessions } from './sessionRepository';

const BACKUP_VERSION = 2;

interface BackupPayload {
  version: number;
  profileId: ProfileId;
  exportedAt: string;
  sessions: WorkoutSession[];
  preferences: Array<{ profileId: ProfileId; key: string; value: unknown }>;
}

const isProfileId = (value: unknown): value is ProfileId => value === 'ottman' || value === 'laura';
const isIsoDate = (value: unknown) => typeof value === 'string' && Number.isFinite(Date.parse(value));

function isValidSession(value: unknown): value is WorkoutSession {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<WorkoutSession>;
  return (
    typeof candidate.id === 'string' &&
    isProfileId(candidate.profileId) &&
    (candidate.dayId === 'full-body-a' || candidate.dayId === 'full-body-b' || candidate.dayId === 'cardio') &&
    isIsoDate(candidate.startedAt) &&
    isIsoDate(candidate.updatedAt) &&
    Array.isArray(candidate.loggedSets) &&
    candidate.loggedSets.every(
      (set) =>
        Boolean(set) &&
        typeof set.exerciseId === 'string' &&
        Number.isInteger(set.setIndex) &&
        isIsoDate(set.completedAt),
    )
  );
}

export async function exportProfileData(profileId: ProfileId) {
  const sessions = await listSessions(profileId);
  const preferences = await db.preferences.where('profileId').equals(profileId).toArray();
  const payload: BackupPayload = {
    version: BACKUP_VERSION,
    profileId,
    exportedAt: new Date().toISOString(),
    sessions,
    preferences,
  };
  return JSON.stringify(payload, null, 2);
}

export async function importProfileData(json: string, profileId: ProfileId) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('Sauvegarde invalide');
  }
  if (!parsed || typeof parsed !== 'object') throw new Error('Sauvegarde invalide');
  const candidate = parsed as Partial<BackupPayload>;
  if (candidate.profileId !== undefined && candidate.profileId !== profileId) {
    throw new Error('Cette sauvegarde appartient à un autre profil');
  }
  if (!Array.isArray(candidate.sessions) || !candidate.sessions.every(isValidSession)) {
    throw new Error('Sauvegarde invalide');
  }
  const sessions = candidate.sessions.filter((session) => session.profileId === profileId);
  const preferences = Array.isArray(candidate.preferences)
    ? candidate.preferences.filter(
        (preference) => preference?.profileId === profileId && typeof preference.key === 'string',
      )
    : [];
  await db.transaction('rw', db.sessions, db.preferences, async () => {
    for (const session of sessions) {
      await db.sessions.put(session);
    }
    for (const preference of preferences) await db.preferences.put(preference);
  });
}
