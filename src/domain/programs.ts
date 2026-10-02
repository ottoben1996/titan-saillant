import type { ExercisePrescription, ProfileId, SetPrescription, WorkoutDay, WorkoutPlan } from './types';

export const PROGRAM_WEEKS = 5;

const set = (values: SetPrescription): SetPrescription => Object.freeze({ ...values });
const exercise = (values: Omit<ExercisePrescription, 'sets'> & { sets: SetPrescription[] }): ExercisePrescription =>
  Object.freeze({ ...values, sets: Object.freeze(values.sets.map(set)) });

const warmup: readonly ExercisePrescription[] = Object.freeze([
  exercise({
    id: 'coiffe-rotateurs',
    name: 'Coiffe des rotateurs',
    kind: 'warmup',
    sets: [{ repetitions: 10, loadLabel: 'Élastique ou 4 kg à la poulie' }],
    notes: '10 par bras',
  }),
  exercise({
    id: 'bosu',
    name: 'Équilibre sur bosu',
    kind: 'warmup',
    sets: Array.from({ length: 3 }, () => ({ durationSeconds: 40, loadLabel: 'PDC' })),
    notes: '40 secondes par série : 20 secondes par jambe, changer de jambe à mi-série',
  }),
  exercise({
    id: 'rameur',
    name: 'Rameur',
    kind: 'warmup',
    sets: [{ durationSeconds: 180, loadLabel: 'PDC, intensité moyenne', restSeconds: 30 }],
  }),
]);
const cardioWarmup = Object.freeze([
  ...warmup.slice(0, 2),
  exercise({
    id: 'velo',
    name: 'Vélo',
    kind: 'warmup',
    sets: [{ durationSeconds: 180, loadLabel: 'PDC, intensité moyenne', restSeconds: 30 }],
  }),
]);

const cooldownAt5Kmh = Object.freeze({
  name: 'Tapis de course',
  durationSeconds: 300,
  loadLabel: '5 minutes à 5 km/h',
});
const cooldownFastWalk = Object.freeze({
  name: 'Tapis de course',
  durationSeconds: 300,
  loadLabel: '5 minutes en marche rapide',
});
const strength = (
  id: string,
  name: string,
  work: SetPrescription,
  workSets: number,
  restSeconds: number,
  warmupSets?: SetPrescription[],
  weeklyLoadKg?: readonly number[],
  weeklySetLoadsKg?: readonly (readonly number[])[],
  week = 1,
) =>
  exercise({
    id,
    name,
    kind: 'strength',
    weeklyLoadKg: weeklyLoadKg ? Object.freeze([...weeklyLoadKg]) : undefined,
    weeklySetLoadsKg: weeklySetLoadsKg
      ? Object.freeze(weeklySetLoadsKg.map((loads) => Object.freeze([...loads])))
      : undefined,
    sets: [
      ...(warmupSets ?? []),
      ...Array.from({ length: workSets }, (_, index) => ({
        ...work,
        ...(weeklySetLoadsKg?.[week - 1]?.[index] !== undefined
          ? { loadKg: weeklySetLoadsKg[week - 1][index] }
          : weeklyLoadKg?.[week - 1] !== undefined
            ? { loadKg: weeklyLoadKg[week - 1] }
            : {}),
      })),
    ],
    restAfterSeconds: restSeconds,
  });
const timed = (
  id: string,
  name: string,
  durationSeconds: number,
  setsCount: number,
  restAfterSeconds?: number,
  circuitId?: string,
) =>
  exercise({
    id,
    name,
    kind: 'timed',
    sets: Array.from({ length: setsCount }, () => ({ durationSeconds, loadLabel: 'PDC' })),
    restAfterSeconds,
    circuitId,
  });

function plan(profileId: ProfileId, week = 1): WorkoutPlan {
  const laura = profileId === 'laura';
  const activeWeek = Math.min(PROGRAM_WEEKS, Math.max(1, Math.round(week)));
  const a: WorkoutDay = Object.freeze({
    id: 'full-body-a',
    name: 'Full Body A',
    subtitle: 'Polyarticulaire et finisher cardio',
    exercises: Object.freeze([
      strength(
        'presse-cuisses-inclinee',
        'Presse à cuisse inclinée',
        { repetitions: 10, loadKg: laura ? 70 : 110, phase: 'working' },
        3,
        135,
        [
          { repetitions: 10, loadKg: laura ? 40 : 50, phase: 'warmup', restSeconds: 75 },
          { repetitions: 10, loadKg: laura ? 50 : 80, phase: 'warmup', restSeconds: 75 },
        ],
        laura ? [70, 70, 70, 70, 80] : [110, 110, 130, 110, 160],
        undefined,
        activeWeek,
      ),
      strength(
        'leg-curl-allonge',
        'Leg curl allongé',
        { repetitions: 12, loadKg: laura ? 23 : 50 },
        3,
        105,
        undefined,
        laura ? [23, 23, 27, 27, 27] : [50, 50, 55, 50, 50],
        undefined,
        activeWeek,
      ),
      strength(
        'chest-press',
        'Chest Press Machine',
        { repetitions: 12, loadKg: laura ? 18 : 45 },
        3,
        120,
        undefined,
        laura ? [18, 18, 20, 20, 20] : [45, 45, 52, 45, 59],
        undefined,
        activeWeek,
      ),
      strength(
        'tirage-horizontal',
        'Tirage horizontal prise serrée',
        { repetitions: 12, loadKg: laura ? 18 : 45 },
        3,
        120,
        undefined,
        laura ? [18, 18, 25, 25, 25] : [45, 45, 52, 45, 45],
        undefined,
        activeWeek,
      ),
      timed('jumping-jack', 'Jumping Jack', laura ? 35 : 25, 3, undefined, 'finisher-a'),
      timed('gainage-planche', 'Gainage planche', laura ? 35 : 25, 3, laura ? 25 : 30, 'finisher-a'),
    ]),
    warmup,
    cooldown: cooldownAt5Kmh,
  });
  const b: WorkoutDay = Object.freeze({
    id: 'full-body-b',
    name: 'Full Body B',
    subtitle: 'Polyarticulaire renforcé',
    exercises: Object.freeze([
      strength(
        'squat-smith',
        'Squat smith machine',
        { repetitions: 10, loadKg: laura ? 30 : 40, phase: 'working' },
        3,
        135,
        [
          { repetitions: laura ? 15 : 12, loadLabel: 'à vide', phase: 'warmup', restSeconds: 75 },
          { repetitions: laura ? 12 : 10, loadKg: laura ? 20 : 30, phase: 'warmup', restSeconds: 75 },
        ],
        laura ? [27, 27, 30, 30, 30] : [30, 30, 40, 40, 80],
        undefined,
        activeWeek,
      ),
      strength(
        'leg-extension',
        'Leg extension',
        { repetitions: 15, loadKg: laura ? 22.5 : 45 },
        2,
        105,
        undefined,
        laura ? [22.5, 22.5, 25, 25, 27] : [45, 45, 45, 45, 45],
        undefined,
        activeWeek,
      ),
      strength(
        'developpe-couche-machine',
        'Développé couché machine convergente',
        { repetitions: 12, loadKg: laura ? 20 : 60 },
        3,
        120,
        undefined,
        laura ? [20, 20, 20, 20, 20] : [60, 60, 80, 70, 80],
        laura
          ? undefined
          : [
              [60, 60, 60],
              [60, 60, 60],
              [80, 80, 80],
              [70, 70, 70],
              [80, 80, 100],
            ],
        activeWeek,
      ),
      strength(
        'tirage-vertical',
        'Tirage vertical prise neutre',
        { repetitions: 12, loadKg: laura ? 25 : 45 },
        3,
        120,
        undefined,
        laura ? [25, 25, 25, 25, 27] : [45, 45, 45, 45, 52],
        undefined,
        activeWeek,
      ),
      timed('skierg', 'SKIERG', laura ? 40 : 30, 3, undefined, 'finisher-b'),
      timed('hollow-hold', 'Hollow Hold', 25, 3, laura ? 25 : 30, 'finisher-b'),
    ]),
    warmup,
    cooldown: cooldownFastWalk,
  });
  const c: WorkoutDay = Object.freeze({
    id: 'cardio',
    name: 'Cardio',
    subtitle: 'Circuit cardio, rameur et marche',
    exercises: Object.freeze([
      timed('jumping-jack', 'Jumping Jack', laura ? 40 : 30, 3, undefined, 'circuit-1'),
      timed('mountain-climber', 'Mountain Climber', 30, 3, 60, 'circuit-1'),
      timed('sit-to-stand', 'Sit to Stand', laura ? 40 : 30, 3, undefined, 'circuit-2'),
      timed('crunches', 'Crunches', 30, 3, 60, 'circuit-2'),
      timed('skierg', 'SKIERG', 30, 3, undefined, 'circuit-3'),
      timed('rameur', 'Rameur', laura ? 40 : 30, 3, 60, 'circuit-3'),
      timed('rameur-15-min', 'Rameur — 15 minutes', 15 * 60, 1, 60),
      timed('marche-cardio', 'Marche sur tapis', 25 * 60, 1, 0),
      exercise({
        id: 'developpe-clavicule',
        name: 'Développé clavicule prise neutre',
        kind: 'timed',
        sets: Array.from({ length: 3 }, () => ({
          durationSeconds: 30,
          loadKg: laura ? 4 : 6,
          loadLabel: `${laura ? 4 : 6} kg par mains`,
        })),
        circuitId: 'circuit-4',
      }),
      timed('hollow-hold', 'Hollow Hold', 30, 3, 60, 'circuit-4'),
    ]),
    warmup: cardioWarmup,
    cooldown: cooldownFastWalk,
  });
  return Object.freeze({
    profileId,
    displayName: profileId === 'ottman' ? 'Ottman' : 'Laura',
    coach: 'SELVA Adrien',
    warmup,
    days: Object.freeze([a, b, c]),
  });
}

export const ottmanProgram = plan('ottman');
export const lauraProgram = plan('laura');
export const programs: Readonly<Record<ProfileId, WorkoutPlan>> = Object.freeze({
  ottman: ottmanProgram,
  laura: lauraProgram,
});
export function getProgram(profileId: ProfileId, week = 1): WorkoutPlan {
  return week === 1 ? programs[profileId] : plan(profileId, week);
}
