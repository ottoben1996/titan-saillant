import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import type { WorkoutSession } from '../domain/types';
import { db } from './db';
import { deleteSession, getActiveSession, listSessions, saveSession } from './sessionRepository';

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

describe('suppression d’une séance', () => {
  beforeEach(async () => {
    await db.sessions.clear();
  });

  it('retire la séance visée et laisse les autres intactes', async () => {
    await saveSession(makeSession({ id: 'a' }));
    await saveSession(makeSession({ id: 'b', updatedAt: '2026-09-02T10:00:00.000Z' }));

    await deleteSession('a');

    const restantes = await listSessions('ottman');
    expect(restantes.map((item) => item.id)).toEqual(['b']);
  });

  it('libère la reprise : la séance supprimée n’est plus la séance en cours', async () => {
    await saveSession(makeSession({ id: 'en-cours' }));
    expect((await getActiveSession('ottman'))?.id).toBe('en-cours');

    await deleteSession('en-cours');

    expect(await getActiveSession('ottman')).toBeUndefined();
    expect(await listSessions('ottman')).toHaveLength(0);
  });

  it('ne touche pas aux séances de l’autre profil', async () => {
    await saveSession(makeSession({ id: 'ottman-1' }));
    await saveSession(makeSession({ id: 'laura-1', profileId: 'laura' }));

    await deleteSession('ottman-1');

    expect(await listSessions('ottman')).toHaveLength(0);
    expect(await listSessions('laura')).toHaveLength(1);
  });

  it('supprime aussi une séance terminée de l’historique', async () => {
    await saveSession(makeSession({ id: 'terminee', completedAt: '2026-09-01T11:00:00.000Z' }));

    await deleteSession('terminee');

    expect(await listSessions('ottman')).toHaveLength(0);
  });
});
