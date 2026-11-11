import type { ReactNode } from 'react';

import { cn } from '../../lib/cn';

interface StateMessageProps {
  title: string;
  children?: ReactNode;
  /** Buttons or links offered as the next step. */
  action?: ReactNode;
  /** `alert` announces errors at once; `status` is polite. Omit for static empty states. */
  role?: 'alert' | 'status';
  headingLevel?: 'h1' | 'h2' | 'h3';
  className?: string;
}

/** Empty, error and not-found states share one calm, centred layout. */
export function StateMessage({
  title,
  children,
  action,
  role,
  headingLevel: Heading = 'h2',
  className,
}: StateMessageProps) {
  return (
    <div
      role={role}
      className={cn(
        'flex flex-col items-center gap-3 border border-dashed border-border px-6 py-12 text-center',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="h-px w-12 bg-linear-to-r from-accent-soft to-accent-2-soft"
      />
      <Heading className="text-h3">{title}</Heading>
      {children && <div className="max-w-narrow text-sm text-text-muted">{children}</div>}
      {action && <div className="mt-2 flex flex-wrap justify-center gap-3">{action}</div>}
    </div>
  );
}
