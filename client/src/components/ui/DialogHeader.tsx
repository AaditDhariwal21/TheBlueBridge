import type { ReactNode } from 'react';

import { cn } from '../../lib/cn';

interface DialogHeaderProps {
  /** The heading's id: pass the same id to the Dialog's `labelledBy`. */
  id: string;
  title: ReactNode;
  onClose: () => void;
  /** Disables the close button (e.g. while saving). */
  closeDisabled?: boolean;
  className?: string;
}

/** A dialog's title bar: heading and a close button, with a hairline below. */
export function DialogHeader({
  id,
  title,
  onClose,
  closeDisabled = false,
  className,
}: DialogHeaderProps) {
  return (
    <header
      className={cn(
        'flex shrink-0 items-center gap-2 border-b border-border py-2 pr-2 pl-gutter sm:py-3 sm:pl-6',
        className,
      )}
    >
      <h2 id={id} className="min-w-0 flex-1 text-h3 wrap-break-word">
        {title}
      </h2>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        aria-disabled={closeDisabled || undefined}
        className="grid size-11 shrink-0 place-items-center text-text-muted transition-colors hover:text-text aria-disabled:opacity-50"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none">
          <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>
    </header>
  );
}
