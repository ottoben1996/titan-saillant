import type { LoggedSet } from '../domain/types';

export type LoggedSetCorrection = Partial<
  Pick<LoggedSet, 'actualRepetitions' | 'actualDurationSeconds' | 'actualLoadKg'>
>;

/** Stable identity for new records, with a deterministic legacy fallback. */
export function getLoggedSetKey(set: LoggedSet, index?: number): string {
  if (set.setId) return set.setId;
  if (index !== undefined) return `legacy:${index}`;
  return `${set.exerciseId}:${set.setIndex}:${set.completedAt}`;
}

function findLoggedSetIndex(sets: readonly LoggedSet[], key: string): number {
  const legacyIndex = key.startsWith('legacy:') ? Number(key.slice('legacy:'.length)) : -1;
  if (Number.isInteger(legacyIndex) && legacyIndex >= 0 && legacyIndex < sets.length && !sets[legacyIndex].setId) {
    return legacyIndex;
  }
  return sets.findIndex((set) => getLoggedSetKey(set) === key);
}

export function editLoggedSet(sets: readonly LoggedSet[], key: string, correction: LoggedSetCorrection): LoggedSet[] {
  const index = findLoggedSetIndex(sets, key);
  if (index < 0) return sets as LoggedSet[];
  return sets.map((set, i) => (i === index ? { ...set, ...correction } : set));
}

export function deleteLoggedSet(
  sets: readonly LoggedSet[],
  key: string,
): { sets: LoggedSet[]; deleted?: LoggedSet; index: number } {
  const index = findLoggedSetIndex(sets, key);
  if (index < 0) return { sets: sets as LoggedSet[], index: -1 };
  return { sets: sets.filter((_, i) => i !== index), deleted: sets[index], index };
}

export function restoreLoggedSet(sets: readonly LoggedSet[], deleted: LoggedSet, index: number): LoggedSet[] {
  const next = [...sets];
  next.splice(Math.max(0, Math.min(index, next.length)), 0, deleted);
  return next;
}
