import { Fragment } from 'react';

import { MOTTO } from '../../app/site';
import { cn } from '../../lib/cn';

/**
 * "Connection • Community • Confluence" in spaced caps with pink separators,
 * echoing the sub-line of the hero lockup. Each separator is glued to the word
 * after it, so on narrow screens a line never ends with a dangling dot.
 */
export function Motto({ className }: { className?: string }) {
  return (
    <p className={cn('text-xs tracking-caps text-text-subtle uppercase', className)}>
      {MOTTO.map((word, i) => (
        <Fragment key={word}>
          {/* Real spaces between groups keep the words separate for screen readers. */}
          {i > 0 && ' '}
          <span className="whitespace-nowrap">
            {i > 0 && (
              <span aria-hidden="true" className="mr-2 text-accent-2-soft">
                •
              </span>
            )}
            {word}
          </span>
        </Fragment>
      ))}
    </p>
  );
}
