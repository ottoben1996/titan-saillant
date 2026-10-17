import type { ManualDurationOverrides, ProfileId } from '../domain/types';
import { db } from './db';

export const MANUAL_DURATIONS_KEY = 'manualDurations';

function normalize(value: unknown): number | null {
  if (value === null || value === '') return null;
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function normalizeOverrides(value: unknown): ManualDurationOverrides {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const entries = Object.entries(value as Record<string, unknown>).flatMap(([exerciseId, weeks]) => {
    if (!Array.isArray(weeks)) return [];
    return [[exerciseId, weeks.slice(0, 8).map(normalize)] as const];
  });
  return Object.freeze(Object.fromEntries(entries));
}

export async function lireDureesPersonnalisees(profile: ProfileId): Promise<ManualDurationOverrides> {
  const record = await db.preferences.get([profile, MANUAL_DURATIONS_KEY]);
  return normalizeOverrides(record?.value);
}

export async function enregistrerDureesPersonnalisees(
  profile: ProfileId,
  overrides: ManualDurationOverrides,
): Promise<void> {
  await db.preferences.put({
    profileId: profile,
    key: MANUAL_DURATIONS_KEY,
    value: normalizeOverrides(overrides),
  });
}
