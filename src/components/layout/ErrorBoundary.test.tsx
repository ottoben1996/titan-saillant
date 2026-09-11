import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppErrorBoundary } from './ErrorBoundary';

function Explosion(): ReactNode {
  throw new Error('Panne simulée du rendu');
}

describe('filet de sécurité d’affichage', () => {
  it('affiche un message utile et un bouton de reprise au lieu d’une page blanche', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(
      <AppErrorBoundary>
        <Explosion />
      </AppErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText(/L’écran n’a pas pu s’afficher/)).toBeTruthy();
    expect(screen.getByText(/Panne simulée du rendu/)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Recharger l’application/ })).toBeTruthy();
    expect(screen.getByText(/rien n’est perdu/)).toBeTruthy();

    spy.mockRestore();
  });

  it('affiche normalement les enfants quand tout va bien', () => {
    render(
      <AppErrorBoundary>
        <p>Écran normal</p>
      </AppErrorBoundary>,
    );
    expect(screen.getByText('Écran normal')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
