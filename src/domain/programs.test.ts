import { describe, expect, it } from 'vitest';
import { getProgram } from './programs';

describe('programmes issus des PDF', () => {
  it.each(['ottman', 'laura'] as const)('expose les quatre séances PDF pour %s', (profile) => {
    expect(getProgram(profile).days.map((day) => day.id)).toEqual(['full-body-a', 'full-body-b', 'cardio', 'cardio-4']);
  });

  it('conserve les échauffements communs du PDF', () => {
    const warmup = getProgram('ottman').warmup;
    expect(warmup.map((item) => item.id)).toEqual(['coiffe-rotateurs', 'bosu', 'velo']);
    expect(warmup[0].sets[0]).toMatchObject({ repetitions: 10, loadLabel: 'Élastique ou 4 kg à la poulie' });
    expect(warmup[1].sets).toHaveLength(3);
    expect(warmup[1].sets[0]).toMatchObject({ durationSeconds: 20, loadLabel: 'PDC' });
    expect(warmup[2].sets[0]).toMatchObject({ durationSeconds: 180, restSeconds: 30 });
  });

  it('reprend les charges Ottman et Laura des séances de force', () => {
    const ottman = getProgram('ottman');
    const laura = getProgram('laura');
    expect(ottman.days[0].exercises.map((item) => item.name)).toEqual([
      'Soulevé de terre roumain',
      'Développé couché barre',
      'Tirage horizontal machine',
      'Développé épaule machine',
      'Rameur',
    ]);
    expect(ottman.days[0].exercises[0].sets.at(-1)?.loadKg).toBe(40);
    expect(ottman.days[0].exercises[1].sets.at(-1)?.loadKg).toBe(65);
    expect(laura.days[0].exercises[0].sets.at(-1)?.loadKg).toBe(85);
    expect(laura.days[0].exercises[1].sets.at(-1)?.loadKg).toBe(27);
    expect(laura.days[2].exercises[1].sets.at(-1)?.loadKg).toBe(7.5);
  });

  it('représente les circuits cardio/renfo et les trois blocs endurance', () => {
    for (const profile of ['ottman', 'laura'] as const) {
      const program = getProgram(profile);
      expect(program.days[1].exercises).toHaveLength(8);
      expect(program.days[1].exercises.every((item) => item.sets.length > 0)).toBe(true);
      expect(program.days[2].exercises.at(-1)?.name).toBe('Mountain climber');
      expect(program.days[3].exercises.map((item) => item.sets[0].durationSeconds)).toEqual([900, 1200, 600]);
    }
  });

  it('conserve les valeurs PDF lors de la lecture des semaines suivantes', () => {
    const weekEight = getProgram('ottman', 8);
    expect(weekEight.days[0].exercises[0].sets.at(-1)?.loadKg).toBe(40);
    expect(weekEight.days[3].exercises[0].sets[0].durationSeconds).toBe(900);
  });

  it('applique les overrides manuels sans modifier les valeurs PDF par défaut', () => {
    const custom = getProgram(
      'ottman',
      8,
      { 'developpe-couche-barre': [null, null, null, null, null, null, null, 72.5] },
      { 'velo-elliptique': [null, null, null, null, null, null, null, 1200] },
    );
    expect(custom.days[0].exercises[1].sets.slice(-3).map((item) => item.loadKg)).toEqual([72.5, 72.5, 72.5]);
    expect(custom.days[3].exercises[0].sets[0].durationSeconds).toBe(1200);
    expect(getProgram('ottman').days[0].exercises[1].sets.at(-1)?.loadKg).toBe(65);
  });
});
