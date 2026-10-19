import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProgressionScreen } from './ProgressionScreen';

describe('ProgressionScreen — en-tête', () => {
  it('expose le changement de profil dans un seul contrôle segmenté', () => {
    const onSwitchDuoProfile = vi.fn();
    render(
      <ProgressionScreen
        history={[]}
        profile="laura"
        measurements={[]}
        onNavigate={vi.fn()}
        onOpenFollowup={vi.fn()}
        onSwitchDuoProfile={onSwitchDuoProfile}
      />,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Progrès' })).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: /profil affiché/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Ottman' })).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByRole('radio', { name: 'Laura' })).toHaveAttribute('aria-checked', 'true');

    fireEvent.click(screen.getByRole('radio', { name: 'Ottman' }));
    expect(onSwitchDuoProfile).toHaveBeenCalledWith('ottman');
  });

  it('bascule vers les vues sœurs et n’affiche plus de retour à l’accueil', () => {
    const onNavigate = vi.fn();
    render(
      <ProgressionScreen
        history={[]}
        profile="ottman"
        measurements={[]}
        onNavigate={onNavigate}
        onOpenFollowup={vi.fn()}
      />,
    );

    expect(screen.getByRole('radio', { name: 'Tendances' })).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(screen.getByRole('radio', { name: 'Historique' }));
    expect(onNavigate).toHaveBeenCalledWith('history');
    expect(screen.queryByRole('button', { name: /accueil/i })).not.toBeInTheDocument();
  });
});
