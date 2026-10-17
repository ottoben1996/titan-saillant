/**
 * Intégrité de la sauvegarde.
 *
 * Trois choses à figer, apprises en relisant le seul filet qui protège des mois
 * d'entraînement — il n'y a pas de serveur :
 *
 *  1. une sauvegarde contenant la QUATRIÈME séance était refusée en bloc, parce
 *     que le schéma de lecture énumérait trois créneaux sur quatre. Le défaut ne
 *     se voyait pas : il fallait une semaine complète, puis une restauration ;
 *  2. la date d'export et le rappel de sauvegarde se taisaient même quand aucun
 *     fichier n'avait été produit ;
 *  3. une sauvegarde écrite par une version plus récente entrait en silence, en
 *     perdant les champs que cette version-ci ne connaît pas.
 */
import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import type { WorkoutSession } from '../domain/types';
import { BACKUP_VERSION, exportProfileData, importProfileData, resumerSauvegarde } from './backup';
import { db } from './db';

afterEach(async () => {
  await db.sessions.clear();
  await db.preferences.clear();
  await db.measurements.clear();
});

function sessionOf(dayId: WorkoutSession['dayId'], id = 'sess-1'): WorkoutSession {
  return {
    id,
    profileId: 'ottman',
    dayId,
    sequenceVersion: 2,
    currentStepIndex: 3,
    startedAt: '2026-10-05T10:00:00.000Z',
    updatedAt: '2026-10-05T11:00:00.000Z',
    completedAt: '2026-10-05T11:00:00.000Z',
    currentExerciseIndex: 0,
    currentSetIndex: 0,
    loggedSets: [],
  };
}

describe('sauvegarde et restauration', () => {
  it('restaure une sauvegarde contenant la quatrième séance', async () => {
    // Le cas qui échouait : « Rameur + marche » est une des quatre séances
    // prévues, donc présente au moins une fois par cycle.
    await db.sessions.put(sessionOf('cardio-4'));

    const fichier = await exportProfileData('ottman');
    await db.sessions.clear();
    expect(await db.sessions.count()).toBe(0);

    await importProfileData(fichier, 'ottman');

    const relues = await db.sessions.toArray();
    expect(relues).toHaveLength(1);
    expect(relues[0].dayId).toBe('cardio-4');
  });

  it('accepte les quatre créneaux du programme', async () => {
    for (const [index, dayId] of (['full-body-a', 'full-body-b', 'cardio', 'cardio-4'] as const).entries()) {
      await db.sessions.put(sessionOf(dayId, `sess-${index}`));
    }

    const fichier = await exportProfileData('ottman');
    await db.sessions.clear();

    await expect(importProfileData(fichier, 'ottman')).resolves.toBeUndefined();
    expect(await db.sessions.count()).toBe(4);
  });

  it('résume un fichier sans rien écrire', async () => {
    await db.sessions.put(sessionOf('cardio-4'));

    const resume = await resumerSauvegarde(await exportProfileData('ottman'), 'ottman');

    expect(resume.sessions).toBe(1);
    expect(resume.version).toBe(BACKUP_VERSION);
    expect(resume.exportedAt).toBeDefined();
    // Rien n'a été appliqué : c'est tout l'intérêt de lire avant d'écrire.
    expect(await db.sessions.count()).toBe(1);
  });

  it('refuse une sauvegarde écrite par une version plus récente', async () => {
    // Sans plafond, elle entrait en perdant en silence les champs inconnus.
    const futur = JSON.stringify({
      version: BACKUP_VERSION + 1,
      profileId: 'ottman',
      exportedAt: '2026-10-05T11:00:00.000Z',
      sessions: [],
      preferences: [],
      measurements: [],
    });

    await expect(importProfileData(futur, 'ottman')).rejects.toThrow(/plus récente/);
    await expect(resumerSauvegarde(futur, 'ottman')).rejects.toThrow(/plus récente/);
  });

  it('refuse un fichier qui n’est pas lisible', async () => {
    await expect(resumerSauvegarde('pas du json', 'ottman')).rejects.toThrow(/pas lisible/);
  });

  it('refuse le fichier d’un autre profil', async () => {
    const autre = JSON.stringify({
      version: BACKUP_VERSION,
      profileId: 'laura',
      exportedAt: '2026-10-05T11:00:00.000Z',
      sessions: [],
      preferences: [],
      measurements: [],
    });

    await expect(importProfileData(autre, 'ottman')).rejects.toThrow(/autre profil/);
  });
});
