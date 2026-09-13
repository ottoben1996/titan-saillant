import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { exportProfileData, importProfileData } from './backup';
import { db } from './db';

afterEach(async () => {
  await db.sessions.clear();
  await db.preferences.clear();
});

describe('profile backup', () => {
  it('exports and imports only the matching profile data', async () => {
    await db.sessions.bulkAdd([
      {
        id: 'o-1',
        profileId: 'ottman',
        dayId: 'full-body-a',
        startedAt: '2026-09-05T10:00:00.000Z',
        updatedAt: '2026-09-05T10:00:00.000Z',
        currentExerciseIndex: 0,
        currentSetIndex: 0,
        loggedSets: [],
      },
      {
        id: 'l-1',
        profileId: 'laura',
        dayId: 'cardio',
        startedAt: '2026-09-05T10:00:00.000Z',
        updatedAt: '2026-09-05T10:00:00.000Z',
        currentExerciseIndex: 0,
        currentSetIndex: 0,
        loggedSets: [],
      },
    ]);

    const backup = await exportProfileData('ottman');
    await db.sessions.clear();
    await importProfileData(backup, 'ottman');

    expect(await db.sessions.count()).toBe(1);
    expect((await db.sessions.toArray())[0].profileId).toBe('ottman');
  });

  it('rejects a backup explicitly belonging to the other profile', async () => {
    await expect(
      importProfileData(
        JSON.stringify({
          version: 2,
          profileId: 'ottman',
          exportedAt: '2026-09-08T20:00:00.000Z',
          sessions: [],
          preferences: [],
        }),
        'laura',
      ),
    ).rejects.toThrow(/autre profil/i);
  });

  it('rejects malformed sessions instead of writing corrupt data', async () => {
    await expect(
      importProfileData(
        JSON.stringify({
          version: 2,
          profileId: 'ottman',
          exportedAt: '2026-09-08T20:00:00.000Z',
          sessions: [{ id: 'bad', profileId: 'ottman' }],
          preferences: [],
        }),
        'ottman',
      ),
    ).rejects.toThrow(/invalide/i);
    expect(await db.sessions.count()).toBe(0);
  });
});
