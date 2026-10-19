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

describe('MuscleMap en mode volume', () => {
  it('colore les zones par niveau et remplace la légende de rôles', () => {
    const { container } = render(<MuscleMap intensite={{ quads: 1, glutes: 0.5 }} titre="Répartition musculaire" />);

    expect(screen.getByText('Répartition musculaire')).toBeInTheDocument();
    expect(screen.getByText(/Quadriceps : volume élevé/)).toBeInTheDocument();
    expect(screen.getByText(/Fessiers : volume moyen/)).toBeInTheDocument();

    // La légende dit l'échelle de volume, pas les rôles.
    expect(screen.getByText('Peu')).toBeInTheDocument();
    expect(screen.getByText('Beaucoup')).toBeInTheDocument();
    expect(screen.queryByText('Moteur principal')).not.toBeInTheDocument();

    // Plein régime : opacité 1 ; moitié : 0,59 ; zone absente : éteinte.
    const opacites = [...container.querySelectorAll('path[opacity]')].map((node) => node.getAttribute('opacity'));
    expect(opacites).toContain('0.59');
    expect(opacites).toContain('1');
    const styles = [...container.querySelectorAll('path[style]')].map((node) => node.getAttribute('style') ?? '');
    expect(styles.some((style) => style.includes('var(--accent-3)'))).toBe(true);
  });

  it('rend le bilan imprimé en encre, sans accent de thème', () => {
    const { container } = render(<MuscleMap intensite={{ quads: 1 }} monochrome />);

    const styles = [...container.querySelectorAll('path[style]')].map((node) => node.getAttribute('style') ?? '');
    // jsdom sérialise les couleurs hexadécimales en rgb() : on accepte les deux écritures.
    expect(styles.some((style) => /#24312a|rgb\(36,\s*49,\s*42\)/.test(style))).toBe(true);
    expect(styles.some((style) => /#d9dedb|rgb\(217,\s*222,\s*219\)/.test(style))).toBe(true);
    expect(styles.every((style) => !style.includes('var(--accent'))).toBe(true);
  });
});
