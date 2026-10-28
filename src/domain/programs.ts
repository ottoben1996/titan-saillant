import type {
  ExercisePrescription,
  ManualDurationOverrides,
  ManualLoadOverrides,
  ProfileId,
  SetPrescription,
  WorkoutDay,
  WorkoutPlan,
} from './types';

export const PROGRAM_WEEKS = 8;

const set = (values: SetPrescription): SetPrescription => Object.freeze({ ...values });
const exercise = (values: Omit<ExercisePrescription, 'sets'> & { sets: SetPrescription[] }): ExercisePrescription =>
  Object.freeze({ ...values, sets: Object.freeze(values.sets.map(set)) });

const repeated = (value: number): readonly number[] =>
  Object.freeze(Array.from({ length: PROGRAM_WEEKS }, () => value));

const warmup: readonly ExercisePrescription[] = Object.freeze([
  exercise({
    id: 'coiffe-rotateurs',
    name: 'Coiffe des rotateurs',
    kind: 'warmup',
    sets: [{ repetitions: 10, loadLabel: 'Élastique ou 4 kg à la poulie' }],
    notes: '10 par bras · pas de pause',
  }),
  exercise({
    id: 'bosu',
    name: 'Équilibre sur bosu',
    kind: 'warmup',
    sets: Array.from({ length: 3 }, () => ({ durationSeconds: 20, loadLabel: 'PDC' })),
    notes: '20 secondes par jambe · pas de pause',
  }),
  exercise({
    id: 'velo',
    name: 'Vélo',
    kind: 'warmup',
    sets: [{ durationSeconds: 180, loadLabel: 'PDC · intensité moyenne', restSeconds: 30 }],
  }),
]);

const cooldownFastWalk = Object.freeze({
  name: 'Tapis de course',
  durationSeconds: 300,
  loadLabel: '5 minutes en marche rapide',
});
const cooldownFiveKmh = Object.freeze({
  name: 'Tapis de course',
  durationSeconds: 300,
  loadLabel: '5 minutes à 5 km/h',
});

const strength = (
  id: string,
  name: string,
  work: SetPrescription,
  workSets: number,
  restSeconds: number,
  warmupSets: SetPrescription[] | undefined,
  load: number,
  week: number,
  manualLoads?: ManualLoadOverrides,
) => {
  const overrides = manualLoads?.[id] ?? [];
  const override = overrides[week - 1];
  const current = typeof override === 'number' && override >= 0 ? override : load;
  return exercise({
    id,
    name,
    kind: 'strength',
    weeklyLoadKg: repeated(load),
    restAfterSeconds: restSeconds,
    sets: [...(warmupSets ?? []), ...Array.from({ length: workSets }, () => ({ ...work, loadKg: current }))],
  });
};

const timed = (
  id: string,
  name: string,
  seconds: number,
  setsCount: number,
  restAfterSeconds: number | undefined,
  week: number,
  manualDurations?: ManualDurationOverrides,
  notes?: string,
) => {
  const override = manualDurations?.[id]?.[week - 1];
  const durationSeconds = typeof override === 'number' && override >= 0 ? override : seconds;
  return exercise({
    id,
    name,
    kind: 'timed',
    sets: Array.from({ length: setsCount }, () => ({ durationSeconds, loadLabel: 'PDC' })),
    restAfterSeconds,
    notes,
  });
};

const cardioExercise = (
  id: string,
  name: string,
  repetitions: number | undefined,
  seconds: number | undefined,
  loadLabel: string,
  restSeconds: number | undefined,
  circuitId: string,
) =>
  exercise({
    id,
    name,
    kind: seconds === undefined ? 'strength' : 'timed',
    circuitId,
    restAfterSeconds: restSeconds,
    sets: Array.from({ length: 3 }, () => ({ repetitions, durationSeconds: seconds, loadLabel, restSeconds })),
  });

function plan(
  profileId: ProfileId,
  week = 1,
  manualLoads?: ManualLoadOverrides,
  manualDurations?: ManualDurationOverrides,
): WorkoutPlan {
  const activeWeek = Math.min(PROGRAM_WEEKS, Math.max(1, Math.round(week)));
  const laura = profileId === 'laura';
  const upperOrThigh = laura
    ? [
        strength(
          'leg-press-incline',
          'Leg press incliné — focus quadri',
          { repetitions: 12 },
          3,
          120,
          [
            { repetitions: 12, loadKg: 40, phase: 'warmup' },
            { repetitions: 12, loadKg: 60, phase: 'warmup' },
          ],
          85,
          activeWeek,
          manualLoads,
        ),
        strength('leg-curl-pdf', 'Leg curl', { repetitions: 12 }, 3, 90, undefined, 27, activeWeek, manualLoads),
        strength(
          'tirage-horizontal-pdf',
          'Tirage horizontal machine',
          { repetitions: 12 },
          3,
          105,
          undefined,
          25,
          activeWeek,
          manualLoads,
        ),
        strength('chest-press-pdf', 'Chest Press', { repetitions: 12 }, 3, 105, undefined, 25, activeWeek, manualLoads),
      ]
    : [
        strength(
          'souleve-terre-roumain',
          'Soulevé de terre roumain',
          { repetitions: 12 },
          4,
          105,
          [{ repetitions: 15, loadLabel: 'à vide', phase: 'warmup', restSeconds: 60 }],
          40,
          activeWeek,
          manualLoads,
        ),
        strength(
          'developpe-couche-barre',
          'Développé couché barre',
          { repetitions: 12 },
          3,
          105,
          undefined,
          65,
          activeWeek,
          manualLoads,
        ),
        strength(
          'tirage-horizontal-pdf',
          'Tirage horizontal machine',
          { repetitions: 12 },
          3,
          105,
          undefined,
          50,
          activeWeek,
          manualLoads,
        ),
        strength(
          'developpe-epaule-machine',
          'Développé épaule machine',
          { repetitions: 12 },
          3,
          105,
          undefined,
          40,
          activeWeek,
          manualLoads,
        ),
      ];
  const dayA: WorkoutDay = Object.freeze({
    id: 'full-body-a',
    name: laura ? 'Full body — Spé cuisse' : 'Full body — Spé upper',
    subtitle: 'Séance 1 · Force',
    exercises: Object.freeze([...upperOrThigh, timed('rameur-pdf', 'Rameur', 600, 1, 60, activeWeek, manualDurations)]),
    warmup,
    cooldown: cooldownFastWalk,
  });
  const dayBExercises = Object.freeze([
    cardioExercise('air-squat-pdf', 'Air squat', 10, undefined, 'PDC', undefined, 'renfo-lower'),
    cardioExercise('gainage-pont-pdf', 'Gainage pont', 15, undefined, 'PDC', 30, 'renfo-lower'),
    cardioExercise(
      'gainage-planche-pdf',
      'Gainage planche',
      undefined,
      laura ? 40 : 35,
      'PDC',
      laura ? 20 : 25,
      'abdo-posture',
    ),
    cardioExercise('sit-up-pdf', 'Sit up', undefined, laura ? 40 : 35, 'PDC', laura ? 20 : 25, 'abdo-posture'),
    cardioExercise(
      'pompes-pdf',
      'Pompes',
      laura ? 2 : 5,
      undefined,
      laura ? '2 reps puis 3 sur genoux' : 'PDC',
      30,
      'renfo-upper',
    ),
    cardioExercise(
      'kettlebell-swing-pdf',
      'Kettlebell swing',
      undefined,
      laura ? 40 : 35,
      '8 kg',
      laura ? 20 : 25,
      'renfo-upper',
    ),
    cardioExercise(
      'abdos-croises-pdf',
      'Abdos croisés',
      undefined,
      laura ? 40 : 35,
      'PDC',
      laura ? 20 : 25,
      'abdo-cardio',
    ),
    cardioExercise(
      'mountain-climber-pdf',
      'Mountain climber',
      undefined,
      laura ? 40 : 35,
      'PDC',
      laura ? 20 : 25,
      'abdo-cardio',
    ),
  ]);
  const dayB: WorkoutDay = Object.freeze({
    id: 'full-body-b',
    name: 'Cardio / Renfo',
    subtitle: 'Séance 2 · Circuits cardio et renforcement',
    exercises: dayBExercises,
    warmup,
    cooldown: Object.freeze({
      name: 'Tapis de course',
      durationSeconds: laura ? 600 : 300,
      loadLabel: laura ? '10 minutes à 5 km/h' : '5 minutes en marche rapide',
    }),
  });
  const lower = laura
    ? [
        strength(
          'hip-thrust-pdf',
          'Hip thrust machine',
          { repetitions: 12 },
          3,
          105,
          [
            { repetitions: 12, loadKg: 15, phase: 'warmup' },
            { repetitions: 12, loadKg: 25, phase: 'warmup' },
          ],
          40,
          activeWeek,
          manualLoads,
        ),
        strength(
          'kick-back-pdf',
          'Kick back unilatéral poulie',
          { repetitions: 12 },
          3,
          60,
          undefined,
          7.5,
          activeWeek,
          manualLoads,
        ),
        strength('pec-fly-pdf', 'Pec Fly', { repetitions: 12 }, 3, 105, undefined, 25, activeWeek, manualLoads),
        strength(
          'tirage-vertical-pdf',
          'Tirage vertical prise large',
          { repetitions: 12 },
          3,
          105,
          undefined,
          25,
          activeWeek,
          manualLoads,
        ),
      ]
    : [
        strength(
          'hip-thrust-pdf',
          'Hip thrust machine',
          { repetitions: 15 },
          2,
          105,
          [
            { repetitions: 12, loadKg: 15, phase: 'warmup' },
            { repetitions: 12, loadKg: 25, phase: 'warmup' },
          ],
          40,
          activeWeek,
          manualLoads,
        ),
        strength(
          'leg-extension-iso-pdf',
          'Leg extension isométrie unilatéral',
          { durationSeconds: 20 },
          2,
          90,
          undefined,
          18,
          activeWeek,
          manualLoads,
        ),
        strength(
          'leg-curl-iso-pdf',
          'Leg curl isométrie',
          { durationSeconds: 30 },
          2,
          90,
          undefined,
          27,
          activeWeek,
          manualLoads,
        ),
        strength('pec-fly-pdf', 'Pec Fly', { repetitions: 12 }, 3, 105, undefined, 52, activeWeek, manualLoads),
        strength(
          'tirage-vertical-pdf',
          'Tirage vertical prise large',
          { repetitions: 12 },
          3,
          105,
          undefined,
          52,
          activeWeek,
          manualLoads,
        ),
      ];
  const dayC: WorkoutDay = Object.freeze({
    id: 'cardio',
    name: laura ? 'Full body — Spé fessier' : 'Full body — Spé lower',
    subtitle: 'Séance 3 · Force et gainage',
    exercises: Object.freeze([
      ...lower,
      timed(
        'gainage-planche-lower',
        'Gainage planche',
        laura ? 40 : 35,
        3,
        laura ? 20 : 25,
        activeWeek,
        manualDurations,
      ),
      timed(
        'mountain-climber-lower',
        'Mountain climber',
        laura ? 40 : 35,
        3,
        laura ? 20 : 25,
        activeWeek,
        manualDurations,
      ),
    ]),
    warmup,
    cooldown: cooldownFastWalk,
  });
  const dayD: WorkoutDay = Object.freeze({
    id: 'cardio-4',
    name: 'Endurance fondamentale',
    subtitle: 'Séance 4 · Cardio continu',
    exercises: Object.freeze([
      timed('velo-elliptique', 'Vélo elliptique', 900, 1, 120, activeWeek, manualDurations, 'Allure modérée'),
      timed(
        'marche-inclinee-legere',
        'Marche tapis incliné',
        1200,
        1,
        0,
        activeWeek,
        manualDurations,
        'Inclinaison légère (2) · 4–5 km/h',
      ),
      timed(
        'marche-inclinee-forte',
        'Marche tapis incliné',
        600,
        1,
        120,
        activeWeek,
        manualDurations,
        'Inclinaison augmentée (3) · 6 km/h',
      ),
    ]),
    warmup,
    cooldown: cooldownFiveKmh,
  });
  return Object.freeze({
    profileId,
    displayName: laura ? 'Laura' : 'Ottman',
    coach: 'SELVA Adrien',
    warmup,
    days: Object.freeze([dayA, dayB, dayC, dayD]),
  });
}

export const ottmanProgram = plan('ottman');
export const lauraProgram = plan('laura');
export const programs: Readonly<Record<ProfileId, WorkoutPlan>> = Object.freeze({
  ottman: ottmanProgram,
  laura: lauraProgram,
});
export function getProgram(
  profileId: ProfileId,
  week = 1,
  manualLoads?: ManualLoadOverrides,
  manualDurations?: ManualDurationOverrides,
): WorkoutPlan {
  return plan(profileId, week, manualLoads, manualDurations);
}
