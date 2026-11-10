import { useId } from 'react';

import { cn } from '../../lib/cn';

/**
 * Decorative star network echoing the hero artwork. Pure SVG + CSS: no
 * images, no JS animation. Stars twinkle only when motion is allowed.
 * Coordinates are drawing data in a 1200×400 viewBox, not layout values.
 */

type Star = readonly [x: number, y: number, r: number, tone: 'blue' | 'pink'];

const LEFT: readonly Star[] = [
  [30, 250, 1.6, 'blue'],
  [95, 140, 2.4, 'blue'],
  [160, 215, 1.8, 'pink'],
  [220, 90, 2.8, 'pink'],
  [280, 165, 1.6, 'blue'],
  [200, 310, 2.2, 'pink'],
  [75, 340, 1.4, 'blue'],
];

// Mirrors the left cluster loosely; the centre stays clear for content.
const RIGHT: readonly Star[] = [
  [920, 120, 1.8, 'pink'],
  [980, 210, 2.6, 'blue'],
  [1040, 100, 1.6, 'blue'],
  [1105, 180, 2.8, 'pink'],
  [1170, 110, 1.6, 'blue'],
  [1075, 300, 2, 'blue'],
  [1150, 330, 1.4, 'pink'],
];

const pathFor = (stars: readonly Star[]) =>
  stars.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x} ${y}`).join(' ');

const TWINKLE_DELAYS = ['0s', '1.3s', '2.6s', '0.7s', '2s', '3.2s', '1.8s'];

export function Constellation({ className }: { className?: string }) {
  // Unique per instance (several may share a page); strip chars invalid in url(#id).
  const glowId = `glow-${useId().replace(/[^\w-]/g, '')}`;
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 1200 400"
      preserveAspectRatio="xMidYMid slice"
      className={cn('pointer-events-none absolute inset-0 -z-10 size-full', className)}
    >
      <defs>
        <radialGradient id={glowId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" className="[stop-color:var(--color-accent-soft)]" stopOpacity="0.16" />
          <stop offset="100%" className="[stop-color:var(--color-accent-soft)]" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="600" cy="200" rx="520" ry="220" fill={`url(#${glowId})`} />

      {[LEFT, RIGHT].map((stars, side) => (
        <g key={side}>
          <path
            d={pathFor(stars)}
            fill="none"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
            className="stroke-accent-soft opacity-20"
          />
          {stars.map(([x, y, r, tone], i) => (
            <circle
              key={`${x}-${y}`}
              cx={x}
              cy={y}
              r={r}
              className={cn(
                tone === 'blue' ? 'fill-accent-soft' : 'fill-accent-2-soft',
                r > 2.3 && 'motion-safe:animate-twinkle',
              )}
              style={{ animationDelay: TWINKLE_DELAYS[i % TWINKLE_DELAYS.length] }}
            />
          ))}
        </g>
      ))}
    </svg>
  );
}
