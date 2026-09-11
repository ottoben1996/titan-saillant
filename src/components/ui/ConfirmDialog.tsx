import { useEffect, useRef } from 'react';

/**
 * Confirmation dans l'application, à la place du `window.confirm` du navigateur.
 *
 * Le dialogue natif sort du design system, affiche l'origine du site et se
 * comporte différemment selon le navigateur — visible surtout sur mobile où il
 * bloque toute la page. Ce composant reprend le motif des feuilles modales de
 * l'application : deux actions explicites, la plus sûre mise en avant.
 */

interface ConfirmDialogProps {
  eyebrow?: string;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  eyebrow,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    confirmRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onCancel]);

  return (
    <div
      className="modal-backdrop confirm-backdrop"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
    >
      <div className="tutorial-modal confirm-dialog">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2 id="confirm-dialog-title">{title}</h2>
        <p id="confirm-dialog-description">{description}</p>
        <div className="exit-actions">
          <button ref={confirmRef} type="button" className="primary-button full" onClick={onConfirm}>
            {confirmLabel}
          </button>
          <button type="button" className="secondary-button full" onClick={onCancel}>
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
