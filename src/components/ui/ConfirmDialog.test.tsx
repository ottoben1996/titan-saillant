import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmDialog } from './ConfirmDialog';

describe('dialogue de confirmation dans l’application', () => {
  it('expose un dialogue accessible avec ses deux actions', () => {
    render(
      <ConfirmDialog
        eyebrow="ESPACE PERSONNEL"
        title="Changer de profil ?"
        description="Tes données resteront séparées."
        confirmLabel="Changer de profil"
        cancelLabel="Rester ici"
        onConfirm={() => undefined}
        onCancel={() => undefined}
      />,
    );

    const dialog = screen.getByRole('alertdialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(screen.getByRole('heading', { name: 'Changer de profil ?' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Changer de profil' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Rester ici' })).toBeTruthy();
  });

  it('déclenche l’action confirmée', () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        title="Confirmer"
        description="Description"
        confirmLabel="Oui"
        cancelLabel="Non"
        onConfirm={onConfirm}
        onCancel={() => undefined}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Oui' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('se ferme avec Échap sans confirmer', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        title="Confirmer"
        description="Description"
        confirmLabel="Oui"
        cancelLabel="Non"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
