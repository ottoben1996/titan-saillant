import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { MuscleMap, normalizeMuscle } from './MuscleMap';

describe('normalizeMuscle', () => {
  it('normalise les noms de muscles français et anglais', () => {
    expect(normalizeMuscle('Pectoraux')).toBe('chest');
    expect(normalizeMuscle('Upper Chest')).toBe('chest');
    expect(normalizeMuscle('Épaules')).toBe('shoulders');
    expect(normalizeMuscle('Deltoïdes')).toBe('shoulders');
    expect(normalizeMuscle('Quadriceps')).toBe('quads');
    expect(normalizeMuscle('Fessiers')).toBe('glutes');
    expect(normalizeMuscle('Ischio-jambiers')).toBe('hamstrings');
    expect(normalizeMuscle('Dorsaux')).toBe('lats');
    expect(normalizeMuscle('Inconnu')).toBeNull();
  });
});

describe('MuscleMap component', () => {
  it('affiche la silhouette Face et Dos avec les muscles primaires colorés', () => {
    const { container } = render(
      <MuscleMap primaryMuscles={['Pectoraux', 'Triceps']} secondaryMuscles={['Épaules']} />
    );
    expect(container.querySelector('.muscle-map-wrapper')).not.toBeNull();
    const svgs = container.querySelectorAll('.muscle-svg');
    expect(svgs.length).toBe(2); // Face et Dos
    expect(container.textContent).toContain('FACE');
    expect(container.textContent).toContain('DOS');
    expect(container.textContent).toContain('Moteur principal');
  });
});
