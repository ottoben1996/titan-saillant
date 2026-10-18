import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BottomNav, navigationParent } from './BottomNav';

describe('BottomNav', () => {
  it.each([
    ['followup', 'progression'],
    ['bilan', 'progression'],
  ] as const)('keeps %s active under its %s parent', (screenName, parent) => {
    expect(navigationParent(screenName)).toBe(parent);
    render(<BottomNav currentScreen={screenName} onNavigate={() => undefined} />);
    expect(screen.getByRole('button', { name: 'Progression' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Progression' })).toHaveClass('active');
  });

  it('keeps session labels and navigation callbacks intact', () => {
    const onNavigate = vi.fn();
    render(<BottomNav currentScreen="home" onNavigate={onNavigate} />);

    expect(screen.getByRole('button', { name: 'Charges' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Séances' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Progression' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Historique' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Profil' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Séances' }));
    expect(onNavigate).toHaveBeenCalledWith('home');
  });
});
