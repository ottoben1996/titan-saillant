import { describe, expect, it } from 'vitest';
import { getProgram } from './programs';

describe('programmes PDF 2', () => {
  it('remplace seance 1 Laura avec programme special cuisses', () => {
    const day = getProgram('laura').days[0];
    expect(day.name).toBe('Full body - Special cuisses');
    expect(day.exercises.map((exercise) => exercise.name)).toEqual(['Leg Press inclinee', 'Leg Curl', 'Tirage horizontal machine', 'Chest Press', 'Rameur']);
    expect(day.exercises[0].sets.map((set) => set.loadKg)).toEqual([40, 60, 85]);
    expect(day.exercises[0].sets.map((set) => set.repetitions)).toEqual([12, 12, 12]);
  });

  it('remplace seance 1 Ottman avec programme special upper', () => {
    const day = getProgram('ottman').days[0];
    expect(day.name).toBe('Full body - Special upper');
    expect(day.exercises.map((exercise) => exercise.name)).toEqual(['Souleve de terre roumain', 'Developpe couche barre', 'Tirage horizontal machine', 'Developpe epaule machine', 'Rameur']);
    expect(day.exercises[0].sets.map((set) => set.loadKg)).toEqual([undefined, 40, 40, 40]);
    expect(day.exercises[1].sets.every((set) => set.loadKg === 65)).toBe(true);
  });

  it('conserve differences PDF seance 2 et seance 3 entre profils', () => {
    const laura = getProgram('laura');
    const ottman = getProgram('ottman');
    expect(laura.days[1].exercises.find((exercise) => exercise.name === 'Pompes')?.sets[0].repetitions).toBe(2);
    expect(ottman.days[1].exercises.find((exercise) => exercise.name === 'Pompes')?.sets[0].repetitions).toBe(5);
    expect(laura.days[2].exercises.map((exercise) => exercise.name)).toContain('Kick back unilateral poulie');
    expect(ottman.days[2].exercises.map((exercise) => exercise.name)).toContain('Leg extension isometrie unilateral');
  });
});
