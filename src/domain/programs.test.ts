import { describe, expect, it } from 'vitest';
import { getProgram } from './programs';
import { tutorials } from './tutorials';

describe('seed programs from PDFs', () => {
  it.each(['ottman', 'laura'] as const)('exposes the three sessions for %s', (profile) => {
    expect(getProgram(profile).days.map((day) => day.id)).toEqual(['full-body-a', 'full-body-b', 'cardio']);
  });

  it('preserves representative load and circuit differences', () => {
    const ottmanA = getProgram('ottman').days[0];
    const lauraA = getProgram('laura').days[0];
    expect(ottmanA.exercises[0].sets.at(-1)?.loadKg).toBe(110);
    expect(lauraA.exercises[0].sets.at(-1)?.loadKg).toBe(70);
    expect(ottmanA.exercises[4].sets[0].durationSeconds).toBe(25);
    expect(lauraA.exercises[4].sets[0].durationSeconds).toBe(35);
    expect(ottmanA.exercises[5].restAfterSeconds).toBe(30);
    expect(lauraA.exercises[5].restAfterSeconds).toBe(25);
  });

  it('keeps PDF warmups, paired finisher circuits and cooldown prescriptions', () => {
    for (const profile of ['ottman', 'laura'] as const) {
      const program = getProgram(profile);
      const a = program.days[0];
      const b = program.days[1];
      const cardio = program.days[2];
      expect(program.warmup.find((e) => e.id === 'rameur')).toBeDefined();
      expect(b.warmup?.find((e) => e.id === 'rameur')).toBeDefined();
      expect(cardio.warmup?.find((e) => e.id === 'velo')).toBeDefined();
      expect(a.exercises[4].circuitId).toBe(a.exercises[5].circuitId);
      expect(b.exercises[4].circuitId).toBe(b.exercises[5].circuitId);
      expect(a.cooldown.loadLabel).toBe('5 minutes à 5 km/h');
      expect(b.cooldown.loadLabel).toBe('5 minutes en marche rapide');
      expect(cardio.cooldown.loadLabel).toBe('5 minutes en marche rapide');
      expect(a.exercises[0].sets.slice(0, 2).every((s) => s.restSeconds === 75)).toBe(true);
      expect(b.exercises[0].sets.slice(0, 2).every((s) => s.restSeconds === 75)).toBe(true);
      expect(program.warmup.find((e) => e.id === 'bosu')?.sets.every((s) => s.durationSeconds === 40)).toBe(true);
      expect(cardio.exercises.find((e) => e.id === 'developpe-clavicule')?.sets).toHaveLength(3);
      expect(a.warmup?.map((e) => e.id)).toEqual(['coiffe-rotateurs', 'bosu', 'rameur']);
    }
  });

  it('expose toutes les charges Ottman et Laura des semaines 1 à 5', () => {
    const expected = {
      ottman: {
        'presse-cuisses-inclinee': [110, 110, 130, 110, 160],
        'leg-curl-allonge': [50, 50, 55, 50, 50],
        'chest-press': [45, 45, 52, 45, 59],
        'tirage-horizontal': [45, 45, 52, 45, 45],
        'squat-smith': [30, 30, 40, 40, 80],
        'leg-extension': [45, 45, 45, 45, 45],
        'developpe-couche-machine': [60, 60, 80, 70, 80],
        'tirage-vertical': [45, 45, 45, 45, 52],
      },
      laura: {
        'presse-cuisses-inclinee': [70, 70, 70, 70, 80],
        'leg-curl-allonge': [23, 23, 27, 27, 27],
        'chest-press': [18, 18, 20, 20, 20],
        'tirage-horizontal': [18, 18, 25, 25, 25],
        'squat-smith': [27, 27, 30, 30, 30],
        'leg-extension': [22.5, 22.5, 25, 25, 27],
        'developpe-couche-machine': [20, 20, 20, 20, 20],
        'tirage-vertical': [25, 25, 25, 25, 27],
      },
    } as const;

    for (const profile of ['ottman', 'laura'] as const) {
      for (const [exerciseId, weeklyLoads] of Object.entries(expected[profile])) {
        for (const [weekIndex, load] of weeklyLoads.entries()) {
          const exercise = getProgram(profile, weekIndex + 1)
            .days.flatMap((day) => day.exercises)
            .find((item) => item.id === exerciseId);
          const exceptionalSets = exercise?.weeklySetLoadsKg?.[weekIndex];
          if (exceptionalSets) {
            expect(
              exercise?.sets.slice(-exceptionalSets.length).map((item) => item.loadKg),
              `${profile} ${exerciseId} S${weekIndex + 1}`,
            ).toEqual(exceptionalSets);
          } else {
            expect(exercise?.sets.at(-1)?.loadKg, `${profile} ${exerciseId} S${weekIndex + 1}`).toBe(load);
          }
          expect(exercise?.weeklyLoadKg?.[weekIndex], `${profile} ${exerciseId} table S${weekIndex + 1}`).toBe(load);
        }
      }
    }

    const ottmanWeek5 = getProgram('ottman', 5).days[1].exercises.find(
      (item) => item.id === 'developpe-couche-machine',
    );
    expect(ottmanWeek5?.sets.map((item) => item.loadKg)).toEqual([80, 80, 100]);
  });

  it('conserve le circuit cardio et ajoute le rameur de 15 minutes et la marche de 25 minutes', () => {
    for (const profile of ['ottman', 'laura'] as const) {
      const cardio = getProgram(profile).days[2];
      const oldRower = cardio.exercises.find((item) => item.id === 'rameur');
      const addedRower = cardio.exercises.find((item) => item.id === 'rameur-15-min');
      const walk = cardio.exercises.find((item) => item.id === 'marche-cardio');

      expect(oldRower?.circuitId).toBe('circuit-3');
      expect(oldRower?.sets).toHaveLength(3);
      expect(oldRower?.sets[0].durationSeconds).toBe(profile === 'laura' ? 40 : 30);
      expect(addedRower?.sets).toEqual([{ durationSeconds: 900, loadLabel: 'PDC' }]);
      expect(walk?.sets).toEqual([{ durationSeconds: 1500, loadLabel: 'PDC' }]);
    }
  });

  it('provides an offline French tutorial for every seeded exercise', () => {
    const ids = new Set(getProgram('ottman').days.flatMap((d) => d.exercises.map((e) => e.id)));
    for (const id of ids) expect(tutorials[id]).toBeDefined();
  });
});
