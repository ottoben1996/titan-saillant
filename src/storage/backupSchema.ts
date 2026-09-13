import { z } from 'zod';

/**
 * Schémas de lecture d'une sauvegarde.
 *
 * Séparés du reste de la sauvegarde à dessein : valider un fichier importé sert
 * une fois par restauration, alors que ce module chargerait treize kilo-octets
 * dans le paquet initial de tout le monde. Il est donc chargé à la demande, au
 * moment où quelqu'un importe réellement un fichier.
 */
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

export const preferenceSchema = z
  .object({ profileId: profileIdSchema, key: z.string().min(1), value: z.unknown() })
  .passthrough();

export const payloadSchema = z.object({
  version: z.number().int().min(1),
  profileId: profileIdSchema.optional(),
  exportedAt: isoDate.optional(),
  // Les séances et les mesures ne se refont pas : un défaut y bloque la
  // restauration, en le disant. Les préférences, elles, se refont en un geste.
  sessions: z.array(sessionSchema),
  preferences: z.array(z.unknown()).optional(),
  // Absent des sauvegardes de la version 2 : lisible, simplement vide.
  measurements: z.array(measurementSchema).optional(),
});

/** Message d'erreur à partir du premier champ fautif. */
export function messageDeRefus(erreur: z.ZodError): string {
  const premier = erreur.issues[0];
  if (!premier) return 'Sauvegarde invalide';
  const chemin = premier.path.join(' › ');
  return chemin
    ? `Sauvegarde invalide : « ${chemin} » (${premier.message})`
    : `Sauvegarde invalide : ${premier.message}`;
}
