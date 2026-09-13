import { z } from 'zod';
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

const profileIdSchema = z.enum(['ottman', 'laura']);
const isoDate = z.string().refine((valeur) => Number.isFinite(Date.parse(valeur)), 'date invalide');
const nombreOptionnel = z.number().finite().optional();

const loggedSetSchema = z.object({
  exerciseId: z.string().min(1),
  setIndex: z.number().int().min(0),
  completedAt: isoDate,
  actualRepetitions: z.number().optional(),
  actualLoadKg: z.number().optional(),
});

const sessionSchema = z
  .object({
    id: z.string().min(1),
    profileId: profileIdSchema,
    dayId: z.enum(['full-body-a', 'full-body-b', 'cardio']),
    startedAt: isoDate,
    updatedAt: isoDate,
    completedAt: isoDate.optional(),
    currentExerciseIndex: z.number().int().min(0),
    currentSetIndex: z.number().int().min(0),
    loggedSets: z.array(loggedSetSchema),
    perceivedExertion: z.number().min(1).max(10).optional(),
    energy: z.number().min(1).max(5).optional(),
    loadConsigne: z.enum(['increase', 'decrease', 'same']).optional(),
    notes: z.string().optional(),
    coachNote: z.string().optional(),
  })
  .passthrough();

/** Les huit zones mesurées, plus la date et les notes. */
const measurementSchema = z
  .object({
    id: z.string().min(1),
    profileId: profileIdSchema,
    cycle: z.number().int().min(1),
    week: z.number().int().min(1),
    measuredOn: isoDate.optional(),
    weightKg: nombreOptionnel,
    neckCm: nombreOptionnel,
    waistCm: nombreOptionnel,
    chestCm: nombreOptionnel,
    armRightCm: nombreOptionnel,
    armLeftCm: nombreOptionnel,
    thighRightCm: nombreOptionnel,
    thighLeftCm: nombreOptionnel,
    excluded: z.array(z.string()).optional(),
    coachNote: z.string().optional(),
  })
  .passthrough();

const preferenceSchema = z
  .object({ profileId: profileIdSchema, key: z.string().min(1), value: z.unknown() })
  .passthrough();

const payloadSchema = z.object({
  version: z.number().int().min(1),
  profileId: profileIdSchema.optional(),
  exportedAt: isoDate.optional(),
  sessions: z.array(sessionSchema),
  // Les préférences se refont en un geste : une entrée abîmée est écartée
  // plutôt que de faire refuser tout le fichier. Les séances et les mesures,
  // elles, ne se refont pas — un défaut y bloque la restauration, en le disant.
  preferences: z.array(z.unknown()).optional(),
  // Absent des sauvegardes de la version 2 : lisible, simplement vide.
  measurements: z.array(measurementSchema).optional(),
});

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

/** Message d'erreur à partir du premier champ fautif. */
function messageDeRefus(erreur: z.ZodError): string {
  const premier = erreur.issues[0];
  if (!premier) return 'Sauvegarde invalide';
  const chemin = premier.path.join(' › ');
  return chemin
    ? `Sauvegarde invalide : « ${chemin} » (${premier.message})`
    : `Sauvegarde invalide : ${premier.message}`;
}

export async function importProfileData(json: string, profileId: ProfileId): Promise<void> {
  let brut: unknown;
  try {
    brut = JSON.parse(json);
  } catch {
    throw new Error('Sauvegarde invalide : ce fichier n’est pas lisible');
  }

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
