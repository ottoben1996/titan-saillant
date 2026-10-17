import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProgressionScreen } from './ProgressionScreen';

describe('ProgressionScreen — sélecteur duo', () => {
  it('expose le changement de profil près de l’en-tête', () => {
    render(
      <ProgressionScreen
        history={[]}
        profile="laura"
        measurements={[]}
        onBack={vi.fn()}
        onOpenFollowup={vi.fn()}
        onSwitchDuoProfile={vi.fn()}
      />,
    );

    expect(screen.getByRole('group', { name: /profil de progression/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ottman' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Laura' })).toHaveAttribute('aria-pressed', 'true');
  });
});
