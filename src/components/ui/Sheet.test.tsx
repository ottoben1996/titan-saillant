import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from './Sheet';

function ControlledSheet({ onOpenChange }: { onOpenChange?: (open: boolean) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        onOpenChange?.(next);
      }}
    >
      <button type="button" onClick={() => setOpen(true)}>
        Ouvrir
      </button>
      <SheetContent>
        <SheetTitle>Détail de l&apos;exercice</SheetTitle>
        <SheetDescription>Description du mouvement</SheetDescription>
        <p>Contenu de la feuille</p>
      </SheetContent>
    </Sheet>
  );
}

describe('Sheet', () => {
  it('relie le titre à la feuille via aria-labelledby', async () => {
    const onOpenChange = vi.fn();
    render(<ControlledSheet onOpenChange={onOpenChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir' }));

    // Le nom accessible provient du titre -> aria-labelledby fonctionne.
    const dialog = await screen.findByRole('dialog', { name: "Détail de l'exercice" });
    const title = screen.getByText("Détail de l'exercice");
    expect(dialog).toHaveAttribute('aria-labelledby', title.id);
    expect(title.id).toBeTruthy();
  });

  it("place le focus dans la feuille à l'ouverture", async () => {
    const onOpenChange = vi.fn();
    render(<ControlledSheet onOpenChange={onOpenChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir' }));
    const dialog = await screen.findByRole('dialog');

    await waitFor(() => expect(document.activeElement).toBe(dialog));
  });

  it('expose une cible de fermeture nommée', async () => {
    const onOpenChange = vi.fn();
    render(<ControlledSheet onOpenChange={onOpenChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir' }));
    await screen.findByRole('dialog');

    expect(screen.getByRole('button', { name: 'Fermer' })).toBeInTheDocument();
  });

  it('se ferme avec la touche Échap', async () => {
    const onOpenChange = vi.fn();
    render(<ControlledSheet onOpenChange={onOpenChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir' }));
    await screen.findByRole('dialog');

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("se ferme au clic sur l'overlay", async () => {
    const onOpenChange = vi.fn();
    const { container } = render(<ControlledSheet onOpenChange={onOpenChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir' }));
    await screen.findByRole('dialog');
    // Radix n'écoute « pointerdown » qu'après un tick (setTimeout 0), et la
    // fermeture modale est différée au « click » qui suit le pointerdown.
    await new Promise((resolve) => setTimeout(resolve, 20));

    const overlay = container.ownerDocument.querySelector('.sheet-overlay');
    expect(overlay).not.toBeNull();
    fireEvent.pointerDown(overlay as Element, { button: 0 });
    fireEvent.click(overlay as Element);

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
