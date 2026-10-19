/**
 * Volume par zone musculaire.
 *
 * Le calcul attribue chaque série validée à ses muscles : plein tarif pour un
 * moteur, moitié pour un synergiste. Ces tests figent la pondération, la
 * fenêtre de dates et la couverture du catalogue — un mouvement programmé avec
 * des charges qui n'aurait pas ses zones disparaîtrait silencieusement du
 * bilan.
 */
import { describe, expect, it } from 'vitest';
import { getProgram, PROGRAM_WEEKS } from '../domain/programs';
import type { ExercisePrescription, WorkoutSession } from '../domain/types';
import { type ExerciseMuscles, exerciseMuscleIndex, muscleVolume, zoneIntensities } from './muscleVolume';

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

const charge = (exerciseId: string, load: number, reps: number) => ({
  exerciseId,
  setIndex: 0,
  actualLoadKg: load,
  actualRepetitions: reps,
  completedAt: local(2026, 9, 8, 9, 30),
});

/** Un catalogue réduit : la pondération se teste sans dépendre des vraies fiches. */
const reperes: ReadonlyMap<string, ExerciseMuscles> = new Map([
  ['presse', { primary: ['quads', 'glutes'], secondary: ['hamstrings'] }],
  ['rowing', { primary: ['lats'], secondary: ['biceps'] }],
]);

const depuis = new Date(local(2026, 9, 1));
const jusqua = new Date(local(2026, 9, 9));

describe('muscleVolume', () => {
  it('compte plein tarif pour un moteur et moitié pour un synergiste', () => {
    const zones = muscleVolume([session({ loggedSets: [charge('presse', 100, 10)] })], depuis, jusqua, reperes);

    expect(zones).toEqual([
      { id: 'glutes', label: 'Fessiers', volumeKg: 1000, sets: 1 },
      { id: 'quads', label: 'Quadriceps', volumeKg: 1000, sets: 1 },
      { id: 'hamstrings', label: 'Ischio-jambiers', volumeKg: 500, sets: 1 },
    ]);
  });

  it('cumule sur plusieurs séances et compte les séries par zone', () => {
    const zones = muscleVolume(
      [
        session({ id: 'a', loggedSets: [charge('rowing', 50, 10), charge('rowing', 50, 8)] }),
        session({ id: 'b', completedAt: local(2026, 9, 5), loggedSets: [charge('rowing', 60, 10)] }),
      ],
      depuis,
      jusqua,
      reperes,
    );

    expect(zones[0]).toEqual({ id: 'lats', label: 'Grands dorsaux', volumeKg: 1500, sets: 3 });
    expect(zones[1]).toEqual({ id: 'biceps', label: 'Biceps', volumeKg: 750, sets: 3 });
  });

  it('ignore les séances hors fenêtre, ouvertes, et les mouvements inconnus', () => {
    const zones = muscleVolume(
      [
        session({ id: 'vieux', completedAt: local(2026, 8, 30), loggedSets: [charge('presse', 100, 10)] }),
        session({ id: 'cours', completedAt: undefined, loggedSets: [charge('presse', 100, 10)] }),
        session({ id: 'inconnu', loggedSets: [charge('mouvement-hors-catalogue', 100, 10)] }),
        session({ id: 'sans-charge', loggedSets: [charge('presse', 0, 12)] }),
      ],
      depuis,
      jusqua,
      reperes,
    );

    expect(zones).toEqual([]);
  });
});

describe('zoneIntensities', () => {
  it('rapporte chaque zone à la plus travaillée', () => {
    const intensites = zoneIntensities([
      { id: 'lats', label: 'Grands dorsaux', volumeKg: 2000, sets: 4 },
      { id: 'biceps', label: 'Biceps', volumeKg: 500, sets: 2 },
    ]);

    expect(intensites).toEqual({ lats: 1, biceps: 0.25 });
  });

  it('rend une carte vide sans volume', () => {
    expect(zoneIntensities([])).toEqual({});
  });
});

describe('couverture du catalogue', () => {
  /** Un mouvement « porteur » : au moins une série prescrite avec charge. */
  const porteDesCharges = (exercice: ExercisePrescription): boolean =>
    exercice.sets.some((set) => (set.loadKg ?? 0) > 0) ||
    (exercice.weeklyLoadKg ?? []).some((charge) => charge > 0) ||
    (exercice.weeklySetLoadsKg ?? []).some((semaine) => semaine.some((charge) => charge > 0));

  it('chaque mouvement programmé avec charges a ses zones musculaires', () => {
    const index = exerciseMuscleIndex();
    const manquants = new Set<string>();
    for (const profile of ['ottman', 'laura'] as const) {
      for (let week = 1; week <= PROGRAM_WEEKS; week += 1) {
        const program = getProgram(profile, week);
        for (const day of program.days) {
          for (const exercice of [...(day.warmup ?? []), ...day.exercises]) {
            if (porteDesCharges(exercice) && !index.has(exercice.id)) manquants.add(exercice.id);
          }
        }
        for (const exercice of program.warmup) {
          if (porteDesCharges(exercice) && !index.has(exercice.id)) manquants.add(exercice.id);
        }
      }
    }
    expect([...manquants]).toEqual([]);
  });
});
