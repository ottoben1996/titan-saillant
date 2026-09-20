/**
 * Silhouette de chargement de l'accueil.
 *
 * À l'ouverture, la première lecture du stockage prend un instant pendant lequel
 * l'écran n'avait rien à montrer. Ce test fige le comportement : tant que la
 * lecture n'est pas revenue, on voit une silhouette ; dès qu'elle est là, la
 * carte de la séance du jour prend sa place, et jamais les deux ensemble.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { getProgram } from '../../domain/programs';
import { HomeScreen } from './HomeScreen';

const program = getProgram('ottman');

function rendre(chargement: boolean) {
  return render(
    <HomeScreen
      profile="ottman"
      program={program}
      history={[]}
      chargement={chargement}
      activeSession={null}
      onStart={vi.fn()}
      onResume={vi.fn()}
      onDiscard={vi.fn()}
    />,
  );
}

describe('accueil pendant la première lecture', () => {
  it('montre une silhouette, et pas une carte vide', () => {
    const { container } = rendre(true);

    expect(container.querySelector('.skeleton-card')).not.toBeNull();
    expect(container.querySelector('.today-card')).toBeNull();
  });

  it('la silhouette ne dit rien à un lecteur d’écran', () => {
    const { container } = rendre(true);

    expect(container.querySelector('.skeleton-card')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('laisse la place à la carte du jour dès que la lecture est revenue', () => {
    const { container } = rendre(false);

    expect(container.querySelector('.skeleton-card')).toBeNull();
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('nomme l’action principale avec la séance et sa durée estimée', () => {
    rendre(false);

    expect(screen.getByRole('button', { name: /démarrer .+ · \d+ min/i })).toBeInTheDocument();
  });
});
