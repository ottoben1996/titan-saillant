import type { ProfileId, WorkoutSession } from '../domain/types';
import { db } from './db';

export async function saveSession(session: WorkoutSession) { await db.sessions.put(session); }
export async function getActiveSession(profileId: ProfileId) {
  const active = await db.sessions.where('profileId').equals(profileId).and((s) => !s.completedAt).toArray();
  return active.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
}
export async function listSessions(profileId: ProfileId) {
  return db.sessions.where('profileId').equals(profileId).reverse().sortBy('updatedAt');
}
export async function deleteProfileData(profileId: ProfileId) {
  await db.sessions.where('profileId').equals(profileId).delete();
  await db.preferences.where('profileId').equals(profileId).delete();
}
