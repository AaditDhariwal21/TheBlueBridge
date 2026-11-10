import type { ComponentPropsWithoutRef } from 'react';

import { cn } from '../../lib/cn';

export type Tone = 'default' | 'surface' | 'inverse';

const TONE_CLASS: Record<Tone, string> = {
  default: 'bg-bg',
  surface: 'bg-surface',
  inverse: 'bg-bg',
};

type SectionProps = ComponentPropsWithoutRef<'section'> & {
  tone?: Tone;
  /** Vertical rhythm. `none` lets the section control its own padding. */
  spacing?: 'section' | 'none';
};

/**
 * A full-bleed band. `inverse` switches every semantic token inside it to the
 * navy scheme (see tokens.css), so children need no tone-specific variants.
 */
export function Section({
  tone = 'default',
  spacing = 'section',
  className,
  ...props
}: SectionProps) {
  return (
    <section
      data-tone={tone === 'inverse' ? 'inverse' : undefined}
      className={cn(
        'relative isolate',
        TONE_CLASS[tone],
        spacing === 'section' && 'py-section',
        className,
      )}
      {...props}
    />
  );
}
