import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BottomNav, navigationParent } from './BottomNav';

describe('BottomNav', () => {
  it.each([
    ['history', 'progression'],
    ['followup', 'progression'],
    ['bilan', 'progression'],
  ] as const)('keeps %s active under its %s parent', (screenName, parent) => {
    expect(navigationParent(screenName)).toBe(parent);
    render(<BottomNav currentScreen={screenName} onNavigate={() => undefined} />);
    const onglet = screen.getByRole('button', { name: 'Progrès' });
    expect(onglet).toHaveAttribute('aria-current', 'page');
    expect(onglet).toHaveClass('active');
  });

  it('shows four tabs and navigates', () => {
    const onNavigate = vi.fn();
    render(<BottomNav currentScreen="home" onNavigate={onNavigate} />);

    expect(screen.getAllByRole('button')).toHaveLength(4);
    for (const nom of ['Aujourd’hui', 'Programme', 'Progrès', 'Profil']) {
      expect(screen.getByRole('button', { name: nom })).toBeInTheDocument();
    }

    fireEvent.click(screen.getByRole('button', { name: 'Programme' }));
    expect(onNavigate).toHaveBeenCalledWith('loads');
  });

  it('announces a badge', () => {
    render(<BottomNav currentScreen="home" onNavigate={() => undefined} badges={{ settings: true }} />);
    expect(screen.getByRole('button', { name: 'Profil, action en attente' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Programme' })).toBeInTheDocument();
  });
});
