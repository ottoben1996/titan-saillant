import { MUSCLE_LABELS, type MuscleId, muscleIds } from '../domain/muscles';
import { tutorials } from '../domain/tutorials';
import type { WorkoutSession } from '../domain/types';
import { isCompleted, sessionTimestamp } from './summary';

/** Pondération par rôle : le muscle moteur compte pour un, le synergiste pour un demi. */
const POIDS_PRIMAIRE = 1;
const POIDS_SECONDAIRE = 0.5;

export interface ExerciseMuscles {
  readonly primary: readonly MuscleId[];
  readonly secondary: readonly MuscleId[];
}

export interface ZoneVolume {
  readonly id: MuscleId;
  readonly label: string;
  /** Charge × répétitions pondérée par rôle, cumulée sur la période. */
  readonly volumeKg: number;
  /** Séries qui ont touché la zone. */
  readonly sets: number;
}

/**
 * Zones par mouvement, construites sur le catalogue de fiches avec la même
 * cascade de repli que la fiche d'exercice : muscles détaillés s'ils existent,
 * sinon la liste générale. Un mouvement inconnu n'attribue rien.
 */
export function exerciseMuscleIndex(
  catalogue: Readonly<
    Record<
      string,
      { primaryMuscles?: readonly string[]; secondaryMuscles?: readonly string[]; muscles?: readonly string[] }
    >
  > = tutorials,
): Map<string, ExerciseMuscles> {
  const index = new Map<string, ExerciseMuscles>();
  for (const [exerciseId, fiche] of Object.entries(catalogue)) {
    const primary = muscleIds(fiche.primaryMuscles ?? fiche.muscles ?? []);
    const secondary = muscleIds(fiche.secondaryMuscles ?? []).filter((id) => !primary.includes(id));
    if (primary.length > 0 || secondary.length > 0) index.set(exerciseId, { primary, secondary });
  }
  return index;
}

const INDEX_MUSCLES = exerciseMuscleIndex();

/**
 * Volume par zone musculaire sur une période : chaque série validée porte sa
 * charge × répétitions vers ses muscles — plein tarif pour un moteur, moitié
 * pour un synergiste. Les séries sans charge (gainage tenu, cardio) ne comptent
 * pas : cette carte parle de volume soulevé, pas de temps sous tension.
 */
export function muscleVolume(
  sessions: readonly WorkoutSession[],
  since: Date,
  now: Date = new Date(),
  index: ReadonlyMap<string, ExerciseMuscles> = INDEX_MUSCLES,
): ZoneVolume[] {
  const debut = since.getTime();
  const fin = now.getTime();
  const parZone = new Map<MuscleId, { volumeKg: number; sets: number }>();

  const ajoute = (id: MuscleId, volume: number) => {
    const zone = parZone.get(id) ?? { volumeKg: 0, sets: 0 };
    zone.volumeKg += volume;
    zone.sets += 1;
    parZone.set(id, zone);
  };

  for (const session of sessions) {
    const at = sessionTimestamp(session);
    if (!isCompleted(session) || at < debut || at > fin) continue;
    for (const set of session.loggedSets) {
      const zones = index.get(set.exerciseId);
      if (!zones) continue;
      const volume = (set.actualLoadKg ?? 0) * (set.actualRepetitions ?? 0);
      if (volume <= 0) continue;
      for (const id of zones.primary) ajoute(id, volume * POIDS_PRIMAIRE);
      for (const id of zones.secondary) ajoute(id, volume * POIDS_SECONDAIRE);
    }
  }

  return [...parZone.entries()]
    .map(([id, zone]) => ({
      id,
      label: MUSCLE_LABELS[id],
      volumeKg: Math.round(zone.volumeKg * 10) / 10,
      sets: zone.sets,
    }))
    .filter((zone) => zone.volumeKg > 0)
    .sort((a, b) => b.volumeKg - a.volumeKg || a.id.localeCompare(b.id));
}

/**
 * Niveaux de 0 à 1 pour la carte : chaque zone rapportée à la plus travaillée.
 * C'est un rapport de forme, pas une valeur — l'échelle reste lisible même
 * quand les charges montent.
 */
export function zoneIntensities(zones: readonly ZoneVolume[]): Partial<Record<MuscleId, number>> {
  const max = zones.reduce((top, zone) => Math.max(top, zone.volumeKg), 0);
  if (max <= 0) return {};
  const intensites: Partial<Record<MuscleId, number>> = {};
  for (const zone of zones) intensites[zone.id] = zone.volumeKg / max;
  return intensites;
}
