import { db } from './db';
import { starterMeasurements, type WeeklyMeasurement } from '../domain/measurements';
import type { ProfileId } from '../domain/types';

/** Points hebdomadaires d'un profil, du plus ancien au plus récent. */
export async function listMeasurements(profileId: ProfileId) {
  const items = await db.measurements.where('profileId').equals(profileId).toArray();
  return items.sort((a, b) => (a.cycle === b.cycle ? a.week - b.week : a.cycle - b.cycle));
}

export async function getMeasurement(profileId: ProfileId, cycle: number, week: number) {
  return db.measurements.get(`${profileId}-c${cycle}-s${week}`);
}

/** Un point par semaine : revalider la même semaine remplace la valeur. */
export async function saveMeasurement(measurement: WeeklyMeasurement) {
  await db.measurements.put(measurement);
}

export async function deleteMeasurement(id: string) {
  await db.measurements.delete(id);
}

export async function deleteProfileMeasurements(profileId: ProfileId) {
  await db.measurements.where('profileId').equals(profileId).delete();
}

/**
 * Reprend l'historique de la feuille de suivi, une seule fois par profil.
 *
 * Sans date inventée : les semaines reprises gardent leur numéro, le bilan les
 * affiche ainsi. Les courbes démarrent donc avec deux vraies semaines plutôt
 * qu'avec du vide.
 */
export async function seedMeasurementsIfEmpty(profileId: ProfileId) {
  const existing = await db.measurements.where('profileId').equals(profileId).count();
  if (existing > 0) return 0;
  const starter = starterMeasurements.filter((measurement) => measurement.profileId === profileId);
  if (starter.length === 0) return 0;
  await db.measurements.bulkPut(starter.map((measurement) => ({ ...measurement })));
  return starter.length;
}
