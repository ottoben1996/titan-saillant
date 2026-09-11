import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PlateBadge } from './PlateBadge';

describe('PlateBadge', () => {
  it("affiche les disques par côté pour une charge exacte", () => {
    // 100 kg avec une barre de 20 kg -> 40 kg par côté -> 2 × 20 kg
    const { container } = render(<PlateBadge totalLoadKg={100} barWeightKg={20} />);

    expect(container.querySelector('.plate-badge-container')).not.toBeNull();
    // 40 kg par côté (le chiffre à lire en priorité)
    expect(container.querySelector('.plate-side-value')?.textContent).toBe('40');
    // Total barre tenu : 100 kg
    expect(screen.getByText('100 kg')).toBeInTheDocument();
    // Les disques : 2 × 20 kg
    const discs = container.querySelectorAll('.plate-disc');
    expect(discs).toHaveLength(1);
    expect(discs[0]?.textContent).toContain('2×');
    expect(discs[0]?.textContent).toContain('20');
    // Pas d'état d'alerte quand la charge tombe juste
    expect(container.querySelector('.plate-badge-warning')).toBeNull();
    expect(
      screen.getByRole('group', { name: /charge exacte/i })
    ).toBeInTheDocument();
  });

  it("signale explicitement une charge qui ne tombe pas juste", () => {
    // 101 kg avec une barre de 20 kg -> 40,5 kg/côté -> 40 kg + 0,5 kg manquant par côté
    const { container } = render(<PlateBadge totalLoadKg={101} barWeightKg={20} />);

    const warning = container.querySelector('.plate-badge-warning');
    expect(warning).not.toBeNull();
    expect(warning?.textContent).toContain('Charge non exacte');
    // Il manque 1 kg au total (0,5 kg par côté)
    expect(warning?.textContent).toContain('1 kg');
    // Ce qui est réellement chargé reste affiché
    expect(screen.getByText('100 kg')).toBeInTheDocument();
    expect(
      screen.getByRole('group', { name: /non exacte/i })
    ).toBeInTheDocument();
  });

  it('ordonne les disques du plus lourd au plus léger', () => {
    // 150 kg, barre 20 -> 65 kg/côté -> 20×3 + 5×1
    const { container } = render(<PlateBadge totalLoadKg={150} barWeightKg={20} />);

    const labels = Array.from(container.querySelectorAll('.plate-disc')).map(
      (el) => el.textContent ?? ''
    );
    expect(labels).toHaveLength(2);
    expect(labels[0]).toContain('20');
    expect(labels[1]).toContain('5');
    expect(labels[0]).not.toContain('5kg');
  });

  it('tient compte de la barre guidée de 10 kg de la Smith machine', () => {
    // squat-smith à 60 kg -> barre 10 kg -> 25 kg/côté -> 20 + 5 (exact)
    const { container } = render(<PlateBadge totalLoadKg={60} exerciseId="squat-smith" />);

    expect(container.querySelector('.plate-bar-note')?.textContent).toContain('10');
    expect(container.querySelector('.plate-badge-warning')).toBeNull();
    expect(container.querySelector('.plate-side-value')?.textContent).toBe('25');
  });

  it('ne rend rien sous 20 kg', () => {
    const { container } = render(<PlateBadge totalLoadKg={15} />);
    expect(container.firstChild).toBeNull();
  });
});
