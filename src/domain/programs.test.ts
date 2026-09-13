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

  it('matches every PDF-specific difference between Ottman and Laura', () => {
    const ottman = getProgram('ottman');
    const laura = getProgram('laura');
    const values = (profile: typeof ottman, dayIndex: number, exerciseId: string) =>
      profile.days[dayIndex].exercises.find((exercise) => exercise.id === exerciseId)?.sets;

    expect(values(ottman, 0, 'presse-cuisses-inclinee')?.map((set) => set.loadKg)).toEqual([50, 80, 110, 110, 110]);
    expect(values(laura, 0, 'presse-cuisses-inclinee')?.map((set) => set.loadKg)).toEqual([40, 50, 70, 70, 70]);
    expect(values(ottman, 0, 'leg-curl-allonge')?.[0].loadKg).toBe(50);
    expect(values(laura, 0, 'leg-curl-allonge')?.[0].loadKg).toBe(23);
    expect(values(ottman, 0, 'tirage-horizontal')?.[0].loadKg).toBe(45);
    expect(values(laura, 0, 'tirage-horizontal')?.[0].loadKg).toBe(18);
    expect(values(ottman, 1, 'squat-smith')?.map((set) => set.repetitions)).toEqual([12, 10, 10, 10, 10]);
    expect(values(laura, 1, 'squat-smith')?.map((set) => set.repetitions)).toEqual([15, 12, 10, 10, 10]);
    expect(values(ottman, 1, 'leg-extension')?.[0].loadKg).toBe(35);
    expect(values(laura, 1, 'leg-extension')?.[0].loadKg).toBe(22);
    expect(values(ottman, 2, 'jumping-jack')?.[0].durationSeconds).toBe(30);
    expect(values(laura, 2, 'jumping-jack')?.[0].durationSeconds).toBe(40);
    expect(values(ottman, 2, 'sit-to-stand')?.[0].durationSeconds).toBe(30);
    expect(values(laura, 2, 'sit-to-stand')?.[0].durationSeconds).toBe(40);
    expect(values(ottman, 2, 'rameur')?.[0].durationSeconds).toBe(30);
    expect(values(laura, 2, 'rameur')?.[0].durationSeconds).toBe(40);
    expect(values(ottman, 2, 'developpe-clavicule')?.[0].loadKg).toBe(6);
    expect(values(laura, 2, 'developpe-clavicule')?.[0].loadKg).toBe(4);
  });

  it('provides an offline French tutorial for every seeded exercise', () => {
    const ids = new Set(getProgram('ottman').days.flatMap((d) => d.exercises.map((e) => e.id)));
    for (const id of ids) expect(tutorials[id]).toBeDefined();
  });
});
