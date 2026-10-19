import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { NombreAnime } from './NombreAnime';

describe('NombreAnime', () => {
  /**
   * Dans un environnement sans navigateur, l'élément personnalisé de
   * number-flow n'est jamais enregistré : le composant doit alors écrire le
   * nombre en clair. C'est la condition qui garde la suite de tests fiable —
   * et la règle qui évite qu'un écran tombe pour un chiffre qui glisse.
   */
  it('écrit le nombre en clair quand number-flow n’est pas enregistré', () => {
    expect(customElements.get('number-flow-react')).toBeUndefined();

    render(<NombreAnime valeur={112.5} decimals={1} suffixe="kg" />);

    expect(screen.getByText('112,5 kg')).toBeDefined();
  });

  it('suit les changements de valeur sans incident', () => {
    const { rerender } = render(<NombreAnime valeur={110} decimals={0} />);
    expect(screen.getByText('110')).toBeDefined();

    rerender(<NombreAnime valeur={112.5} decimals={1} />);
    expect(screen.getByText('112,5')).toBeDefined();
  });
});
