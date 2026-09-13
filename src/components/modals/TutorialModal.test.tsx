import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { tutorials } from '../../domain/tutorials';
import { TutorialModal } from './TutorialModal';

describe('TutorialModal (YouTube Shorts In-App)', () => {
  const tutorial = tutorials['presse-cuisses-inclinee'];

  it('renders the in-app YouTube Shorts iframe with correct muted and playsinline embed URL', () => {
    render(<TutorialModal tutorial={tutorial} onClose={vi.fn()} />);

    expect(screen.getByText('Démo Short')).toBeDefined();
    expect(screen.getByText('🧬 Anatomie & Repères')).toBeDefined();

    const iframe = screen.getByTitle(/Short Démonstration/i) as HTMLIFrameElement;
    expect(iframe).toBeDefined();
    expect(iframe.src).toContain('https://www.youtube-nocookie.com/embed/EotSw18oR9w');
    expect(iframe.src).toContain('mute=1');
    expect(iframe.src).toContain('autoplay=1');
    expect(iframe.src).toContain('playsinline=1');
    expect(iframe.src).toContain('loop=1');
  });

  it('allows switching between Démo Short and Anatomie & Repères tabs', () => {
    render(<TutorialModal tutorial={tutorial} onClose={vi.fn()} />);

    const anatomyTab = screen.getByText('🧬 Anatomie & Repères');
    fireEvent.click(anatomyTab);

    expect(screen.getByText(/Talons bien vissés au plateau/i)).toBeDefined();
    expect(screen.getByText('Position & exécution')).toBeDefined();
    expect(screen.getByText('À éviter')).toBeDefined();

    const shortTab = screen.getByText('Démo Short');
    fireEvent.click(shortTab);
    expect(screen.getByTitle(/Short Démonstration/i)).toBeDefined();
  });

  it('calls onClose when clicking Retour à la séance', () => {
    const handleClose = vi.fn();
    render(<TutorialModal tutorial={tutorial} onClose={handleClose} />);

    const backButton = screen.getByRole('button', { name: /Retour à la séance/i });
    fireEvent.click(backButton);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
