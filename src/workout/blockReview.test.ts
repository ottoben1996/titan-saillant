import { describe, expect, it } from 'vitest';
import type { WorkoutPlan, WorkoutSession } from '../domain/types';
import { blockReview, blockWeekStarts } from './blockReview';

const local = (year: number, month: number, day: number, hours = 10) =>
  new Date(year, month - 1, day, hours).toISOString();

const programme: WorkoutPlan = {
  profileId: 'ottman',
  displayName: 'Test',
  coach: 'Test',
  warmup: [],
  days: [
    {
      id: 'full-body-a',
      name: 'Full Body A',
      subtitle: '',
      exercises: [
        { id: 'leg-press-incline', name: 'Presse à cuisses', kind: 'strength', sets: [{ repetitions: 10 }] },
        { id: 'tirage-vertical-pdf', name: 'Tirage vertical', kind: 'strength', sets: [{ repetitions: 10 }] },
      ],
      cooldown: { name: 'Tapis', durationSeconds: 300 },
    },
  ],
};

const seance = (
  id: string,
  completedAt: string,
  sets: { exerciseId: string; load: number; reps: number }[],
  over: Partial<WorkoutSession> = {},
): WorkoutSession =>
  ({
    id,
    profileId: 'ottman',
    dayId: 'full-body-a',
    startedAt: completedAt,
    updatedAt: completedAt,
    completedAt,
    currentExerciseIndex: 0,
    currentSetIndex: 0,
    loggedSets: sets.map((set, index) => ({
      exerciseId: set.exerciseId,
      setIndex: index,
      actualLoadKg: set.load,
      actualRepetitions: set.reps,
      completedAt,
    })),
    ...over,
  }) as WorkoutSession;

const lundi = (month: number, day: number) => local(2026, month, day, 10);

describe('blockWeekStarts', () => {
  it('rend huit lundis consécutifs, la semaine courante en dernier', () => {
    const semaines = blockWeekStarts(new Date(2026, 9, 20), 8);

    expect(semaines).toHaveLength(8);
    expect(semaines[0].getDay()).toBe(1);
    expect(semaines.at(-1)?.toDateString()).toBe(new Date(2026, 9, 19).toDateString());
  });
});

describe('blockReview', () => {
  const historique: WorkoutSession[] = [];
  const debut = [
    [8, 31],
    [9, 7],
    [9, 14],
    [9, 21],
    [9, 28],
    [10, 5],
    [10, 12],
  ] as const;

  debut.forEach(([month, day], index) => {
    historique.push(
      seance(`presse-${index}`, lundi(month, day), [{ exerciseId: 'leg-press-incline', load: 100, reps: 10 }], {
        perceivedExertion: index % 2 === 0 ? 7 : 8,
        energy: 3,
        pain: index === 2 ? 'genou droit' : 'aucune',
      }),
    );
  });
  // Dernière semaine du bloc : la presse encore, mais pas de tirage.
  historique.push(
    seance('presse-7', lundi(10, 19), [{ exerciseId: 'leg-press-incline', load: 110, reps: 10 }], {
      perceivedExertion: 8,
      energy: 4,
    }),
  );
  // Un tirage isolé, il y a quatre semaines : la zone existe, mais reste loin
  // derrière les jambes sur la fin du bloc.
  historique.push(
    seance('tirage-4', lundi(9, 28), [{ exerciseId: 'tirage-vertical-pdf', load: 10, reps: 10 }], {
      perceivedExertion: 6,
      energy: 2,
      pain: 'aucune',
    }),
  );

  const revue = blockReview(historique, programme, new Date(2026, 9, 20), 8);

  it('découpe le bloc en huit semaines et compte les séances réelles', () => {
    expect(revue.weeks).toHaveLength(8);
    expect(revue.weeks.map((semaine) => semaine.sessions)).toEqual([1, 1, 1, 1, 2, 1, 1, 1]);
    expect(revue.weeks[0].label).toBe('31/08');
    expect(revue.weeks.at(-1)?.label).toBe('19/10');
    expect(revue.totals.sessions).toBe(9);
    expect(revue.totals.activeWeeks).toBe(8);
    expect(revue.totals.volumeKg).toBe(8200);
  });

  it('range le volume par zone et par semaine sur les treize zones', () => {
    expect(revue.zones).toHaveLength(13);
    const quads = revue.zones.find((zone) => zone.id === 'quads');
    expect(quads?.weeks).toHaveLength(8);
    expect(quads?.totalKg).toBe(8100);
    expect(revue.zones.find((zone) => zone.id === 'lats')?.totalKg).toBe(100);
    expect(revue.zones.find((zone) => zone.id === 'calves')?.totalKg).toBe(0);
  });

  it('relève les meilleures charges, la progression et les stagnations', () => {
    expect(revue.records[0]).toMatchObject({ exerciseId: 'leg-press-incline', loadKg: 110, repetitions: 10 });
    expect(revue.records).toHaveLength(2);

    const presse = revue.progressions.find((item) => item.exerciseId === 'leg-press-incline');
    expect(presse).toMatchObject({ premier: 100, dernier: 110, ecart: 10, stagnation: false });
    expect(revue.stagnations).toEqual([]);
  });

  it('signale une zone sous la moitié de la médiane sur les quatre dernières semaines', () => {
    const lats = revue.lagging.find((zone) => zone.id === 'lats');
    expect(lats).toBeDefined();
    expect(lats?.volumeKg).toBe(100);
    expect(lats?.ratio).toBeLessThan(0.5);
  });

  it('résume le ressenti sans transformer une gêne en diagnostic', () => {
    expect(revue.checkin.sessions).toBe(9);
    expect(revue.checkin.rpeAverage).toBe(7.3);
    expect(revue.checkin.energyAverage).toBe(3);
    expect(revue.checkin.painSessions).toBe(1);
  });

  it('ignore les séances hors bloc et les séances ouvertes', () => {
    const revueVide = blockReview(
      [
        seance('avant', local(2026, 8, 20), [{ exerciseId: 'leg-press-incline', load: 100, reps: 10 }]),
        seance('ouverte', local(2026, 9, 3), [{ exerciseId: 'leg-press-incline', load: 100, reps: 10 }], {
          completedAt: undefined,
        }),
      ],
      programme,
      new Date(2026, 9, 20),
    );

    expect(revueVide.totals.sessions).toBe(0);
    expect(revueVide.zones.every((zone) => zone.totalKg === 0)).toBe(true);
    expect(revueVide.lagging).toEqual([]);
  });
});
