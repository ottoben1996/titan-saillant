import { describe, expect, it } from 'vitest';
import type { ExercisePrescription, LoggedSet, SetPrescription, WorkoutSession } from '../domain/types';
import { computeProgressiveOverload } from './progressionEngine';

const working = (loadKg: number, repetitions = 10): SetPrescription => ({ repetitions, loadKg, phase: 'working' });

/** Exercice sans série d'échauffement prescrite (3 × 10 @ 110 kg). */
const exercise3x10: ExercisePrescription = {
  id: 'presse-cuisses-inclinee',
  name: 'Presse à cuisse inclinée',
  kind: 'strength',
  sets: [working(110), working(110), working(110)],
};

/** Même exercice, mais avec deux séries d'échauffement prescrites (cas réel du programme). */
const exerciseWithWarmup: ExercisePrescription = {
  id: 'presse-cuisses-inclinee',
  name: 'Presse à cuisse inclinée',
  kind: 'strength',
  sets: [
    { repetitions: 10, loadKg: 50, phase: 'warmup' },
    { repetitions: 10, loadKg: 80, phase: 'warmup' },
    working(110),
    working(110),
    working(110),
  ],
};

const logged = (sets: Array<[number, number]>, repetitions = 10): LoggedSet[] =>
  sets.map(([setIndex, actualLoadKg]) => ({
    exerciseId: 'presse-cuisses-inclinee',
    setIndex,
    actualRepetitions: repetitions,
    actualLoadKg,
    completedAt: '2026-09-08T11:00:00.000Z',
  }));

const session = (
  id: string,
  completedAt: string | undefined,
  loggedSets: LoggedSet[],
  overrides: Partial<WorkoutSession> = {},
): WorkoutSession => ({
  id,
  profileId: 'ottman',
  dayId: 'full-body-a',
  sequenceVersion: 2,
  startedAt: '2026-09-08T10:00:00.000Z',
  updatedAt: completedAt ?? '2026-09-08T10:30:00.000Z',
  completedAt,
  currentExerciseIndex: 0,
  currentSetIndex: 0,
  loggedSets,
  ...overrides,
});

const threeSets = (load = 110, repetitions = 10) => logged([[0, load], [1, load], [2, load]], repetitions);

describe('computeProgressiveOverload — cas limites', () => {
  it('ne suggère rien sans historique', () => {
    expect(computeProgressiveOverload(exercise3x10, [])).toBeNull();
  });

  it('suggère une hausse sur une séance unique entièrement validée, RPE non renseigné', () => {
    const result = computeProgressiveOverload(exercise3x10, [
      session('s1', '2026-09-08T11:00:00.000Z', threeSets()),
    ]);
    expect(result).toMatchObject({ prescribedLoadKg: 110, suggestedLoadKg: 115, incrementKg: 5 });
  });

  it('ne suggère rien si une douleur a été signalée', () => {
    expect(computeProgressiveOverload(exercise3x10, [
      session('s1', '2026-09-08T11:00:00.000Z', threeSets(), { perceivedExertion: 6, pain: 'Douleur' }),
    ])).toBeNull();
  });

  it('ne suggère rien si le RPE est élevé (>= 8)', () => {
    expect(computeProgressiveOverload(exercise3x10, [
      session('s1', '2026-09-08T11:00:00.000Z', threeSets(), { perceivedExertion: 8 }),
    ])).toBeNull();
    expect(computeProgressiveOverload(exercise3x10, [
      session('s1', '2026-09-08T11:00:00.000Z', threeSets(), { perceivedExertion: 9 }),
    ])).toBeNull();
  });

  it('ne suggère rien si les répétitions cibles ne sont pas atteintes', () => {
    expect(computeProgressiveOverload(exercise3x10, [
      session('s1', '2026-09-08T11:00:00.000Z', threeSets(110, 9)),
    ])).toBeNull();
  });

  it('ne suggère rien si la charge prescrite n’a pas été atteinte', () => {
    expect(computeProgressiveOverload(exercise3x10, [
      session('s1', '2026-09-08T11:00:00.000Z', threeSets(100)),
    ])).toBeNull();
  });

  it('ne suggère rien si toutes les séries de travail ne sont pas enregistrées', () => {
    expect(computeProgressiveOverload(exercise3x10, [
      session('s1', '2026-09-08T11:00:00.000Z', logged([[0, 110], [1, 110]])),
    ])).toBeNull();
  });

  it('ne suggère rien pour un exercice sans série de travail', () => {
    const warmupOnly: ExercisePrescription = {
      ...exercise3x10,
      sets: [{ repetitions: 10, loadKg: 50, phase: 'warmup' }],
    };
    expect(computeProgressiveOverload(warmupOnly, [
      session('s1', '2026-09-08T11:00:00.000Z', threeSets()),
    ])).toBeNull();
  });

  it('ne suggère rien sans charge ou répétitions prescrites', () => {
    const withoutLoad: ExercisePrescription = {
      ...exercise3x10,
      sets: [{ repetitions: 10, phase: 'working' }, { repetitions: 10, phase: 'working' }, { repetitions: 10, phase: 'working' }],
    };
    const withoutReps: ExercisePrescription = {
      ...exercise3x10,
      sets: [{ loadKg: 110, phase: 'working' }, { loadKg: 110, phase: 'working' }, { loadKg: 110, phase: 'working' }],
    };
    expect(computeProgressiveOverload(withoutLoad, [
      session('s1', '2026-09-08T11:00:00.000Z', threeSets()),
    ])).toBeNull();
    expect(computeProgressiveOverload(withoutReps, [
      session('s1', '2026-09-08T11:00:00.000Z', threeSets()),
    ])).toBeNull();
  });

  it('ignore une séance non terminée et retombe sur la dernière séance complète', () => {
    const enCours = session('s2', undefined, logged([[0, 110], [1, 110], [2, 110]]), { perceivedExertion: 10 });
    const terminee = session('s1', '2026-09-08T11:00:00.000Z', threeSets(), { perceivedExertion: 6 });
    expect(computeProgressiveOverload(exercise3x10, [enCours, terminee])?.suggestedLoadKg).toBe(115);
  });

  // --- Défauts de comportement : ces cas documentent des régressions de production ---

  it('suggère une hausse même quand des séries d’échauffement sont enregistrées (cas réel presse/squat)', () => {
    // Séance réelle : l'utilisateur valide toutes les séries, y compris les 2 séries
    // d'échauffement prescrites (50 kg puis 80 kg), avant les 3 séries de travail à 110 kg.
    const realLoggedSets = logged([[0, 50], [1, 80], [2, 110], [3, 110], [4, 110]]);
    const result = computeProgressiveOverload(exerciseWithWarmup, [
      session('s1', '2026-09-08T11:00:00.000Z', realLoggedSets, { perceivedExertion: 6, pain: 'Aucune' }),
    ]);
    expect(result).not.toBeNull();
    expect(result?.suggestedLoadKg).toBe(115);
  });

  it('ne se base QUE sur la dernière séance contenant l’exercice (pas de rattrapage sur une plus ancienne)', () => {
    // La dernière séance avec l'exercice a été très dure (RPE 9) : aucune progression
    // ne doit être suggérée, même si une séance plus ancienne était facile.
    const ancienneFacile = session('s1', '2026-09-01T11:00:00.000Z', threeSets(), { perceivedExertion: 5 });
    const recenteDure = session('s2', '2026-09-08T11:00:00.000Z', threeSets(), { perceivedExertion: 9 });
    expect(computeProgressiveOverload(exercise3x10, [ancienneFacile, recenteDure])).toBeNull();
  });

  it('ne se base QUE sur la dernière séance après une baisse de performance', () => {
    const ancienneFacile = session('s1', '2026-09-01T11:00:00.000Z', threeSets(), { perceivedExertion: 5 });
    const recenteEnBaisse = session('s2', '2026-09-08T11:00:00.000Z', threeSets(110, 6), { perceivedExertion: 6 });
    expect(computeProgressiveOverload(exercise3x10, [ancienneFacile, recenteEnBaisse])).toBeNull();
  });
});
