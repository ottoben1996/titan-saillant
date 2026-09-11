import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import type { WorkoutSession } from '../domain/types';
import { db } from './db';
import { deleteProfileData, getActiveSession, listSessions, saveSession } from './sessionRepository';

const makeSession = (over: Partial<WorkoutSession> & { id: string }): WorkoutSession => ({
  profileId: 'ottman',
  dayId: 'full-body-a',
  startedAt: '2026-09-01T10:00:00.000Z',
  updatedAt: '2026-09-01T10:00:00.000Z',
  currentExerciseIndex: 0,
  currentSetIndex: 0,
  loggedSets: [],
  ...over,
});

describe('dépôt des séances', () => {
  beforeEach(async () => {
    await db.sessions.clear();
  });

  it('enregistre puis relit les séances d’un profil, plus récentes en premier', async () => {
    await saveSession(makeSession({ id: 'a', updatedAt: '2026-09-01T10:00:00.000Z' }));
    await saveSession(makeSession({ id: 'b', updatedAt: '2026-09-05T10:00:00.000Z' }));

    const list = await listSessions('ottman');
    expect(list.map((item) => item.id)).toEqual(['b', 'a']);
  });

  it('ne retient comme séance active que la dernière non terminée', async () => {
    await saveSession(makeSession({ id: 'terminee', completedAt: '2026-09-02T10:00:00.000Z', updatedAt: '2026-09-09T10:00:00.000Z' }));
    await saveSession(makeSession({ id: 'ancienne-active', updatedAt: '2026-09-03T10:00:00.000Z' }));
    await saveSession(makeSession({ id: 'active-recente', updatedAt: '2026-09-08T10:00:00.000Z' }));

    const active = await getActiveSession('ottman');
    expect(active?.id).toBe('active-recente');
  });

  it('ne renvoie aucune séance active quand toutes sont terminées', async () => {
    await saveSession(makeSession({ id: 'seule', completedAt: '2026-09-02T10:00:00.000Z' }));
    await expect(getActiveSession('ottman')).resolves.toBeUndefined();
  });

  it('sépare strictement les données des deux profils', async () => {
    await saveSession(makeSession({ id: 'ottman-1' }));
    await saveSession(makeSession({ id: 'laura-1', profileId: 'laura' }));

    await deleteProfileData('ottman');

    await expect(listSessions('ottman')).resolves.toEqual([]);
    await expect(listSessions('laura')).resolves.toHaveLength(1);
  });
});
