import type { WeeklyMeasurement } from '../domain/measurements';
import type { ProfileId, WorkoutSession } from '../domain/types';
import type { PreferenceRecord } from './db';
import { db } from './db';
import { listMeasurements } from './measurementRepository';
import { listSessions } from './sessionRepository';

/**
 * Sauvegarde et restauration des données d'un profil.
 *
 * Défaut trouvé à la relecture : la sauvegarde ne transportait que les séances
 * et les préférences. Les points du samedi — mois de mesures, notes du coach,
 * tout le suivi dans la durée — n'étaient ni exportés ni restaurés. Le rappel de
 * sauvegarde protégeait donc ce qui se refait en une séance, pas ce qui ne se
 * refait pas.
 *
 * La validation est désormais décrite plutôt qu'improvisée : un fichier abîmé
 * est refusé avec le champ fautif, au lieu d'entrer à moitié dans la base.
 * Les sauvegardes de la version précédente restent lisibles.
 */
const BACKUP_VERSION = 3;

/**
 * Forme écrite par l'export. Le schéma de lecture décrit les mêmes données,
 * vues de l'extérieur : il valide l'essentiel et laisse passer le reste, donc
 * les deux ne se superposent pas exactement, et c'est voulu.
 */
interface BackupPayload {
  version: number;
  profileId: ProfileId;
  exportedAt: string;
  sessions: WorkoutSession[];
  preferences: PreferenceRecord[];
  measurements: WeeklyMeasurement[];
}

export async function exportProfileData(profileId: ProfileId): Promise<string> {
  const [sessions, preferences, measurements] = await Promise.all([
    listSessions(profileId),
    db.preferences.where('profileId').equals(profileId).toArray(),
    listMeasurements(profileId),
  ]);
  const payload: BackupPayload = {
    version: BACKUP_VERSION,
    profileId,
    exportedAt: new Date().toISOString(),
    sessions,
    preferences,
    measurements,
  };
  return JSON.stringify(payload, null, 2);
}

export async function importProfileData(json: string, profileId: ProfileId): Promise<void> {
  let brut: unknown;
  try {
    brut = JSON.parse(json);
  } catch {
    throw new Error('Sauvegarde invalide : ce fichier n’est pas lisible');
  }

  // Chargé ici et pas au démarrage : valider un fichier sert une fois par
  // restauration, alors que ces schémas pèseraient sur chaque ouverture.
  const { messageDeRefus, payloadSchema, preferenceSchema } = await import('./backupSchema');

  const lecture = payloadSchema.safeParse(brut);
  if (!lecture.success) throw new Error(messageDeRefus(lecture.error));

  const payload = lecture.data;
  if (payload.profileId !== undefined && payload.profileId !== profileId) {
    throw new Error('Cette sauvegarde appartient à un autre profil');
  }

  const sessions = payload.sessions.filter((session) => session.profileId === profileId);
  const preferences = (payload.preferences ?? [])
    .map((entree) => preferenceSchema.safeParse(entree))
    .flatMap((lecture) => (lecture.success && lecture.data.profileId === profileId ? [lecture.data] : []));
  const measurements = (payload.measurements ?? []).filter((mesure) => mesure.profileId === profileId);

  // Le schéma a vérifié l'essentiel et laissé passer les champs qu'il ne connaît
  // pas : les données entrent donc telles quelles, sans être reconstruites.
  await db.transaction('rw', db.sessions, db.preferences, db.measurements, async () => {
    for (const session of sessions) await db.sessions.put(session as WorkoutSession);
    for (const preference of preferences) await db.preferences.put(preference as PreferenceRecord);
    for (const mesure of measurements) await db.measurements.put(mesure as WeeklyMeasurement);
  });
}
