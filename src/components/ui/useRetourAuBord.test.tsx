/**
 * Retour au glissement depuis le bord.
 *
 * Le geste a deux façons de mal tourner, et les deux se testent :
 *   - il se déclenche pendant un défilement vertical, et la page part de
 *     travers ;
 *   - il déclenche le retour sur un geste trop court, et l'application recule
 *     alors qu'on voulait juste tâter le bord.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useRetourAuBord } from './useRetourAuBord';

const LARGEUR = 390;

function Bord({ actif = true, onRetour }: { actif?: boolean; onRetour: () => void }) {
  const { props, decalage } = useRetourAuBord({ actif, onRetour });
  return (
    <div data-testid="bord" data-decalage={Math.round(decalage)} {...props}>
      écran
    </div>
  );
}

/** Glisse depuis « depuis » jusqu'à « vers », par pas, comme un vrai doigt. */
function glisser(element: HTMLElement, depuis: number, vers: number, vertical = 0) {
  fireEvent.pointerDown(element, { clientX: depuis, clientY: 100, pointerId: 1 });
  fireEvent.pointerMove(element, { clientX: vers, clientY: 100 + vertical, pointerId: 1 });
  fireEvent.pointerUp(element, { clientX: vers, clientY: 100 + vertical, pointerId: 1 });
}

beforeEach(() => {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
    left: 0,
    right: LARGEUR,
    width: LARGEUR,
    top: 0,
    bottom: 844,
    height: 844,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect);
});

afterEach(() => vi.restoreAllMocks());

describe('retour au glissement depuis le bord', () => {
  it('déclenche le retour sur un glissement franc depuis le bord', () => {
    const onRetour = vi.fn();
    render(<Bord onRetour={onRetour} />);

    glisser(screen.getByTestId('bord'), 10, 250);

    expect(onRetour).toHaveBeenCalledTimes(1);
  });

  it('ignore un geste commencé au milieu de l’écran', () => {
    const onRetour = vi.fn();
    render(<Bord onRetour={onRetour} />);

    glisser(screen.getByTestId('bord'), 200, 380);

    expect(onRetour).not.toHaveBeenCalled();
  });

  it('ignore un geste trop court : tâter le bord ne recule pas', () => {
    const onRetour = vi.fn();
    render(<Bord onRetour={onRetour} />);

    glisser(screen.getByTestId('bord'), 10, 60);

    expect(onRetour).not.toHaveBeenCalled();
  });

  it('abandonne si l’intention est verticale : c’est un défilement', () => {
    const onRetour = vi.fn();
    render(<Bord onRetour={onRetour} />);

    const bord = screen.getByTestId('bord');
    fireEvent.pointerDown(bord, { clientX: 10, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(bord, { clientX: 14, clientY: 260, pointerId: 1 });
    fireEvent.pointerUp(bord, { clientX: 14, clientY: 260, pointerId: 1 });

    expect(onRetour).not.toHaveBeenCalled();
    expect(bord.dataset.decalage).toBe('0');
  });

  it('ne suit pas le doigt au-delà du seuil : la page résiste', () => {
    const onRetour = vi.fn();
    render(<Bord onRetour={onRetour} />);

    const bord = screen.getByTestId('bord');
    fireEvent.pointerDown(bord, { clientX: 10, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(bord, { clientX: 110, clientY: 100, pointerId: 1 });
    const auSeuil = Number(bord.dataset.decalage);
    fireEvent.pointerMove(bord, { clientX: 310, clientY: 100, pointerId: 1 });
    const auBout = Number(bord.dataset.decalage);

    expect(auSeuil).toBeGreaterThan(0);
    expect(auBout - auSeuil).toBeLessThan(200 - auSeuil);
    expect(auBout).toBeLessThan(250);
  });

  it('reste inerte à la racine, où il n’y a rien derrière', () => {
    const onRetour = vi.fn();
    render(<Bord actif={false} onRetour={onRetour} />);

    glisser(screen.getByTestId('bord'), 10, 250);

    expect(onRetour).not.toHaveBeenCalled();
  });

  it('revient en place après le geste, dans tous les cas', () => {
    const onRetour = vi.fn();
    render(<Bord onRetour={onRetour} />);

    const bord = screen.getByTestId('bord');
    fireEvent.pointerDown(bord, { clientX: 10, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(bord, { clientX: 200, clientY: 100, pointerId: 1 });
    expect(Number(bord.dataset.decalage)).toBeGreaterThan(0);

    fireEvent.pointerUp(bord, { clientX: 200, clientY: 100, pointerId: 1 });
    expect(bord.dataset.decalage).toBe('0');
  });
});
