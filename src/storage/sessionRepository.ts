import type { ProfileId, WorkoutSession } from '../domain/types';
import { db } from './db';
import { deleteProfileMeasurements } from './measurementRepository';

export async function saveSession(session: WorkoutSession) { await db.sessions.put(session); }
export async function getActiveSession(profileId: ProfileId) {
  const active = await db.sessions.where('profileId').equals(profileId).and((s) => !s.completedAt).toArray();
  return active.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
}
export async function listSessions(profileId: ProfileId) {
  return db.sessions.where('profileId').equals(profileId).reverse().sortBy('updatedAt');
}
/**
 * Supprime définitivement une séance.
 *
 * Utilisé pour annuler une séance en cours (lancée par erreur) et pour retirer
 * une séance de l'historique : dans les deux cas, l'utilisateur a demandé la
 * disparition des données, on ne les conserve pas en « corbeille ».
 */
export async function deleteSession(sessionId: string) {
  await db.sessions.delete(sessionId);
}

export async function deleteProfileData(profileId: ProfileId) {
  await deleteProfileMeasurements(profileId);
  await db.sessions.where('profileId').equals(profileId).delete();
  await db.preferences.where('profileId').equals(profileId).delete();
}
