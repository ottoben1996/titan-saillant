import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FollowupScreen } from './FollowupScreen';

const rendre = (programWeek: number, onAlignProgramWeek = vi.fn()) => {
  render(
    <FollowupScreen
      profileId="ottman"
      measurements={[]}
      sessionsThisWeek={2}
      onSave={vi.fn()}
      onOpenBilan={vi.fn()}
      onNavigate={vi.fn()}
      programWeek={programWeek}
      onAlignProgramWeek={onAlignProgramWeek}
    />,
  );
  return onAlignProgramWeek;
};

const enregistrerLePoint = () => {
  fireEvent.change(screen.getByLabelText('Poids en kilogrammes'), { target: { value: '92,4' } });
  fireEvent.click(screen.getByRole('button', { name: /Valider le point de la semaine/i }));
};

describe('FollowupScreen — calendriers', () => {
  it('propose d’aligner les charges quand le point et la semaine divergent', () => {
    const onAlign = rendre(4);

    enregistrerLePoint();

    expect(screen.getByText('Un seul calendrier')).toBeInTheDocument();
    expect(screen.getByText(/Ton point est en semaine 1, tes charges en semaine 4/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Aligner les charges sur la semaine 1/i }));
    expect(onAlign).toHaveBeenCalledWith(1);
  });

  it('ne propose rien quand les deux calendriers sont déjà sur la même semaine', () => {
    rendre(1);

    enregistrerLePoint();

    expect(screen.queryByText('Un seul calendrier')).not.toBeInTheDocument();
  });
});
