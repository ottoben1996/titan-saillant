/**
 * Section « Ma couleur » des réglages.
 *
 * On vérifie au clic : les cinq couleurs proposées, le message réservé au profil
 * de Laura, et que choisir une couleur remonte bien jusqu'à l'application.
 */
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { SettingsScreen } from './SettingsScreen';
import { db } from '../../storage/db';
import type { AccentId } from '../../domain/palettes';

const baseProps = {
  onBack: vi.fn(),
  onSwitch: vi.fn(),
  onNotice: vi.fn(),
  onImported: vi.fn(),
  isOnline: true,
  offlineReady: true,
  serviceWorkerReady: true,
  installAvailable: false,
  onInstall: vi.fn(),
  notificationPermission: 'default' as const,
  onEnableNotifications: vi.fn(),
  onCheckUpdate: vi.fn(),
};

const afficher = (profile: 'ottman' | 'laura', accent: AccentId = 'vert') => {
  const onAccentChange = vi.fn();
  render(<SettingsScreen {...baseProps} profile={profile} accent={accent} onAccentChange={onAccentChange} />);
  return onAccentChange;
};

beforeEach(async () => {
  await db.sessions.clear();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('choix de la couleur', () => {
  it('propose les cinq couleurs, avec celle du profil déjà sélectionnée', () => {
    afficher('ottman', 'vert');
    const groupe = screen.getByRole('radiogroup', { name: /couleur de l'application/i });

    expect(within(groupe).getAllByRole('radio')).toHaveLength(5);
    expect(within(groupe).getByRole('radio', { name: 'Vert' })).toHaveAttribute('aria-checked', 'true');
    expect(within(groupe).getByRole('radio', { name: 'Turquoise' })).toHaveAttribute('aria-checked', 'false');
  });

  it('remonte la couleur choisie', () => {
    const onAccentChange = afficher('ottman', 'vert');
    const groupe = screen.getByRole('radiogroup', { name: /couleur de l'application/i });

    fireEvent.click(within(groupe).getByRole('radio', { name: 'Bleu' }));
    expect(onAccentChange).toHaveBeenCalledWith('bleu');

    fireEvent.click(within(groupe).getByRole('radio', { name: 'Turquoise' }));
    expect(onAccentChange).toHaveBeenCalledWith('turquoise');
  });

  it("n'affiche le clin d'œil que sur le profil de Laura", () => {
    afficher('ottman');
    expect(screen.queryByText(/Ottman te connaît pas/)).toBeNull();
    cleanup();

    afficher('laura', 'rose');
    expect(screen.getByText("Parce qu'Ottman te connaît pas, choisis par toi-même.")).toBeInTheDocument();
  });

  it('montre la pastille de chaque couleur, et pas une étiquette abstraite', () => {
    afficher('laura', 'rose');
    const groupe = screen.getByRole('radiogroup', { name: /couleur de l'application/i });
    const pastille = within(groupe).getByRole('radio', { name: 'Bleu' }).querySelector('.accent-dot');

    expect(pastille).not.toBeNull();
    expect((pastille as HTMLElement).style.background).toBe('rgb(143, 199, 255)');
  });
});
