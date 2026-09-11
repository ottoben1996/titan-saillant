import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from './Icons';

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;
export const SheetPortal = DialogPrimitive.Portal;

export interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  side?: 'bottom' | 'top';
  onClose?: () => void;
  showClose?: boolean;
}

export const SheetOverlay = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className = '', ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={`sheet-overlay ${className}`.trim()}
    {...props}
  />
));
SheetOverlay.displayName = 'SheetOverlay';

export const SheetContent = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Content>,
  SheetContentProps
>(
  (
    {
      side = 'bottom',
      className = '',
      children,
      onClose,
      showClose = true,
      onOpenAutoFocus,
      ...props
    },
    ref
  ) => (
    <SheetPortal>
      <SheetOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={`sheet-content sheet-${side} ${className}`.trim()}
        // Le conteneur est focusable pour que le focus soit toujours DANS la
        // feuille à l'ouverture (utile aussi quand showClose=false).
        tabIndex={-1}
        onOpenAutoFocus={(event) => {
          if (onOpenAutoFocus) {
            onOpenAutoFocus(event);
            return;
          }
          event.preventDefault();
          (event.target as HTMLElement | null)?.focus?.();
        }}
        {...props}
      >
        <div className="sheet-drag-handle" aria-hidden="true" />
        {showClose && (
          <DialogPrimitive.Close
            className="sheet-close-btn"
            onClick={onClose}
            aria-label="Fermer"
          >
            <X size={20} />
          </DialogPrimitive.Close>
        )}
        {children}
      </DialogPrimitive.Content>
    </SheetPortal>
  )
);
SheetContent.displayName = 'SheetContent';

export const SheetHeader = ({
  className = '',
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`sheet-header ${className}`.trim()} {...props} />
);
SheetHeader.displayName = 'SheetHeader';

export const SheetTitle = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className = '', ...props }, ref) => (
  <DialogPrimitive.Title ref={ref} className={`sheet-title ${className}`.trim()} {...props} />
));
SheetTitle.displayName = 'SheetTitle';

export const SheetDescription = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className = '', ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={`sheet-description ${className}`.trim()}
    {...props}
  />
));
SheetDescription.displayName = 'SheetDescription';
