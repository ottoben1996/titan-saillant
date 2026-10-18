import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { exportProfileData, importProfileData } from './backup';
import { payloadSchema } from './backupSchema';
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

  it('preserves timed durations and correction ids through schema parsing', () => {
    const result = payloadSchema.parse({
      version: 3,
      profileId: 'ottman',
      sessions: [
        {
          id: 'session-1',
          profileId: 'ottman',
          dayId: 'full-body-a',
          startedAt: '2026-09-05T10:00:00.000Z',
          updatedAt: '2026-09-05T10:00:00.000Z',
          currentExerciseIndex: 0,
          currentSetIndex: 0,
          loggedSets: [
            {
              exerciseId: 'plank',
              setIndex: 0,
              setId: 'set-1',
              actualDurationSeconds: 45,
              completedAt: '2026-09-05T10:30:00.000Z',
            },
          ],
        },
      ],
    });

    expect(result.sessions[0].loggedSets[0]).toMatchObject({ setId: 'set-1', actualDurationSeconds: 45 });
  });

  it('round-trips timed durations and correction ids through export and import', async () => {
    await db.sessions.put({
      id: 'session-1',
      profileId: 'ottman',
      dayId: 'full-body-a',
      startedAt: '2026-09-05T10:00:00.000Z',
      updatedAt: '2026-09-05T10:00:00.000Z',
      currentExerciseIndex: 0,
      currentSetIndex: 0,
      loggedSets: [
        {
          exerciseId: 'plank',
          setIndex: 0,
          setId: 'set-1',
          actualDurationSeconds: 45,
          completedAt: '2026-09-05T10:30:00.000Z',
        },
      ],
    });

    const backup = await exportProfileData('ottman');
    await db.sessions.clear();
    await importProfileData(backup, 'ottman');

    expect((await db.sessions.get('session-1'))?.loggedSets[0]).toMatchObject({
      setId: 'set-1',
      actualDurationSeconds: 45,
    });
  });

  it('keeps old backups valid when logged sets omit newer fields', () => {
    expect(
      payloadSchema.parse({
        version: 2,
        sessions: [
          {
            id: 'legacy-session',
            profileId: 'ottman',
            dayId: 'full-body-a',
            startedAt: '2026-09-05T10:00:00.000Z',
            updatedAt: '2026-09-05T10:00:00.000Z',
            currentExerciseIndex: 0,
            currentSetIndex: 0,
            loggedSets: [
              {
                exerciseId: 'squat',
                setIndex: 0,
                completedAt: '2026-09-05T10:30:00.000Z',
              },
            ],
          },
        ],
      }).sessions[0].loggedSets[0],
    ).not.toHaveProperty('setId');
  });

  it('rejects invalid logged set values', () => {
    const base = {
      version: 3,
      sessions: [
        {
          id: 'session-1',
          profileId: 'ottman',
          dayId: 'full-body-a',
          startedAt: '2026-09-05T10:00:00.000Z',
          updatedAt: '2026-09-05T10:00:00.000Z',
          currentExerciseIndex: 0,
          currentSetIndex: 0,
          loggedSets: [{ exerciseId: 'plank', setIndex: 0, completedAt: '2026-09-05T10:30:00.000Z' }],
        },
      ],
    };

    for (const field of ['actualDurationSeconds', 'actualRepetitions', 'actualLoadKg'] as const) {
      expect(
        payloadSchema.safeParse({
          ...base,
          sessions: [{ ...base.sessions[0], loggedSets: [{ ...base.sessions[0].loggedSets[0], [field]: -1 }] }],
        }).success,
      ).toBe(false);
      expect(
        payloadSchema.safeParse({
          ...base,
          sessions: [{ ...base.sessions[0], loggedSets: [{ ...base.sessions[0].loggedSets[0], [field]: Number.NaN }] }],
        }).success,
      ).toBe(false);
    }

    expect(
      payloadSchema.safeParse({
        ...base,
        sessions: [{ ...base.sessions[0], loggedSets: [{ ...base.sessions[0].loggedSets[0], setId: '' }] }],
      }).success,
    ).toBe(false);
  });
});
