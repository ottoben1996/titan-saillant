import type {
  ExercisePrescription,
  ManualDurationOverrides,
  ManualLoadOverrides,
  ProfileId,
  SetPrescription,
  WorkoutDay,
  WorkoutDayId,
  WorkoutPlan,
} from './types';

export const PROGRAM_WEEKS = 8;

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

const cooldownFastWalk: WorkoutPlan['days'][number]['cooldown'] = Object.freeze({
  name: 'Tapis de course',
  durationSeconds: 300,
  loadLabel: '5 minutes en marche rapide',
});
/* Legacy helper retained for source compatibility. */
const strength = (id: string, name: string, work: SetPrescription, workSets: number, restSeconds: number, warmupSets?: SetPrescription[], weeklyLoadKg?: readonly number[], weeklySetLoadsKg?: readonly (readonly number[])[], week = 1, manualLoads?: ManualLoadOverrides) =>
  (() => {
    const overrides = manualLoads?.[id] ?? [];
    const overrideAt = (index: number) => {
      const value = overrides[index];
      return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined;
    };
    const resolvedWeeklyLoadKg = weeklyLoadKg
      ? (Array.from({ length: PROGRAM_WEEKS }, (_, index) => overrideAt(index) ?? weeklyLoadKg[index]) as number[])
      : undefined;
    const resolvedWeeklySetLoadsKg = weeklySetLoadsKg?.map((loads, index) => {
      const override = overrideAt(index);
      return override === undefined ? [...loads] : loads.map(() => override);
    });

    return exercise({
      id,
      name,
      kind: 'strength',
      weeklyLoadKg: resolvedWeeklyLoadKg ? Object.freeze([...resolvedWeeklyLoadKg]) : undefined,
      weeklySetLoadsKg: resolvedWeeklySetLoadsKg
        ? Object.freeze(resolvedWeeklySetLoadsKg.map((loads) => Object.freeze([...loads])))
        : undefined,
      sets: [
        ...(warmupSets ?? []),
        ...Array.from({ length: workSets }, (_, index) => ({
          ...work,
          ...(resolvedWeeklySetLoadsKg?.[week - 1]?.[index] !== undefined
            ? { loadKg: resolvedWeeklySetLoadsKg[week - 1][index] }
            : resolvedWeeklyLoadKg?.[week - 1] !== undefined
              ? { loadKg: resolvedWeeklyLoadKg[week - 1] }
              : {}),
        })),
      ],
      restAfterSeconds: restSeconds,
    });
  })();
void strength;
const timed = (
  id: string,
  name: string,
  durationSeconds: number,
  setsCount: number,
  restAfterSeconds?: number,
  circuitId?: string,
  manualDurations?: ManualDurationOverrides,
  week = 1,
) =>
  exercise({
    id,
    name,
    kind: 'timed',
    sets: Array.from({ length: setsCount }, () => ({
      durationSeconds: manualDurations?.[id]?.[week - 1] ?? durationSeconds,
      loadLabel: 'PDC',
    })),
    restAfterSeconds,
    circuitId,
  });

function plan(profileId: ProfileId, week = 1, manualLoads?: ManualLoadOverrides, manualDurations?: ManualDurationOverrides): WorkoutPlan {
  const laura = profileId === 'laura';
  const activeWeek = Math.min(PROGRAM_WEEKS, Math.max(1, Math.round(week)));

  const pdfStrength = (id: string, name: string, repetitions: number, loads: readonly (number | undefined)[], restAfterSeconds: number): ExercisePrescription => {
    const manual = manualLoads?.[id]?.[activeWeek - 1];
    const sets = loads.map((loadKg) => ({ repetitions, ...(loadKg === undefined ? { loadLabel: 'PDC' } : { loadKg }), phase: 'working' as const }));
    const withManual = manual === null || manual === undefined ? sets : sets.map((item) => ({ ...item, loadKg: manual, loadLabel: undefined }));
    return exercise({
      id,
      name,
      kind: 'strength',
      weeklyLoadKg: Object.freeze(Array.from({ length: PROGRAM_WEEKS }, () => (manual ?? loads.at(-1) ?? 0))),
      sets: withManual,
      restAfterSeconds,
    });
  };
  const pdfTimed = (id: string, name: string, durationSeconds: number, count: number, restAfterSeconds: number, circuitId?: string): ExercisePrescription => timed(id, name, durationSeconds, count, restAfterSeconds, circuitId, manualDurations, activeWeek);
  const day = (id: WorkoutDayId, name: string, subtitle: string, exercises: ExercisePrescription[], cooldown = cooldownFastWalk): WorkoutDay => Object.freeze({ id, name, subtitle, exercises: Object.freeze(exercises), warmup: id === 'cardio' || id === 'cardio-4' ? cardioWarmup : warmup, cooldown });

  const session1 = laura
    ? day('full-body-a', 'Full body - Special cuisses', 'Programme 2 PDF - special cuisses', [
        pdfStrength('leg-press-pdf', 'Leg Press inclinee', 12, [40, 60, 85], 120),
        pdfStrength('leg-curl-pdf', 'Leg Curl', 12, [27, 27, 27], 90),
        pdfStrength('row-pdf', 'Tirage horizontal machine', 12, [25, 25, 25], 105),
        pdfStrength('chest-press-pdf', 'Chest Press', 12, [25, 25, 25], 105),
        pdfTimed('rameur-pdf', 'Rameur', 600, 1, 60),
      ])
    : day('full-body-a', 'Full body - Special upper', 'Programme 2 PDF - special haut du corps', [
        pdfStrength('rdl-pdf', 'Souleve de terre roumain', 12, [undefined, 40, 40, 40], 105),
        pdfStrength('bench-pdf', 'Developpe couche barre', 12, [65, 65, 65], 105),
        pdfStrength('row-pdf', 'Tirage horizontal machine', 12, [50, 50, 50], 105),
        pdfStrength('shoulder-press-pdf', 'Developpe epaule machine', 12, [40, 40, 40], 105),
        pdfTimed('rameur-pdf', 'Rameur', 600, 1, 60),
      ]);

  const session2 = day('full-body-b', 'Cardio / renfo', 'Circuit PDF - renforcement et cardio', laura
    ? [
        pdfStrength('air-squat-pdf', 'Air Squat', 10, [undefined, undefined, undefined], 0),
        pdfStrength('bridge-pdf', 'Gainage pont', 15, [undefined, undefined, undefined], 30),
        pdfTimed('plank-pdf', 'Gainage planche', 40, 3, 20, 'abdo-posture'),
        pdfTimed('sit-up-pdf', 'Sit up', 40, 3, 20, 'abdo-posture'),
        pdfStrength('push-up-pdf', 'Pompes', 2, [undefined, undefined, undefined], 30),
        pdfStrength('kettlebell-pdf', 'Kettlebell swing', 40, [8, 8, 8], 20),
        pdfTimed('cross-crunch-pdf', 'Abdos croises', 40, 3, 20, 'abdo-cardio'),
        pdfTimed('mountain-climber-pdf', 'Mountain climber', 40, 3, 20, 'abdo-cardio'),
      ]
    : [
        pdfStrength('air-squat-pdf', 'Air Squat', 10, [undefined, undefined, undefined], 0),
        pdfStrength('bridge-pdf', 'Gainage pont', 15, [undefined, undefined, undefined], 30),
        pdfTimed('plank-pdf', 'Gainage planche', 35, 3, 25, 'abdo-posture'),
        pdfTimed('sit-up-pdf', 'Sit up', 35, 3, 25, 'abdo-posture'),
        pdfStrength('push-up-pdf', 'Pompes', 5, [undefined, undefined, undefined], 25),
        pdfStrength('kettlebell-pdf', 'Kettlebell swing', 35, [8, 8, 8], 25),
        pdfTimed('cross-crunch-pdf', 'Abdos croises', 35, 3, 25, 'abdo-cardio'),
        pdfTimed('mountain-climber-pdf', 'Mountain climber', 35, 3, 25, 'abdo-cardio'),
      ]);

  const session3 = day('cardio', laura ? 'Full body - Special fessier' : 'Full body - Special lower', 'Programme 2 PDF - seance complete', laura
    ? [
        pdfStrength('hip-thrust-pdf', 'Hip Thrust machine', 12, [15, 25, 40], 105),
        pdfStrength('kickback-pdf', 'Kick back unilateral poulie', 12, [7.5, 7.5, 7.5], 60),
        pdfStrength('pec-fly-pdf', 'Pec Fly', 12, [25, 25, 25], 105),
        pdfStrength('lat-pulldown-pdf', 'Tirage vertical prise large', 12, [25, 25, 25], 105),
        pdfTimed('plank-s3-pdf', 'Gainage planche', 40, 3, 20, 's3-core'),
        pdfTimed('mountain-s3-pdf', 'Mountain Climber', 40, 3, 20, 's3-core'),
      ]
    : [
        pdfStrength('hip-thrust-pdf', 'Hip Trust machine', 15, [15, 25, 40], 90),
        pdfTimed('leg-extension-iso-pdf', 'Leg extension isometrie unilateral', 20, 2, 0),
        pdfTimed('leg-curl-iso-pdf', 'Leg curl isometrie', 30, 2, 90),
        pdfStrength('pec-fly-pdf', 'Pec Fly', 12, [52, 52, 52], 105),
        pdfStrength('lat-pulldown-pdf', 'Tirage vertical prise large', 12, [52, 52, 52], 105),
        pdfTimed('plank-s3-pdf', 'Gainage planche', 35, 3, 25, 's3-core'),
        pdfTimed('mountain-s3-pdf', 'Mountain Climber', 35, 3, 25, 's3-core'),
      ]);

  const session4 = day('cardio-4', 'Endurance fondamentale', 'Vélo elliptique, marche inclinee et tapis', [
    pdfTimed('bike-elliptique-pdf', 'Vélo elliptique', 900, 1, 120),
    pdfTimed('marche-inclinee-pdf', 'Marche tapis incline', 1200, 1, 0),
    pdfTimed('marche-inclinee-longue-pdf', 'Marche tapis incline', 600, 1, 120),
  ], Object.freeze({ name: 'Tapis de course', durationSeconds: 300, loadLabel: '5 minutes marche a 3 km/h' as string }));

  return Object.freeze({ profileId, displayName: profileId === 'ottman' ? 'Ottman' : 'Laura', coach: 'SELVA Adrien', warmup, days: Object.freeze([session1, session2, session3, session4]) });
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
  return week === 1 && !manualLoads && !manualDurations
    ? programs[profileId]
    : plan(profileId, week, manualLoads, manualDurations);
}