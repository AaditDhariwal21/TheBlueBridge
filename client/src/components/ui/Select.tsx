import type { ComponentPropsWithRef } from 'react';

import { cn } from '../../lib/cn';

/**
 * A native <select>, underlined like <Input>. For long lists (countries, dialling codes):
 * phones open their own picker and every browser offers type-to-find, which a custom
 * listbox (SelectMenu) can't match at this length. 16px text so iOS doesn't zoom.
 */
export function Select({ className, children, ...props }: ComponentPropsWithRef<'select'>) {
  return (
    <div className={cn('relative', className)}>
      <select
        className={cn(
          'w-full appearance-none truncate border-0 border-b border-border-strong bg-transparent py-2.5 pr-7 pl-1 text-base text-text',
          'transition-colors hover:border-text focus:border-text aria-invalid:border-danger',
        )}
        {...props}
      >
        {children}
      </select>
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        className="pointer-events-none absolute top-1/2 right-1 size-4 -translate-y-1/2 text-text-muted"
      >
        <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    </div>
  );
}
