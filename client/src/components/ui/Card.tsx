import type { ComponentPropsWithoutRef } from 'react';

import { cn } from '../../lib/cn';

const ACCENTS = {
  blue: 'border-t-accent-soft',
  pink: 'border-t-accent-2-soft',
} as const;

type CardProps = ComponentPropsWithoutRef<'div'> & {
  /** Optional 2px top rule in one of the brand accents. */
  accent?: keyof typeof ACCENTS;
};

/** A square, borderless-shadow surface panel. */
export function Card({ accent, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'border border-border bg-surface p-6 sm:p-8',
        accent && cn('border-t-2', ACCENTS[accent]),
        className,
      )}
      {...props}
    />
  );
}
