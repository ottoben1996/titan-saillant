import type { WorkoutDay, WorkoutPlan, WorkoutSession } from '../domain/types';

/* ============================================================================
   Bilan, semaines et volumes — logique pure et testable
   ----------------------------------------------------------------------------
   Aucun calcul de semaine, de volume ou de comparaison ne vit dans le JSX :
   tout est ici, sans dépendance React, pour être vérifié par vitest.
   ========================================================================== */

const DAY_MS = 86_400_000;

/**
 * Libellé français d'un créneau.
 *
 * Le nom appartient au programme : « full-body-a » ne désigne pas la même
 * spécialité pour Ottman et pour Laura. Sans programme sous la main, on
 * retombe sur l'identifiant lisible.
 */
export function workoutDayLabel(dayId: string, program?: Pick<WorkoutPlan, 'days'>): string {
  const day = program?.days.find((item) => item.id === dayId);
  if (day) return day.name;
  return dayId.replace(/-/g, ' ');
}

/* ------------------------------------------------------------- calendrier -- */

/** Lundi 00:00 (heure locale) de la semaine contenant `date`. */
export function startOfWeek(date: Date): Date {
  const start = new Date(date.getTime());
  start.setHours(0, 0, 0, 0);
  const day = start.getDay();
  start.setDate(start.getDate() - (day === 0 ? 6 : day - 1));
  return start;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setDate(next.getDate() + days);
  return next;
}

/** Horodatage de référence : la fin de séance si elle existe, sinon le début. */
export function sessionTimestamp(session: WorkoutSession): number {
  const raw = session.completedAt ?? session.abandonedAt ?? session.startedAt;
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function isCompleted(session: WorkoutSession): boolean {
  return Boolean(session.completedAt);
}

/* ------------------------------------------------------ mesures d'une séance */

export function sessionVolume(session: WorkoutSession): number {
  return session.loggedSets.reduce((total, set) => total + (set.actualLoadKg ?? 0) * (set.actualRepetitions ?? 0), 0);
}

export function sessionSetCount(session: WorkoutSession): number {
  return session.loggedSets.length;
}

export function sessionActiveSeconds(session: WorkoutSession): number {
  return session.loggedSets.reduce((total, set) => total + (set.actualDurationSeconds ?? 0), 0);
}

export function sessionBestLoadKg(session: WorkoutSession): number {
  return session.loggedSets.reduce((max, set) => Math.max(max, set.actualLoadKg ?? 0), 0);
}

/** Durée écoulée entre le début et la fin ; 0 si la séance n'est pas terminée. */
export function sessionDurationSeconds(session: WorkoutSession): number {
  const endAt = session.completedAt ?? session.abandonedAt;
  if (!endAt) return 0;
  const elapsed = (Date.parse(endAt) - Date.parse(session.startedAt)) / 1000;
  return Number.isFinite(elapsed) && elapsed > 0 ? Math.round(elapsed) : 0;
}

export interface SessionSummary {
  dayId: string;
  durationSeconds: number;
  sets: number;
  volumeKg: number;
  bestLoadKg: number;
}

/** Résumé factuel d'une séance : durée, séries validées, volume, meilleure charge. */
export function summarizeSession(session: WorkoutSession): SessionSummary {
  return {
    dayId: session.dayId,
    durationSeconds: sessionDurationSeconds(session),
    sets: sessionSetCount(session),
    volumeKg: sessionVolume(session),
    bestLoadKg: sessionBestLoadKg(session),
  };
}

/* -------------------------------------------------------------- agrégats -- */

export interface SessionTotals {
  sessions: number;
  volumeKg: number;
  sets: number;
  activeSeconds: number;
}

const EMPTY_TOTALS: SessionTotals = { sessions: 0, volumeKg: 0, sets: 0, activeSeconds: 0 };

/** Totaux des séances terminées dont l'horodatage tombe dans [start, end[. */
export function totalsBetween(history: readonly WorkoutSession[], start: Date, end: Date): SessionTotals {
  const from = start.getTime();
  const to = end.getTime();
  return history.reduce<SessionTotals>(
    (totals, session) => {
      if (!isCompleted(session)) return totals;
      const at = sessionTimestamp(session);
      if (at < from || at >= to) return totals;
      return {
        sessions: totals.sessions + 1,
        volumeKg: totals.volumeKg + sessionVolume(session),
        sets: totals.sets + sessionSetCount(session),
        activeSeconds: totals.activeSeconds + sessionActiveSeconds(session),
      };
    },
    { ...EMPTY_TOTALS },
  );
}

/** Totaux des séances terminées de la semaine contenant `now`. */
export function totalsForWeek(history: readonly WorkoutSession[], now: Date): SessionTotals {
  const start = startOfWeek(now);
  return totalsBetween(history, start, addDays(start, 7));
}

export interface HistoryTotals {
  sessions: number;
  volumeKg: number;
  sets: number;
  activeSeconds: number;
  bestLoadKg: number;
}

/** Totaux cumulés (depuis le début) et meilleure charge absolue. */
export function historyTotals(history: readonly WorkoutSession[]): HistoryTotals {
  const completed = history.filter(isCompleted);
  return completed.reduce<HistoryTotals>(
    (totals, session) => ({
      sessions: totals.sessions + 1,
      volumeKg: totals.volumeKg + sessionVolume(session),
      sets: totals.sets + sessionSetCount(session),
      activeSeconds: totals.activeSeconds + sessionActiveSeconds(session),
      bestLoadKg: Math.max(totals.bestLoadKg, sessionBestLoadKg(session)),
    }),
    { sessions: 0, volumeKg: 0, sets: 0, activeSeconds: 0, bestLoadKg: 0 },
  );
}

/** Volume réalisé sur les `days` derniers jours (fenêtre glissante, aujourd'hui inclus). */
export function volumeLastDays(history: readonly WorkoutSession[], now: Date, days = 7): number {
  const from = now.getTime() - days * DAY_MS;
  return history
    .filter((session) => isCompleted(session) && sessionTimestamp(session) >= from)
    .reduce((total, session) => total + sessionVolume(session), 0);
}

export interface WeeklyComparison {
  weekStart: Date;
  current: SessionTotals;
  previous: SessionTotals;
  /** Écart absolu de volume (kg·rép.), positif si la semaine progresse. */
  volumeDeltaKg: number;
  /** Écart relatif en %, `null` si la semaine précédente n'a aucun volume. */
  volumeDeltaPct: number | null;
  sessionsDelta: number;
  /** Écart relatif en %, `null` si la semaine précédente n'a aucune séance. */
  sessionsDeltaPct: number | null;
}

function percentDelta(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

/** Comparaison chiffrée de la semaine en cours avec la semaine précédente. */
export function weeklyComparison(history: readonly WorkoutSession[], now: Date = new Date()): WeeklyComparison {
  const weekStart = startOfWeek(now);
  const previousStart = addDays(weekStart, -7);
  const current = totalsBetween(history, weekStart, addDays(weekStart, 7));
  const previous = totalsBetween(history, previousStart, weekStart);
  return {
    weekStart,
    current,
    previous,
    volumeDeltaKg: current.volumeKg - previous.volumeKg,
    volumeDeltaPct: percentDelta(current.volumeKg, previous.volumeKg),
    sessionsDelta: current.sessions - previous.sessions,
    sessionsDeltaPct: percentDelta(current.sessions, previous.sessions),
  };
}

/* ------------------------------------------------------ créneaux de la semaine */

export type WeekSlotState = 'done' | 'today' | 'upcoming';

export interface WeekSlot {
  day: WorkoutDay;
  state: WeekSlotState;
  /** Date de la séance terminée qui valide ce créneau cette semaine, si elle existe. */
  completedAt: string | null;
}

/**
 * Les créneaux prescrits de la semaine en cours, chacun avec un état explicite
 * calculé depuis l'historique :
 *   - `done`     : une séance terminée cette semaine porte ce créneau ;
 *   - `today`    : première séance non validée — celle qui est suggérée ;
 *   - `upcoming` : les autres créneaux, libres d'accès.
 */
export function weekSlots(
  days: readonly WorkoutDay[],
  history: readonly WorkoutSession[],
  now: Date = new Date(),
): WeekSlot[] {
  const start = startOfWeek(now);
  const end = addDays(start, 7);
  const doneByDay = new Map<string, string>();
  history.forEach((session) => {
    if (!isCompleted(session)) return;
    const at = sessionTimestamp(session);
    if (at < start.getTime() || at >= end.getTime()) return;
    const previous = doneByDay.get(session.dayId);
    if (!previous || (session.completedAt ?? '') > previous) {
      doneByDay.set(session.dayId, session.completedAt ?? '');
    }
  });

  let todayAssigned = false;
  return days.map((day) => {
    const completedAt = doneByDay.get(day.id) ?? null;
    if (completedAt) return { day, state: 'done', completedAt };
    if (!todayAssigned) {
      todayAssigned = true;
      return { day, state: 'today', completedAt: null };
    }
    return { day, state: 'upcoming', completedAt: null };
  });
}

/* --------------------------------------------------------- regroupement ---- */

export interface WeekGroup {
  key: string;
  label: string;
  start: Date;
  sessions: WorkoutSession[];
}

function weekLabel(start: Date, now: Date): string {
  if (start.getTime() === startOfWeek(now).getTime()) return 'Cette semaine';
  const formatted = start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
  return `Semaine du ${formatted}`;
}

/** Regroupe les séances par semaine, la plus récente d'abord. */
export function groupSessionsByWeek(history: readonly WorkoutSession[], now: Date = new Date()): WeekGroup[] {
  const groups = new Map<number, WeekGroup>();
  history.forEach((session) => {
    const at = new Date(sessionTimestamp(session));
    const start = startOfWeek(at);
    const key = start.getTime();
    const group = groups.get(key) ?? {
      key: `week-${key}`,
      label: weekLabel(start, now),
      start,
      sessions: [],
    };
    group.sessions.push(session);
    groups.set(key, group);
  });
  return [...groups.values()]
    .sort((a, b) => b.start.getTime() - a.start.getTime())
    .map((group) => ({
      ...group,
      sessions: [...group.sessions].sort((a, b) => sessionTimestamp(b) - sessionTimestamp(a)),
    }));
}

/* ------------------------------------------------------------- tendances --- */

export interface TrendPoint {
  label: string;
  volume: number;
  sets: number;
  sessionId: string;
}

/** Les `limit` dernières séances terminées, dans l'ordre chronologique. */
export function volumeTrendPoints(history: readonly WorkoutSession[], limit = 8): TrendPoint[] {
  return history
    .filter(isCompleted)
    .map((session) => ({ session, at: sessionTimestamp(session) }))
    .sort((a, b) => a.at - b.at)
    .slice(-limit)
    .map(({ session }) => ({
      sessionId: session.id,
      label: new Date(sessionTimestamp(session)).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
      }),
      volume: sessionVolume(session),
      sets: sessionSetCount(session),
    }));
}

export interface PersonalRecord {
  exerciseId: string;
  loadKg: number;
  repetitions: number;
}

/** Meilleure charge par mouvement, triée décroissante, limitée aux `limit` premiers. */
export function personalRecords(history: readonly WorkoutSession[], limit = 5): PersonalRecord[] {
  const best = new Map<string, PersonalRecord>();
  history
    .filter(isCompleted)
    .flatMap((session) => session.loggedSets)
    .forEach((set) => {
      const candidate: PersonalRecord = {
        exerciseId: set.exerciseId,
        loadKg: set.actualLoadKg ?? 0,
        repetitions: set.actualRepetitions ?? set.actualDurationSeconds ?? 0,
      };
      const existing = best.get(set.exerciseId);
      if (
        !existing ||
        candidate.loadKg > existing.loadKg ||
        (candidate.loadKg === existing.loadKg && candidate.repetitions > existing.repetitions)
      ) {
        best.set(set.exerciseId, candidate);
      }
    });
  return [...best.values()]
    .filter((record) => record.loadKg > 0 || record.repetitions > 0)
    .sort((a, b) => b.loadKg - a.loadKg || b.repetitions - a.repetitions)
    .slice(0, limit);
}

/* --------------------------------------------------------- fin de séance -- */

/**
 * La dernière séance terminée du même jour de programme, hors `session`
 * elle-même. C'est la référence des écarts de fin de séance : on se compare à
 * la même séance, jamais à un autre jour.
 */
export function previousSessionFor(history: readonly WorkoutSession[], session: WorkoutSession): WorkoutSession | null {
  const at = sessionTimestamp(session);
  let reference: WorkoutSession | null = null;
  let referenceAt = Number.NEGATIVE_INFINITY;
  for (const item of history) {
    if (item.id === session.id || item.dayId !== session.dayId || !isCompleted(item)) continue;
    const itemAt = sessionTimestamp(item);
    if (itemAt > at || itemAt <= referenceAt) continue;
    reference = item;
    referenceAt = itemAt;
  }
  return reference;
}

export interface BeatenRecord {
  exerciseId: string;
  loadKg: number;
  previousLoadKg: number;
  /** Écart de charge, en kilogrammes. */
  deltaKg: number;
}

/**
 * Records battus pendant la séance : pour chaque mouvement, la meilleure charge
 * de la séance strictement supérieure au record de l'historique — séance en
 * cours exclue. Un premier passage n'est pas un record battu : il faut un
 * antérieur. Trié par charge décroissante.
 */
export function beatenRecords(session: WorkoutSession, history: readonly WorkoutSession[]): BeatenRecord[] {
  const meilleuresCharges = (sets: readonly { exerciseId: string; actualLoadKg?: number }[]): Map<string, number> => {
    const best = new Map<string, number>();
    for (const set of sets) {
      const load = set.actualLoadKg ?? 0;
      if (load <= 0) continue;
      if (load > (best.get(set.exerciseId) ?? 0)) best.set(set.exerciseId, load);
    }
    return best;
  };

  const avant = meilleuresCharges(
    history.filter((item) => item.id !== session.id && isCompleted(item)).flatMap((item) => item.loggedSets),
  );
  const pendant = meilleuresCharges(session.loggedSets);

  const battus: BeatenRecord[] = [];
  for (const [exerciseId, loadKg] of pendant) {
    const previousLoadKg = avant.get(exerciseId);
    if (previousLoadKg !== undefined && loadKg > previousLoadKg) {
      battus.push({
        exerciseId,
        loadKg,
        previousLoadKg,
        deltaKg: Math.round((loadKg - previousLoadKg) * 10) / 10,
      });
    }
  }
  return battus.sort((a, b) => b.loadKg - a.loadKg || b.deltaKg - a.deltaKg);
}

/* ------------------------------------------------------------ formatage ---- */

const nbsp = '\u202F';

/** Charge en kilogrammes au format français, au plus une décimale (« 22,5 »). */
export function formatLoadKg(kg: number): string {
  if (!Number.isFinite(kg)) return '—';
  return kg.toLocaleString('fr-FR', { maximumFractionDigits: 1 });
}

export function formatVolume(kg: number): string {
  return Math.round(kg).toLocaleString('fr-FR');
}

export function formatMinutes(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '—';
  if (seconds < 60) return '< 1 min';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h${nbsp}${String(rest).padStart(2, '0')}`;
}

export function formatSignedKg(delta: number): string {
  if (!Number.isFinite(delta)) return '—';
  // Arrondi au dixième, et zéro franc. À l'entier, un écart de +2,5 s'affichait
  // « +3 » — or c'est exactement le pas d'un demi-disque, la valeur que la
  // personne vient vérifier — et −0,5 sortait en « -0 », un signe négatif sur un
  // écart nul.
  const rounded = Math.abs(delta) < 0.05 ? 0 : Math.round(delta * 10) / 10;
  const sign = rounded > 0 ? '+' : '';
  return `${sign}${rounded.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}`;
}

export function formatSignedPercent(pct: number | null): string {
  if (pct === null) return '—';
  const sign = pct > 0 ? '+' : '';
  return `${sign}${pct.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}${nbsp}%`;
}

export function formatSignedInt(delta: number): string {
  return `${delta > 0 ? '+' : ''}${delta}`;
}
