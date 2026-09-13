import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import type { WorkoutSession } from '../domain/types';
import { exportProfileData, importProfileData } from './backup';
import { db } from './db';

afterEach(async () => {
  await db.sessions.clear();
  await db.preferences.clear();
});

const sessionOf = (
  id: string,
  profileId: 'ottman' | 'laura',
  overrides: Partial<WorkoutSession> = {},
): WorkoutSession => ({
  id,
  profileId,
  dayId: 'full-body-a',
  sequenceVersion: 2,
  currentStepIndex: 2,
  startedAt: '2026-09-05T10:00:00.000Z',
  updatedAt: '2026-09-05T11:00:00.000Z',
  completedAt: '2026-09-05T11:00:00.000Z',
  currentExerciseIndex: 0,
  currentSetIndex: 0,
  loggedSets: [
    {
      exerciseId: 'presse-cuisses-inclinee',
      setIndex: 0,
      actualRepetitions: 10,
      actualLoadKg: 110,
      completedAt: '2026-09-05T10:30:00.000Z',
    },
  ],
  ...overrides,
});

const validBackup = (profileId: 'ottman' | 'laura', sessions: WorkoutSession[], preferences: unknown[] = []) =>
  JSON.stringify({
    version: 2,
    profileId,
    exportedAt: '2026-09-08T20:00:00.000Z',
    sessions,
    preferences,
  });

describe('sauvegardes de profil — cas limites', () => {
  it('exporte puis importe à l’identique séances et préférences (aller-retour)', async () => {
    await db.sessions.bulkAdd([sessionOf('o-1', 'ottman'), sessionOf('o-2', 'ottman', { dayId: 'cardio' })]);
    await db.preferences.bulkAdd([
      { profileId: 'ottman', key: 'restMultiplier', value: 1.5 },
      { profileId: 'ottman', key: 'theme', value: 'dark' },
    ]);

    const backup = await exportProfileData('ottman');
    await db.sessions.clear();
    await db.preferences.clear();
    await importProfileData(backup, 'ottman');

    const sessions = await db.sessions.toArray();
    const preferences = await db.preferences.toArray();
    expect(sessions.map((item) => item.id).sort()).toEqual(['o-1', 'o-2']);
    expect(preferences).toHaveLength(2);
    expect(preferences.find((item) => item.key === 'restMultiplier')?.value).toBe(1.5);
    expect(preferences.find((item) => item.key === 'theme')?.value).toBe('dark');
  });

  it('ne laisse fuir aucune donnée de l’autre profil à l’export', async () => {
    await db.sessions.bulkAdd([sessionOf('o-1', 'ottman'), sessionOf('l-1', 'laura')]);
    await db.preferences.bulkAdd([
      { profileId: 'ottman', key: 'a', value: 1 },
      { profileId: 'laura', key: 'a', value: 2 },
    ]);

    const payload = JSON.parse(await exportProfileData('ottman'));
    expect(payload.version).toBe(3);
    expect(payload.profileId).toBe('ottman');
    expect(Number.isFinite(Date.parse(payload.exportedAt))).toBe(true);
    expect(payload.sessions.map((item: WorkoutSession) => item.id)).toEqual(['o-1']);
    expect(payload.preferences).toEqual([{ profileId: 'ottman', key: 'a', value: 1 }]);
  });

  it('refuse un JSON illisible', async () => {
    await expect(importProfileData('{ ceci n’est pas du JSON', 'ottman')).rejects.toThrow(/invalide/i);
    await expect(importProfileData('', 'ottman')).rejects.toThrow(/invalide/i);
  });

  it('refuse un JSON qui n’est pas un objet de sauvegarde', async () => {
    for (const json of ['42', '"texte"', 'null', 'true', '[]']) {
      await expect(importProfileData(json, 'ottman')).rejects.toThrow(/invalide/i);
    }
  });

  it('refuse une sauvegarde appartenant explicitement à l’autre profil', async () => {
    const backup = validBackup('ottman', [sessionOf('o-1', 'ottman')]);
    await expect(importProfileData(backup, 'laura')).rejects.toThrow(/autre profil/i);
    expect(await db.sessions.count()).toBe(0);
  });

  it('refuse une sauvegarde dont le tableau de séances est absent ou mal formé', async () => {
    await expect(importProfileData(JSON.stringify({ profileId: 'ottman', preferences: [] }), 'ottman')).rejects.toThrow(
      /invalide/i,
    );
    await expect(
      importProfileData(JSON.stringify({ profileId: 'ottman', sessions: 'nope', preferences: [] }), 'ottman'),
    ).rejects.toThrow(/invalide/i);
    expect(await db.sessions.count()).toBe(0);
  });

  it('refuse une séance aux champs manquants', async () => {
    const backup = JSON.stringify({
      version: 2,
      profileId: 'ottman',
      exportedAt: '2026-09-08T20:00:00.000Z',
      sessions: [{ id: 'bad', profileId: 'ottman', dayId: 'full-body-a' }],
      preferences: [],
    });
    await expect(importProfileData(backup, 'ottman')).rejects.toThrow(/invalide/i);
    expect(await db.sessions.count()).toBe(0);
  });

  it('refuse une séance dont les séries sont corrompues', async () => {
    const backup = JSON.stringify({
      version: 2,
      profileId: 'ottman',
      exportedAt: '2026-09-08T20:00:00.000Z',
      sessions: [
        {
          ...sessionOf('o-1', 'ottman'),
          loggedSets: [{ exerciseId: 'x', setIndex: 'zéro', completedAt: 'nope' }],
        },
      ],
      preferences: [],
    });
    await expect(importProfileData(backup, 'ottman')).rejects.toThrow(/invalide/i);
    expect(await db.sessions.count()).toBe(0);
  });

  it('n’écrase pas les données de l’autre profil lors d’un import', async () => {
    await db.sessions.bulkAdd([sessionOf('l-1', 'laura'), sessionOf('l-2', 'laura', { dayId: 'cardio' })]);
    await db.preferences.bulkAdd([{ profileId: 'laura', key: 'restMultiplier', value: 2 }]);

    await importProfileData(validBackup('ottman', [sessionOf('o-1', 'ottman')]), 'ottman');

    const lauraSessions = await db.sessions.where('profileId').equals('laura').toArray();
    const lauraPreferences = await db.preferences.where('profileId').equals('laura').toArray();
    const ottmanSessions = await db.sessions.where('profileId').equals('ottman').toArray();

    expect(lauraSessions.map((item) => item.id).sort()).toEqual(['l-1', 'l-2']);
    expect(lauraPreferences).toHaveLength(1);
    expect(lauraPreferences[0].value).toBe(2);
    expect(ottmanSessions.map((item) => item.id)).toEqual(['o-1']);
  });

  it('ignore les séances d’un autre profil présentes dans une sauvegarde ciblée', async () => {
    const backup = validBackup('ottman', [sessionOf('o-1', 'ottman'), sessionOf('l-1', 'laura')]);
    await importProfileData(backup, 'ottman');

    expect(await db.sessions.count()).toBe(1);
    expect((await db.sessions.toArray())[0].id).toBe('o-1');
  });

  it('filtre les préférences d’un autre profil et les entrées invalides', async () => {
    const backup = JSON.stringify({
      version: 2,
      profileId: 'ottman',
      exportedAt: '2026-09-08T20:00:00.000Z',
      sessions: [],
      preferences: [
        { profileId: 'ottman', key: 'gardee', value: 1 },
        { profileId: 'laura', key: 'autre-profil', value: 2 },
        { profileId: 'ottman', key: 42, value: 3 },
        null,
      ],
    });
    await importProfileData(backup, 'ottman');

    const preferences = await db.preferences.toArray();
    expect(preferences).toHaveLength(1);
    expect(preferences[0]).toMatchObject({ profileId: 'ottman', key: 'gardee', value: 1 });
  });

  it('est idempotent : réimporter la même sauvegarde ne duplique rien', async () => {
    const backup = validBackup('ottman', [sessionOf('o-1', 'ottman')], [{ profileId: 'ottman', key: 'k', value: 1 }]);
    await importProfileData(backup, 'ottman');
    await importProfileData(backup, 'ottman');

    expect(await db.sessions.count()).toBe(1);
    expect(await db.preferences.count()).toBe(1);
  });
});

describe('les points du samedi survivent à une sauvegarde', () => {
  it('exporte et restaure les mesures, notes du coach comprises', async () => {
    await db.measurements.clear();
    await db.measurements.put({
      id: 'ottman-c1-s3',
      profileId: 'ottman',
      cycle: 1,
      week: 3,
      measuredOn: '2026-09-12T08:00:00.000Z',
      weightKg: 103.8,
      waistCm: 116,
      coachNote: 'On garde les charges et on soigne le gainage.',
      excluded: ['chestCm'],
    });
    await db.measurements.put({
      id: 'laura-c1-s3',
      profileId: 'laura',
      cycle: 1,
      week: 3,
      weightKg: 82.4,
    });

    const sauvegarde = await exportProfileData('ottman');
    // Le défaut d'origine : les mesures ne partaient pas du tout.
    expect(sauvegarde).toContain('ottman-c1-s3');
    expect(sauvegarde).toContain('gainage');

    await db.measurements.clear();
    await importProfileData(sauvegarde, 'ottman');

    const restaurees = await db.measurements.toArray();
    expect(restaurees).toHaveLength(1);
    expect(restaurees[0].id).toBe('ottman-c1-s3');
    expect(restaurees[0].coachNote).toBe('On garde les charges et on soigne le gainage.');
    expect(restaurees[0].excluded).toEqual(['chestCm']);
  });

  it('lit encore une sauvegarde de la version précédente, sans mesures', async () => {
    const ancienne = JSON.stringify({
      version: 2,
      profileId: 'ottman',
      exportedAt: '2026-01-01T00:00:00.000Z',
      sessions: [],
      preferences: [],
    });

    await expect(importProfileData(ancienne, 'ottman')).resolves.toBeUndefined();
  });

  it('refuse une mesure incohérente en nommant le champ fautif', async () => {
    const abimee = JSON.stringify({
      version: 3,
      profileId: 'ottman',
      sessions: [],
      measurements: [{ id: 'x', profileId: 'ottman', cycle: 1, week: 'trois' }],
    });

    await expect(importProfileData(abimee, 'ottman')).rejects.toThrow(/semaine|week|invalide/i);
  });
});
