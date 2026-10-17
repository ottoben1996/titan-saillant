/**
 * La feuille « Je ne peux pas faire cet exercice ».
 *
 * Trois issues vivaient en pastilles voisines dans la rangée d'actions : deux
 * d'entre elles menaient à des résultats opposés — décaler l'exercice ou
 * l'abandonner. Ce qui doit tenir ici :
 *
 *  1. chaque issue dit sa conséquence, et un appui déclenche la bonne ;
 *  2. l'option « machine indisponible » disparaît quand le mouvement n'a pas
 *     d'alternative documentée — on ne propose pas un remplacement inexistant ;
 *  3. la feuille se referme avant d'agir, sinon elle resterait par-dessus l'écran
 *     que l'action vient de changer.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ImpossibleSheet } from './ImpossibleSheet';

const ouvrir = (props: Partial<Parameters<typeof ImpossibleSheet>[0]> = {}) => {
  const onOpenChange = vi.fn();
  const onDefer = vi.fn();
  const onAlternative = vi.fn();
  const onSkip = vi.fn();
  render(
    <ImpossibleSheet
      open
      onOpenChange={onOpenChange}
      exerciseName="Presse à cuisse inclinée"
      alternativeDisponible={false}
      onDefer={onDefer}
      onAlternative={onAlternative}
      onSkip={onSkip}
      {...props}
    />,
  );
  return { onOpenChange, onDefer, onAlternative, onSkip };
};

describe('feuille « Je ne peux pas faire cet exercice »', () => {
  it('dit la conséquence de chaque issue', () => {
    ouvrir({ alternativeDisponible: true });

    expect(screen.getByText(/la machine est prise/i)).toBeInTheDocument();
    expect(screen.getByText(/séries intactes/i)).toBeInTheDocument();
    expect(screen.getByText(/la machine est indisponible/i)).toBeInTheDocument();
    expect(screen.getByText(/je passe pour aujourd/i)).toBeInTheDocument();
    expect(screen.getByText(/ne comptent pas dans la séance/i)).toBeInTheDocument();
  });

  it('cache le remplacement quand il n’existe pas', () => {
    ouvrir({ alternativeDisponible: false });

    expect(screen.queryByText(/la machine est indisponible/i)).toBeNull();
    // Les deux issues qui restent, elles, sont toujours là.
    expect(screen.getByText(/la machine est prise/i)).toBeInTheDocument();
    expect(screen.getByText(/je passe pour aujourd/i)).toBeInTheDocument();
  });

  it('referme la feuille avant d’agir', () => {
    const { onOpenChange, onDefer } = ouvrir();

    fireEvent.click(screen.getByRole('button', { name: /la machine est prise/i }));

    expect(onDefer).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
    // La fermeture passe avant l'action : c'est elle qui libère l'écran.
    const ordre = onOpenChange.mock.invocationCallOrder[0] ?? 0;
    expect(ordre).toBeLessThan(onDefer.mock.invocationCallOrder[0] ?? Number.MAX_SAFE_INTEGER);
  });

  it('aiguille chaque issue vers sa propre action', () => {
    const { onDefer, onAlternative, onSkip } = ouvrir({ alternativeDisponible: true });

    fireEvent.click(screen.getByRole('button', { name: /la machine est indisponible/i }));
    expect(onAlternative).toHaveBeenCalledTimes(1);
    expect(onDefer).not.toHaveBeenCalled();
    expect(onSkip).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /je passe pour aujourd/i }));
    expect(onSkip).toHaveBeenCalledTimes(1);
    expect(onDefer).not.toHaveBeenCalled();
  });
});
