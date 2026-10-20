import { MUSCLE_LABELS, type MuscleId } from '../domain/muscles';
import type { WorkoutPlan, WorkoutSession } from '../domain/types';
import { muscleVolume } from './muscleVolume';
import { type ProgressionExercice, progressionForce } from './progressionForce';
import { addDays, isCompleted, sessionActiveSeconds, sessionTimestamp, sessionVolume, startOfWeek } from './summary';

/**
 * Revue de bloc : huit semaines lues comme un seul document.
 *
 * Le suivi hebdomadaire répond au samedi ; il ne montre ni les semaines
 * oubliées, ni les zones laissées de côté, ni ce qui a réellement progressé
 * depuis le début du bloc. Tout est déjà dans les séances : ce module les
 * range par semaine, par zone et par mouvement.
 */

export interface BlockWeek {
  readonly start: string;
  readonly end: string;
  /** Repère court pour la grille : 18/08. */
  readonly label: string;
  readonly sessions: number;
  readonly volumeKg: number;
  readonly activeSeconds: number;
}

export interface BlockZone {
  readonly id: MuscleId;
  readonly label: string;
  /** Volume de chaque semaine, dans l'ordre de `weeks`. */
  readonly weeks: readonly number[];
  readonly totalKg: number;
  readonly sets: number;
}

export interface BlockRecord {
  readonly exerciseId: string;
  /** Date de la séance qui porte la charge. */
  readonly at: string;
  readonly loadKg: number;
  readonly repetitions: number;
}

export interface BlockCheckin {
  readonly sessions: number;
  readonly rpeAverage?: number;
  readonly energyAverage?: number;
  readonly painSessions: number;
}

export interface BlockTotals {
  readonly sessions: number;
  /** Semaines du bloc avec au moins une séance terminée. */
  readonly activeWeeks: number;
  readonly volumeKg: number;
  readonly activeSeconds: number;
}

export interface LaggingZone {
  readonly id: MuscleId;
  readonly label: string;
  /** Volume cumulé sur les quatre dernières semaines. */
  readonly volumeKg: number;
  /** Médiane des zones réellement travaillées sur la même période. */
  readonly medianKg: number;
  readonly ratio: number;
}

export interface BlockReview {
  readonly weeks: readonly BlockWeek[];
  readonly zones: readonly BlockZone[];
  readonly totals: BlockTotals;
  readonly records: readonly BlockRecord[];
  /** Progression de la charge de travail, mouvement par mouvement. */
  readonly progressions: readonly ProgressionExercice[];
  readonly stagnations: readonly ProgressionExercice[];
  /** Zones sous la moitié de la médiane sur les quatre dernières semaines. */
  readonly lagging: readonly LaggingZone[];
  readonly checkin: BlockCheckin;
}

const ZONES = Object.keys(MUSCLE_LABELS) as MuscleId[];

const arrondi = (value: number) => Math.round(value * 10) / 10;
const dans = (session: WorkoutSession, debut: number, fin: number) => {
  const at = sessionTimestamp(session);
  return isCompleted(session) && at >= debut && at < fin;
};

/** Lundi 00:00 des `count` semaines qui se terminent avec la semaine courante. */
export function blockWeekStarts(now: Date, count = 8): Date[] {
  const semaineCourante = startOfWeek(now);
  return Array.from({ length: count }, (_, index) => addDays(semaineCourante, (index - (count - 1)) * 7));
}

function libelleCourte(date: Date): string {
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
}

const estDouleur = (pain: string | undefined) => {
  if (!pain) return false;
  return !/^(aucune?|non|ras|rien)$/i.test(pain.trim());
};

const med = (values: readonly number[]): number | undefined => {
  if (values.length === 0) return undefined;
  const tri = [...values].sort((a, b) => a - b);
  const milieu = Math.floor(tri.length / 2);
  return tri.length % 2 === 0 ? (tri[milieu - 1] + tri[milieu]) / 2 : tri[milieu];
};

/**
 * Construit la revue sur `count` semaines, `now` servant de fin de période.
 *
 * Une séance est rattachée à la semaine de sa fin réelle (`completedAt`), pas à
 * la semaine de prescription : une séance commencée dimanche et terminée lundi
 * appartient à la semaine où l'effort a été validé.
 */
export function blockReview(
  history: readonly WorkoutSession[],
  program: WorkoutPlan,
  now: Date = new Date(),
  count = 8,
): BlockReview {
  const starts = blockWeekStarts(now, count);
  const debutBloc = starts[0].getTime();
  const finBloc = addDays(starts[starts.length - 1], 7).getTime();
  const seances = history.filter((session) => dans(session, debutBloc, finBloc));

  const weeks: BlockWeek[] = starts.map((start) => {
    const fin = addDays(start, 7);
    const dedans = seances.filter((session) => dans(session, start.getTime(), fin.getTime()));
    return {
      start: start.toISOString(),
      end: fin.toISOString(),
      label: libelleCourte(start),
      sessions: dedans.length,
      volumeKg: arrondi(dedans.reduce((total, session) => total + sessionVolume(session), 0)),
      activeSeconds: dedans.reduce((total, session) => total + sessionActiveSeconds(session), 0),
    };
  });

  // Une seule construction de l'index musculaire pour les huit fenêtres.
  const volumesSemaine = starts.map((start) => muscleVolume(seances, start, new Date(addDays(start, 7).getTime() - 1)));

  const zones: BlockZone[] = ZONES.map((id) => {
    const semaines = volumesSemaine.map((zonesDeLaSemaine) => {
      const zone = zonesDeLaSemaine.find((item) => item.id === id);
      return zone ? arrondi(zone.volumeKg) : 0;
    });
    const sets = volumesSemaine.reduce(
      (total, zonesDeLaSemaine) => total + (zonesDeLaSemaine.find((item) => item.id === id)?.sets ?? 0),
      0,
    );
    return {
      id,
      label: MUSCLE_LABELS[id],
      weeks: semaines,
      totalKg: arrondi(semaines.reduce((total, volume) => total + volume, 0)),
      sets,
    };
  }).sort((a, b) => b.totalKg - a.totalKg || a.label.localeCompare(b.label, 'fr'));

  const meilleures = new Map<string, BlockRecord>();
  for (const session of seances) {
    for (const set of session.loggedSets) {
      const loadKg = set.actualLoadKg ?? 0;
      if (!Number.isFinite(loadKg) || loadKg <= 0) continue;
      const candidate: BlockRecord = {
        exerciseId: set.exerciseId,
        at: session.completedAt ?? session.startedAt,
        loadKg,
        repetitions: set.actualRepetitions ?? set.actualDurationSeconds ?? 0,
      };
      const existant = meilleures.get(set.exerciseId);
      if (
        !existant ||
        candidate.loadKg > existant.loadKg ||
        (candidate.loadKg === existant.loadKg && candidate.repetitions > existant.repetitions)
      ) {
        meilleures.set(set.exerciseId, candidate);
      }
    }
  }
  const records = [...meilleures.values()].sort(
    (a, b) => b.loadKg - a.loadKg || b.repetitions - a.repetitions || a.exerciseId.localeCompare(b.exerciseId),
  );

  const progressions = progressionForce(seances, program);
  const stagnations = progressions.filter((item) => item.stagnation);

  const rpe = seances
    .map((session) => session.perceivedExertion)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  const energie = seances
    .map((session) => session.energy)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));

  const quatreDernieres = weeks.slice(-4);
  const volumesQuatre = zones.map((zone) => ({
    zone,
    volumeKg: arrondi(zone.weeks.slice(-quatreDernieres.length).reduce((total, volume) => total + volume, 0)),
  }));
  const positives = volumesQuatre.map((item) => item.volumeKg).filter((volume) => volume > 0);
  const mediane = positives.length >= 3 ? med(positives) : undefined;
  const lagging: LaggingZone[] =
    mediane && mediane > 0
      ? volumesQuatre
          .filter((item) => item.volumeKg > 0 && item.volumeKg < mediane / 2)
          .sort((a, b) => b.volumeKg - a.volumeKg)
          .slice(0, 2)
          .map((item) => ({
            id: item.zone.id,
            label: item.zone.label,
            volumeKg: item.volumeKg,
            medianKg: Math.round(mediane),
            ratio: item.volumeKg / mediane,
          }))
      : [];

  return {
    weeks,
    zones,
    totals: {
      sessions: seances.length,
      activeWeeks: weeks.filter((week) => week.sessions > 0).length,
      volumeKg: arrondi(seances.reduce((total, session) => total + sessionVolume(session), 0)),
      activeSeconds: seances.reduce((total, session) => total + sessionActiveSeconds(session), 0),
    },
    records,
    progressions,
    stagnations,
    lagging,
    checkin: {
      sessions: seances.length,
      rpeAverage: rpe.length > 0 ? arrondi(rpe.reduce((total, value) => total + value, 0) / rpe.length) : undefined,
      energyAverage:
        energie.length > 0 ? arrondi(energie.reduce((total, value) => total + value, 0) / energie.length) : undefined,
      painSessions: seances.filter((session) => estDouleur(session.pain)).length,
    },
  };
}
