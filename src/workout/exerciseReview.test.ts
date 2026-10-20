import { describe, expect, it } from 'vitest';
import type { ExercisePrescription, WorkoutSession } from '../domain/types';
import { estimatedOneRepMax, exerciseReview } from './exerciseReview';

const local = (year: number, month: number, day: number, hours = 10, minutes = 0) =>
  new Date(year, month - 1, day, hours, minutes).toISOString();

const session = (over: Partial<WorkoutSession> = {}): WorkoutSession =>
  ({
    id: 's1',
    profileId: 'ottman',
    dayId: 'full-body-a',
    startedAt: local(2026, 9, 8, 9),
    updatedAt: local(2026, 9, 8, 10),
    completedAt: local(2026, 9, 8, 10),
    currentExerciseIndex: 0,
    currentSetIndex: 0,
    loggedSets: [],
    ...over,
  }) as WorkoutSession;

const charge = (load: number, reps: number, setIndex = 0, exerciseId = 'presse') => ({
  exerciseId,
  setIndex,
  actualLoadKg: load,
  actualRepetitions: reps,
  completedAt: local(2026, 9, 8, 9, 30),
});

const presse: ExercisePrescription = {
  id: 'presse',
  name: 'Presse',
  kind: 'strength',
  sets: [
    { repetitions: 10, loadKg: 60, phase: 'working' },
    { repetitions: 10, loadKg: 60, phase: 'working' },
    { repetitions: 10, loadKg: 60, phase: 'working' },
  ],
};

const presseAvecEchauffement: ExercisePrescription = {
  ...presse,
  sets: [
    { repetitions: 10, loadKg: 20, phase: 'warmup' },
    { repetitions: 10, loadKg: 60, phase: 'working' },
    { repetitions: 10, loadKg: 60, phase: 'working' },
  ],
};

describe('estimatedOneRepMax', () => {
  it('applique Epley au-delà d’une répétition et rend la charge brute à une répétition', () => {
    expect(estimatedOneRepMax(100, 5)).toBe(116.7);
    expect(estimatedOneRepMax(100, 1)).toBe(100);
    expect(estimatedOneRepMax(62.5, 8)).toBe(79.2);
  });

  it('refuse les valeurs absentes ou nulles', () => {
    expect(estimatedOneRepMax(0, 10)).toBe(0);
    expect(estimatedOneRepMax(100, 0)).toBe(0);
    expect(estimatedOneRepMax(Number.NaN, 10)).toBe(0);
  });
});

describe('exerciseReview', () => {
  it('écarte les séries d’échauffement et retient la meilleure charge du passage', () => {
    const review = exerciseReview(
      [session({ loggedSets: [charge(20, 10, 0), charge(60, 8, 1), charge(60, 10, 2)] })],
      'presse',
      presseAvecEchauffement,
    );

    expect(review.passages).toHaveLength(1);
    expect(review.passages[0]).toMatchObject({
      bestLoadKg: 60,
      bestRepetitions: 10,
      volumeKg: 1080,
      sets: 2,
      estimatedOneRepMaxKg: 80,
    });
    expect(review.bestLoadKg).toBe(60);
    expect(review.totalSets).toBe(2);
    expect(review.totalVolumeKg).toBe(1080);
  });

  it('ordonne les passages, calcule l’écart et repère trois charges identiques', () => {
    const review = exerciseReview(
      [
        session({ id: 'd', completedAt: local(2026, 9, 22), loggedSets: [charge(70, 8), charge(70, 8, 1)] }),
        session({ id: 'a', completedAt: local(2026, 9, 8), loggedSets: [charge(60, 10)] }),
        session({ id: 'c', completedAt: local(2026, 9, 18), loggedSets: [charge(70, 8)] }),
        session({ id: 'b', completedAt: local(2026, 9, 15), loggedSets: [charge(70, 8)] }),
      ],
      'presse',
      presse,
    );

    expect(review.passages.map((passage) => passage.sessionId)).toEqual(['a', 'b', 'c', 'd']);
    expect(review.firstLoadKg).toBe(60);
    expect(review.lastLoadKg).toBe(70);
    expect(review.deltaKg).toBe(10);
    expect(review.stagnates).toBe(true);
  });

  it('ne retient que les séances terminées et les séries chargées du bon mouvement', () => {
    const review = exerciseReview(
      [
        session({ id: 'ouverte', completedAt: undefined, loggedSets: [charge(80, 5)] }),
        session({ id: 'autre', loggedSets: [charge(90, 5, 1, 'autre-mouvement')] }),
        session({ id: 'poids-du-corps', loggedSets: [charge(0, 12)] }),
        session({ id: 'bonne', loggedSets: [charge(50, 12)] }),
      ],
      'presse',
      presse,
    );

    expect(review.passages.map((passage) => passage.sessionId)).toEqual(['bonne']);
  });

  it('garde tous les agrégats quand la courbe est limitée', () => {
    const history = Array.from({ length: 15 }, (_, index) =>
      session({
        id: `s${index}`,
        completedAt: local(2026, 9, 1 + index),
        loggedSets: [charge(50 + index, 10)],
      }),
    );

    const review = exerciseReview(history, 'presse', presse, 5);

    expect(review.passages).toHaveLength(5);
    expect(review.passages[0].bestLoadKg).toBe(60);
    expect(review.passages.at(-1)?.bestLoadKg).toBe(64);
    expect(review.bestLoadKg).toBe(64);
    expect(review.totalSets).toBe(15);
  });

  it('rend une fiche vide sans série chargée', () => {
    const review = exerciseReview([session({ loggedSets: [charge(0, 12)] })], 'presse', presse);

    expect(review.passages).toEqual([]);
    expect(review.bestLoadKg).toBeUndefined();
    expect(review.deltaKg).toBeUndefined();
    expect(review.stagnates).toBe(false);
  });
});
