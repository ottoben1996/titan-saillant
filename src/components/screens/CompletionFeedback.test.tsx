/**
 * Quiz de fin de séance.
 *
 * Quatre questions, quatre réponses : on vérifie qu'elles arrivent bien telles
 * quelles dans l'enregistrement de la séance, que la localisation de la gêne
 * n'est conservée que lorsqu'il y a une gêne, et qu'un athlète pressé peut
 * terminer sans rien renseigner.
 */
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { CompletionFeedback } from './CompletionFeedback';
import type { WorkoutSession } from '../../domain/types';

const session = (over: Partial<WorkoutSession> = {}): WorkoutSession =>
  ({
    id: 's1',
    profileId: 'ottman',
    dayId: 'full-body-a',
    startedAt: '2026-09-12T09:00:00.000Z',
    updatedAt: '2026-09-12T10:00:00.000Z',
    completedAt: '2026-09-12T10:00:00.000Z',
    currentExerciseIndex: 0,
    currentSetIndex: 0,
    loggedSets: [],
    ...over,
  }) as WorkoutSession;

describe('quiz de fin de séance', () => {
  it('enregistre les quatre réponses', () => {
    const onFinish = vi.fn();
    render(<CompletionFeedback session={session()} onFinish={onFinish} />);

    fireEvent.click(screen.getByRole('button', { name: '7' }));
    fireEvent.click(screen.getByRole('button', { name: "Mieux que d'habitude" }));
    fireEvent.click(screen.getByRole('button', { name: 'Douleur' }));
    fireEvent.change(screen.getByLabelText('Où se situe la gêne'), { target: { value: 'épaule droite' } });
    fireEvent.click(screen.getByRole('button', { name: 'Charger plus' }));
    fireEvent.change(screen.getByLabelText(/Note personnelle/), { target: { value: 'bonne forme' } });

    fireEvent.click(screen.getByRole('button', { name: /Enregistrer et terminer/ }));

    expect(onFinish).toHaveBeenCalledWith({
      perceivedExertion: 7,
      energy: 5,
      pain: 'Douleur',
      painLocation: 'épaule droite',
      loadConsigne: 'increase',
      notes: 'bonne forme',
    });
  });

  it("ne demande où se situe la gêne que s'il y en a une", () => {
    const onFinish = vi.fn();
    render(<CompletionFeedback session={session()} onFinish={onFinish} />);

    // Sans gêne : aucun champ de localisation, et rien n'est envoyé à ce sujet.
    expect(screen.queryByLabelText('Où se situe la gêne')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Gêne légère' }));
    expect(screen.getByLabelText('Où se situe la gêne')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Enregistrer et terminer/ }));
    expect(onFinish).toHaveBeenCalledWith(expect.objectContaining({ pain: 'Gêne légère', painLocation: undefined }));
  });

  it('un choix se retire en le retapant', () => {
    const onFinish = vi.fn();
    render(<CompletionFeedback session={session()} onFinish={onFinish} />);

    fireEvent.click(screen.getByRole('button', { name: '9' }));
    expect(screen.getByRole('button', { name: '9' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: '9' }));
    expect(screen.getByRole('button', { name: '9' })).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(screen.getByRole('button', { name: /Enregistrer et terminer/ }));
    expect(onFinish).toHaveBeenCalledWith(expect.objectContaining({ perceivedExertion: undefined }));
  });

  it('permet de terminer sans rien renseigner', () => {
    const onFinish = vi.fn();
    render(<CompletionFeedback session={session()} onFinish={onFinish} />);

    fireEvent.click(screen.getByRole('button', { name: /sans renseigner/i }));
    expect(onFinish).toHaveBeenCalledWith(undefined);
  });

  it('reprend un ressenti déjà enregistré pour le corriger', () => {
    render(
      <CompletionFeedback
        session={session({ perceivedExertion: 6, energy: 3, pain: 'Aucune', loadConsigne: 'same' })}
        onFinish={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: '6' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: "Comme d'habitude" })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Même charge' })).toHaveAttribute('aria-pressed', 'true');
  });
});
