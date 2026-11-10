import type { ComponentPropsWithRef } from 'react';

import { cn } from '../../lib/cn';

/**
 * Underlined text input, as in the reference, with a 3:1+ underline
 * (border-strong). Text is 16px so iOS Safari doesn't zoom on focus.
 */
export function Input({ className, type = 'text', ...props }: ComponentPropsWithRef<'input'>) {
  return (
    <input
      type={type}
      className={cn(
        'w-full border-0 border-b border-border-strong bg-transparent px-1 py-2.5 text-base text-text',
        'transition-colors placeholder:text-text-subtle hover:border-text focus:border-text',
        'aria-invalid:border-danger',
        className,
      )}
      {...props}
    />
  );
}
