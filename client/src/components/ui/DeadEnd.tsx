import type { ReactNode } from 'react';

import { cn } from '../../lib/cn';

interface DeadEndProps {
  /** Small capitals above the heading, e.g. "404". */
  eyebrow?: string;
  title: string;
  /** `h1` when this is the page's main content. */
  headingLevel?: 'h1' | 'h2';
  /** `page` for a whole page; `inline` inside a column (a missing blog). */
  size?: 'page' | 'inline';
  children: ReactNode;
  /** The ways out: buttons or links. */
  actions: ReactNode;
  className?: string;
}

/**
 * "This bridge doesn't lead anywhere": the not-found and no-access states. A small drawing of
 * a bridge that stops mid-air, a heading, a line or two, and the ways out.
 */
export function DeadEnd({
  eyebrow,
  title,
  headingLevel: Heading = 'h2',
  size = 'inline',
  children,
  actions,
  className,
}: DeadEndProps) {
  const page = size === 'page';
  return (
    <div
      className={cn(
        'flex flex-col items-center text-center',
        !page && 'border border-border bg-surface px-6 py-10 sm:px-10 sm:py-14',
        className,
      )}
    >
      <BrokenBridge
        className={cn('w-full', page ? 'max-w-80 sm:max-w-104' : 'max-w-64 sm:max-w-72')}
      />
      {eyebrow && <p className="mt-8 text-xs tracking-caps text-text-muted uppercase">{eyebrow}</p>}
      <Heading
        id={Heading === 'h1' ? 'page-title' : undefined}
        className={cn(
          'tracking-tight wrap-break-word',
          eyebrow ? 'mt-3' : 'mt-8',
          page ? 'text-h1' : 'text-h2',
        )}
      >
        {title}
      </Heading>
      <div className={cn('mt-4 max-w-narrow text-text-muted', page && 'text-lg')}>{children}</div>
      <div className="mt-8 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
        {actions}
      </div>
    </div>
  );
}

/*
 * Drawing data in a 320×150 viewBox, not layout values. A left bank and one tower; the deck and
 * its cable run out over the water and stop. Two pieces of the deck hang below the break, and
 * the rest of the span is only a dotted line toward a far star.
 */
const HANGERS = [
  [113.6, 68],
  [135.2, 84.4],
  [156.8, 95.2],
] as const;

function BrokenBridge({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 320 150"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Far bank's stars: the place the bridge was meant to reach. */}
      <path d="M244 40 L268 58 L298 32" strokeWidth="1" className="stroke-accent-soft opacity-40" />
      <circle cx="244" cy="40" r="2" className="fill-accent-soft motion-safe:animate-twinkle" />
      <circle
        cx="268"
        cy="58"
        r="2.6"
        className="fill-accent-2-soft motion-safe:animate-twinkle"
        style={{ animationDelay: '1.2s' }}
      />
      <circle
        cx="298"
        cy="32"
        r="1.8"
        className="fill-accent-soft motion-safe:animate-twinkle"
        style={{ animationDelay: '2.4s' }}
      />

      {/* Water. */}
      <path d="M14 132 H306" strokeWidth="1" className="stroke-border-strong opacity-40" />
      <path
        d="M118 140 H170 M214 140 H252"
        strokeWidth="1"
        className="stroke-border-strong opacity-25"
      />

      {/* Left bank and the start of the deck. */}
      <path d="M14 132 V104 H58 L70 132" strokeWidth="1.5" className="stroke-primary" />
      <path
        d="M58 104 H190 L193 100.5 L196 106 L199 101.5 L201 104"
        strokeWidth="2"
        className="stroke-primary"
      />
      <path d="M70 109 H186 L189 112" strokeWidth="1" className="stroke-primary opacity-60" />

      {/* Tower, back stay and main cable. */}
      <path
        d="M87 104 L90 42 M97 104 L94 42 M90 42 H94 M88.5 62 H95.5"
        strokeWidth="1.5"
        className="stroke-primary"
      />
      <path d="M60 104 Q70 70 91 44" strokeWidth="1.25" className="stroke-primary" />
      <path d="M93 44 Q146 108 196 100" strokeWidth="1.25" className="stroke-primary" />
      {HANGERS.map(([x, y]) => (
        <path key={x} d={`M${x} ${y} V104`} strokeWidth="1" className="stroke-primary opacity-60" />
      ))}

      {/* Pieces that fell from the break. */}
      <path d="M204 118 l9 2" strokeWidth="2" className="stroke-accent-2" />
      <path d="M212 128 l6 -2" strokeWidth="2" className="stroke-accent" />

      {/* Where the rest of the span should be. */}
      <path
        d="M210 104 H286"
        strokeWidth="1.5"
        strokeDasharray="1 7"
        className="stroke-accent-soft motion-safe:animate-twinkle"
      />
      <circle cx="296" cy="104" r="3" className="fill-accent-2-soft" />
    </svg>
  );
}
