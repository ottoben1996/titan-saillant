import { describe, expect, it } from 'vitest';
import { exerciseLabel } from './labels';

describe('exerciseLabel', () => {
  it('traduit un identifiant connu', () => {
    expect(exerciseLabel('velo')).toBe('Vélo stationnaire');
  });
  it('utilise le repli pour un identifiant inconnu', () => {
    expect(exerciseLabel('nouvel-exercice', 'Mon exercice')).toBe('Mon exercice');
  });
  it('convertit un identifiant inconnu en libellé lisible', () => {
    expect(exerciseLabel('nouvel-exercice')).toBe('Nouvel exercice');
  });
});
