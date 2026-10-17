import { describe, expect, it } from 'vitest';
import type { LoggedSet } from '../domain/types';
import { deleteLoggedSet, editLoggedSet, getLoggedSetKey, restoreLoggedSet } from './setCorrections';

const base = (overrides: Partial<LoggedSet> = {}): LoggedSet => ({
  exerciseId: 'squat',
  setIndex: 1,
  actualRepetitions: 8,
  actualLoadKg: 60,
  completedAt: '2026-10-17T10:00:00.000Z',
  ...overrides,
});

describe('set corrections', () => {
  it('uses a stored set id and preserves it when editing', () => {
    const set = base({ setId: 'set-42' });
    expect(getLoggedSetKey(set)).toBe('set-42');
    expect(editLoggedSet([set], 'set-42', { actualLoadKg: 62.5 })).toEqual([{ ...set, actualLoadKg: 62.5 }]);
  });
  it('edits legacy sets by a collision-safe fallback key', () => {
    const first = base({ completedAt: '2026-10-17T10:00:00.000Z' });
    const second = base({ completedAt: '2026-10-17T10:01:00.000Z' });
    expect(editLoggedSet([first, second], getLoggedSetKey(second), { actualRepetitions: 10 })).toEqual([
      first,
      { ...second, actualRepetitions: 10 },
    ]);
  });
  it('deletes and restores exactly one set without shifting its identity', () => {
    const first = base({ setId: 'a' });
    const second = base({ setId: 'b', setIndex: 2 });
    const deleted = deleteLoggedSet([first, second], 'b');
    expect(deleted).toEqual({ sets: [first], deleted: second, index: 1 });
    expect(restoreLoggedSet(deleted.sets, deleted.deleted!, deleted.index)).toEqual([first, second]);
  });
  it('returns unchanged data for an unknown key', () => {
    const sets = [base({ setId: 'a' })];
    expect(editLoggedSet(sets, 'missing', { actualLoadKg: 1 })).toBe(sets);
    expect(deleteLoggedSet(sets, 'missing')).toEqual({ sets, deleted: undefined, index: -1 });
  });
});
