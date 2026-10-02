import type { ManualLoadOverrides, ProfileId } from '../domain/types';
import { db } from './db';

export const MANUAL_LOADS_KEY = 'manualLoads';

function normalize(value: unknown): number | null {
  if (value === null || value === '') return null;
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function normalizeOverrides(value: unknown): ManualLoadOverrides {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

  const entries = Object.entries(value as Record<string, unknown>).flatMap(([exerciseId, weeks]) => {
    if (!Array.isArray(weeks)) return [];
    return [[exerciseId, weeks.slice(0, 5).map(normalize)] as const];
  });
  return Object.freeze(Object.fromEntries(entries));
}

export async function lireChargesPersonnalisees(profile: ProfileId): Promise<ManualLoadOverrides> {
  const record = await db.preferences.get([profile, MANUAL_LOADS_KEY]);
  return normalizeOverrides(record?.value);
}

export async function enregistrerChargesPersonnalisees(
  profile: ProfileId,
  overrides: ManualLoadOverrides,
): Promise<void> {
  await db.preferences.put({
    profileId: profile,
    key: MANUAL_LOADS_KEY,
    value: normalizeOverrides(overrides),
  });
}
