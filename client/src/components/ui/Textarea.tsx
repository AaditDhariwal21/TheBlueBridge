import type { ComponentPropsWithRef } from 'react';

import { cn } from '../../lib/cn';

/**
 * Multi-line text field. Boxed rather than underlined (unlike <Input>) so a
 * long draft reads as a writing surface. 16px text so iOS doesn't zoom;
 * border-strong gives the 3:1 control contrast.
 */
export function Textarea({ className, ...props }: ComponentPropsWithRef<'textarea'>) {
  return (
    <textarea
      className={cn(
        'block w-full resize-y border border-border-strong bg-surface px-3 py-2.5 text-base text-text',
        'transition-colors placeholder:text-text-subtle hover:border-text focus:border-text',
        'aria-invalid:border-danger',
        className,
      )}
      {...props}
    />
  );
}
