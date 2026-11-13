import { useEffect, useRef, type ReactNode } from 'react';

import { cn } from '../../lib/cn';

const VARIANTS = {
  /** A centred panel. */
  popup:
    'sm:m-auto sm:h-fit sm:max-h-[min(90dvh,48rem)] sm:w-[calc(100%-3rem)] sm:max-w-narrow sm:border',
  /** A full-height panel along the right edge. */
  drawer:
    'sm:my-0 sm:mr-0 sm:ml-auto sm:h-dvh sm:max-h-none sm:w-full sm:max-w-reading sm:border-l',
} as const;

interface DialogProps {
  open: boolean;
  /** Asked to close: Escape, a click outside, or a close button inside. */
  onClose: () => void;
  /** The id of the dialog's heading, which names it. */
  labelledBy: string;
  variant?: keyof typeof VARIANTS;
  /** False while the dialog must stay open (e.g. saving): Escape and outside clicks do nothing. */
  dismissible?: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * A modal on the native <dialog>, shown with showModal():
 * - the page behind is inert, so focus stays inside (and Tab cycles within it);
 * - Escape and a click on the backdrop ask to close;
 * - the page behind does not scroll (`html:has(dialog[open])` in index.css);
 * - focus returns to whatever had it when the dialog opened.
 * On phones it is a bottom sheet; from `sm` up, a centred popup or a side drawer.
 */
export function Dialog({
  open,
  onClose,
  labelledBy,
  variant = 'popup',
  dismissible = true,
  className,
  children,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const returnFocusTo = useRef<HTMLElement | null>(null);
  // Read from listeners without re-subscribing them.
  const latest = useRef({ onClose, dismissible, open });
  useEffect(() => {
    latest.current = { onClose, dismissible, open };
  });

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      returnFocusTo.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // A backdrop click lands on the <dialog> itself (its content fills the box). Both the press
  // and the release must be there, so selecting text and releasing outside doesn't close it.
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    let pressedOnBackdrop = false;
    const onPointerDown = (event: PointerEvent) => {
      pressedOnBackdrop = event.target === dialog;
    };
    const onClick = (event: MouseEvent) => {
      if (pressedOnBackdrop && event.target === dialog && latest.current.dismissible) {
        latest.current.onClose();
      }
      pressedOnBackdrop = false;
    };
    dialog.addEventListener('pointerdown', onPointerDown);
    dialog.addEventListener('click', onClick);
    return () => {
      dialog.removeEventListener('pointerdown', onPointerDown);
      dialog.removeEventListener('click', onClick);
    };
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      onCancel={(event) => {
        // Escape: the parent decides (it owns `open`).
        event.preventDefault();
        if (latest.current.dismissible) latest.current.onClose();
      }}
      onClose={() => {
        // Also reached if the browser force-closes it; keep the parent's state in step.
        if (latest.current.open) latest.current.onClose();
        returnFocusTo.current?.focus();
      }}
      className={cn(
        'mx-0 mt-auto mb-0 h-fit max-h-[90dvh] w-full max-w-none border-border bg-bg p-0 text-text',
        'backdrop:bg-primary/60 open:flex open:flex-col',
        VARIANTS[variant],
        className,
      )}
    >
      <div className="flex min-h-0 flex-1 flex-col motion-safe:animate-sheet">{children}</div>
    </dialog>
  );
}
