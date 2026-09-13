import type { AppPreferences, BodyMetric, MustaphaProfile, ShoppingList, WorkoutSession } from '../domain/types';
import { mustaphaDb } from './db';

export const profileKey = 'mustapha-profile';
export async function getProfile() {
  return mustaphaDb.profiles.get('mustapha');
}
export async function saveProfile(profile: MustaphaProfile) {
  await mustaphaDb.profiles.put(profile);
  localStorage.setItem(profileKey, 'true');
}
export async function saveSession(session: WorkoutSession) {
  await mustaphaDb.sessions.put(session);
}
export async function listSessions() {
  return mustaphaDb.sessions.orderBy('updatedAt').reverse().toArray();
}
export async function getActiveSession() {
  return (await mustaphaDb.sessions.filter((s) => !s.completedAt).sortBy('updatedAt')).at(-1);
}
export async function saveShopping(list: ShoppingList) {
  await mustaphaDb.shopping.put(list);
}
export async function getShopping() {
  return mustaphaDb.shopping.get('mustapha-main');
}
export async function saveMetric(metric: BodyMetric) {
  await mustaphaDb.metrics.put(metric);
}
export async function listMetrics() {
  return mustaphaDb.metrics.orderBy('date').toArray();
}
export async function savePreferences(preferences: AppPreferences) {
  await mustaphaDb.preferences.put({ id: 'mustapha', ...preferences });
}
export async function getPreferences() {
  return mustaphaDb.preferences.get('mustapha');
}
export async function deleteAllMustaphaData() {
  await mustaphaDb.transaction('rw', mustaphaDb.tables, async () => {
    await Promise.all(mustaphaDb.tables.map((table) => table.clear()));
  });
  localStorage.removeItem(profileKey);
}
export async function exportMustaphaData() {
  const payload = {
    version: 1,
    profile: await getProfile(),
    sessions: await listSessions(),
    shopping: await getShopping(),
    metrics: await listMetrics(),
    preferences: await getPreferences(),
    exportedAt: new Date().toISOString(),
  };
  return JSON.stringify(payload, null, 2);
}
export async function importMustaphaData(json: string) {
  const parsed: unknown = JSON.parse(json);
  if (!parsed || typeof parsed !== 'object' || (parsed as { profile?: { id?: string } }).profile?.id !== 'mustapha')
    throw new Error('Sauvegarde MUSTAPHA COACH invalide');
  const payload = parsed as {
    profile: MustaphaProfile;
    sessions?: WorkoutSession[];
    shopping?: ShoppingList;
    metrics?: BodyMetric[];
    preferences?: AppPreferences;
  };
  await mustaphaDb.transaction('rw', mustaphaDb.tables, async () => {
    await Promise.all(mustaphaDb.tables.map((table) => table.clear()));
    await mustaphaDb.profiles.put(payload.profile);
    if (payload.sessions) await mustaphaDb.sessions.bulkPut(payload.sessions);
    if (payload.shopping) await mustaphaDb.shopping.put(payload.shopping);
    if (payload.metrics) await mustaphaDb.metrics.bulkPut(payload.metrics);
    if (payload.preferences) await mustaphaDb.preferences.put({ id: 'mustapha', ...payload.preferences });
  });
  localStorage.setItem(profileKey, 'true');
}
