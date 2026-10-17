import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
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
      <MuscleMap primaryMuscles={['Pectoraux', 'Triceps']} secondaryMuscles={['Épaules']} />,
    );
    expect(container.querySelector('.muscle-map-wrapper')).not.toBeNull();
    const svgs = container.querySelectorAll('.muscle-svg');
    expect(svgs.length).toBe(2); // Face et Dos
    expect(container.textContent).toContain('FACE');
    expect(container.textContent).toContain('DOS');
    expect(container.textContent).toContain('Moteur principal');
  });

  it('expose un rôle, un titre et une alternative textuelle listant les muscles', () => {
    const { container } = render(
      <MuscleMap primaryMuscles={['Pectoraux', 'Triceps']} secondaryMuscles={['Épaules']} />,
    );

    const group = screen.getByRole('img', { name: 'Muscles sollicités' });
    const describedBy = group.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();

    const altText = document.getElementById(describedBy as string)?.textContent ?? '';
    expect(altText).toContain('Muscles principaux');
    expect(altText).toContain('Pectoraux');
    expect(altText).toContain('Triceps');
    expect(altText).toContain('Muscles synergistes');
    expect(altText).toContain('Épaules');

    // Le schéma est décoratif : la même information vit dans le texte.
    const views = container.querySelector('.muscle-map-views');
    expect(views?.getAttribute('aria-hidden')).toBe('true');
  });

  it('rend une légende qui correspond aux couleurs du schéma', () => {
    const { container } = render(<MuscleMap primaryMuscles={['Pectoraux']} secondaryMuscles={['Triceps']} />);
    expect(container.querySelector('.legend-dot.primary')).not.toBeNull();
    expect(container.querySelector('.legend-dot.secondary')).not.toBeNull();
  });

  it('ne produit pas de description vide quand aucun muscle n’est fourni', () => {
    render(<MuscleMap />);
    const group = screen.getByRole('img', { name: 'Muscles sollicités' });
    const describedBy = group.getAttribute('aria-describedby');
    const altText = document.getElementById(describedBy as string)?.textContent ?? '';
    expect(altText).toContain('Aucun muscle');
  });
});
