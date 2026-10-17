import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { measurementId, type WeeklyMeasurement } from '../domain/measurements';
import { db } from './db';
import {
  deleteMeasurement,
  deleteProfileMeasurements,
  listMeasurements,
  saveMeasurement,
  seedMeasurementsIfEmpty,
} from './measurementRepository';

const semaine = (week: number, weightKg: number): WeeklyMeasurement => ({
  id: measurementId('ottman', 1, week),
  profileId: 'ottman',
  cycle: 1,
  week,
  measuredOn: '2026-09-12T08:00:00.000Z',
  weightKg,
});

describe('dépôt des points hebdomadaires', () => {
  beforeEach(async () => {
    await db.measurements.clear();
  });

  it("reprend l'historique de la feuille de suivi une seule fois", async () => {
    const premier = await seedMeasurementsIfEmpty('ottman');
    expect(premier).toBe(2);

    const items = await listMeasurements('ottman');
    expect(items.map((item) => item.week)).toEqual([1, 2]);
    expect(items[0].weightKg).toBe(104.7);
    // La semaine 1 conserve sa valeur de tour de taille, marquée comme écartée.
    expect(items[0].excluded).toContain('waistCm');

    // Relancer la reprise ne duplique rien.
    expect(await seedMeasurementsIfEmpty('ottman')).toBe(0);
    expect(await listMeasurements('ottman')).toHaveLength(2);
  });

  it('remplace la semaine revalidée au lieu de la dupliquer', async () => {
    await saveMeasurement(semaine(1, 104.7));
    await saveMeasurement(semaine(2, 104.1));
    const corrige = { ...semaine(2, 103.5), waistCm: 116 };
    await saveMeasurement(corrige);

    const items = await listMeasurements('ottman');
    expect(items).toHaveLength(2);
    expect(items[1].weightKg).toBe(103.5);
    expect(items[1].waistCm).toBe(116);
  });

  it('supprime un point précis ou tout le suivi du profil', async () => {
    await seedMeasurementsIfEmpty('ottman');
    await seedMeasurementsIfEmpty('laura');

    await deleteMeasurement(measurementId('ottman', 1, 1));
    expect(await listMeasurements('ottman')).toHaveLength(1);

    await deleteProfileMeasurements('ottman');
    expect(await listMeasurements('ottman')).toHaveLength(0);
    // Le suivi de Laura n'est jamais touché par la suppression du profil d'Ottman.
    expect(await listMeasurements('laura')).toHaveLength(2);
  });
});
