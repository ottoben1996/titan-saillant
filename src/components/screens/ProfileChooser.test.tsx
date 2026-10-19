import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { listSessions } from '../../storage/sessionRepository';
import { ProfileChooser } from './ProfileChooser';

vi.mock('../../storage/sessionRepository', () => ({
  listSessions: vi.fn(),
}));

describe('choix du profil', () => {
  beforeEach(() => {
    vi.mocked(listSessions).mockReset();
  });

  it('annonce le chargement puis permet de relancer après une erreur', async () => {
    // Séance datée de maintenant : le compteur porte sur la semaine en cours,
    // une date figée sortait de la semaine dès le lundi suivant.
    const maintenant = new Date().toISOString();
    vi.mocked(listSessions)
      .mockRejectedValueOnce(new Error('lecture impossible'))
      .mockImplementation(async (profileId) =>
        profileId === 'ottman'
          ? ([
              {
                id: 'session-1',
                profileId: 'ottman',
                dayId: 'full-body-a',
                startedAt: maintenant,
                updatedAt: maintenant,
                completedAt: maintenant,
                currentExerciseIndex: 0,
                currentSetIndex: 0,
                loggedSets: [],
              },
            ] as never)
          : [],
      );

    render(<ProfileChooser onChoose={() => undefined} />);

    expect(screen.getByRole('status')).toHaveTextContent('Chargement');
    expect(await screen.findByRole('alert')).toHaveTextContent('Impossible de charger les séances');
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeVisible();

    screen.getByRole('button', { name: 'Réessayer' }).click();

    await waitFor(() => expect(screen.getByText('1 séance cette semaine')).toBeInTheDocument());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
