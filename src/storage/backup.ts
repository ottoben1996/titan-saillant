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
 * La validation est décrite plutôt qu'improvisée : un fichier abîmé est refusé
 * avec le champ fautif, au lieu d'entrer à moitié dans la base. Les sauvegardes
 * de la version précédente restent lisibles.
 *
 * Deuxième relecture, plus tard : une sauvegarde contenant la quatrième séance
 * était refusée en bloc, parce que le schéma de lecture énumérait trois créneaux
 * sur quatre. Le filet ne protégeait donc plus rien dès la première semaine
 * complète. Le défaut est corrigé à la source (liste dérivée du domaine) et un
 * test d'aller-retour le tient.
 */
export const BACKUP_VERSION = 3;

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

/**
 * Ce que contient un fichier, sans rien y appliquer.
 *
 * L'import est une fusion par identifiant : il peut donc **rajeunir** des séances
 * et des mesures déjà présentes, et il faut pouvoir l'annoncer avant d'écrire
 * quoi que ce soit. Un fichier mal daté écrasait sinon des données plus récentes
 * sans un mot.
 */
export interface ResumeSauvegarde {
  version: number;
  exportedAt?: string;
  sessions: number;
  measurements: number;
}

// Chargé à la demande : valider un fichier sert une fois par restauration, alors
// que ces schémas pèseraient sur chaque ouverture de l'application.
async function lireEtVerifier(json: string, profileId: ProfileId) {
  let brut: unknown;
  try {
    brut = JSON.parse(json);
  } catch {
    throw new Error('Sauvegarde invalide : ce fichier n’est pas lisible');
  }

  const { messageDeRefus, payloadSchema, preferenceSchema } = await import('./backupSchema');

  const lecture = payloadSchema.safeParse(brut);
  if (!lecture.success) throw new Error(messageDeRefus(lecture.error));

  const payload = lecture.data;
  if (payload.profileId !== undefined && payload.profileId !== profileId) {
    throw new Error('Cette sauvegarde appartient à un autre profil');
  }
  // Sans plafond, une sauvegarde écrite par une version PLUS RÉCENTE entrait
  // quand même, en perdant en silence les champs que cette version-ci ne connaît
  // pas. On refuse en le disant — le geste correct est de mettre l'application à
  // jour d'abord.
  if (payload.version > BACKUP_VERSION) {
    throw new Error(
      `Sauvegarde écrite par une version plus récente (v${payload.version}) : mets l’application à jour avant de la restaurer`,
    );
  }

  return { payload, preferenceSchema };
}

export async function resumerSauvegarde(json: string, profileId: ProfileId): Promise<ResumeSauvegarde> {
  const { payload } = await lireEtVerifier(json, profileId);
  return {
    version: payload.version,
    exportedAt: payload.exportedAt,
    sessions: payload.sessions.filter((session) => session.profileId === profileId).length,
    measurements: (payload.measurements ?? []).filter((mesure) => mesure.profileId === profileId).length,
  };
}

export async function importProfileData(json: string, profileId: ProfileId): Promise<void> {
  const { payload, preferenceSchema } = await lireEtVerifier(json, profileId);

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
