import { memo, useMemo } from 'react';

import { CATEGORY_INK_TEXT, CATEGORY_TINT_SOFT_BG } from '../../../../lib/categoryColor';
import { cn } from '../../../../lib/cn';
import { hashString } from '../../../../lib/hash';
import type { Category } from '../../model/types';

interface BlogThumbProps {
  /** The blog's first category: its tint and ink colour the drawing. */
  category: Category | undefined;
  /** Varies the drawing (the blog's id), so neighbouring rows look related, not identical. */
  seed: string;
  /** A real image, when blogs get one. Nothing sends this yet; the slot is reserved. */
  imageUrl?: string | null | undefined;
  /** Sizing comes from the caller, so the slot never shifts when it renders. */
  className?: string;
}

interface Arch {
  d: string;
  pier: number;
}

/*
 * Drawing data in a 120×80 (3:2) viewBox, cropped to fill square slots. A quiet flat tint, a deck,
 * two to four bridge arches in the category's ink, faint water lines and sometimes a sun or
 * moon. Every variation comes from a hash of the seed.
 */
function geometry(seed: string) {
  const h = hashString(seed);
  const pick = (shift: number, options: number) => (h >>> shift) % options;
  const count = 2 + pick(0, 3);
  const deck = 46 + pick(2, 3) * 3;
  const start = -6 - pick(4, 3) * 4;
  const span = (132 - start) / count;
  const rise = 13 + pick(6, 4) * 2;
  const arches: Arch[] = Array.from({ length: count }, (_, i) => {
    const x0 = start + i * span;
    const x1 = x0 + span;
    const lift = i % 2 === pick(9, 2) ? rise : rise - 4;
    return { d: `M${x0} ${deck} Q${(x0 + x1) / 2} ${deck - lift * 2} ${x1} ${deck}`, pier: x1 };
  });
  const water = [0, 1, 2].map((i) => {
    const y = deck + 12 + i * 7;
    const x = 10 + ((h >>> (12 + i * 3)) % 50);
    return `M${x} ${y} h${18 + i * 6}`;
  });
  const sun =
    pick(14, 3) > 0 ? { cx: 18 + pick(16, 84), cy: 14 + pick(20, 8), r: 5 + pick(23, 3) } : null;
  return { deck, arches, water, sun };
}

/** A blog's thumbnail: its image when there is one, otherwise category line art. Decorative. */
export const BlogThumb = memo(function BlogThumb({
  category,
  seed,
  imageUrl,
  className,
}: BlogThumbProps) {
  const art = useMemo(() => geometry(seed), [seed]);
  const color = category?.color ?? 'blue';

  return (
    <span
      aria-hidden="true"
      className={cn(
        'block shrink-0 overflow-hidden',
        CATEGORY_TINT_SOFT_BG[color],
        CATEGORY_INK_TEXT[color],
        className,
      )}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          loading="lazy"
          decoding="async"
          className="size-full object-cover"
        />
      ) : (
        <svg
          viewBox="0 0 120 80"
          preserveAspectRatio="xMidYMid slice"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          opacity="0.6"
          className="size-full"
        >
          {art.sun && (
            <circle
              cx={art.sun.cx}
              cy={art.sun.cy}
              r={art.sun.r}
              fill="currentColor"
              stroke="none"
              opacity="0.12"
            />
          )}
          {art.water.map((d) => (
            <path key={d} d={d} strokeWidth="1" vectorEffect="non-scaling-stroke" opacity="0.25" />
          ))}
          {art.arches.map((arch) => (
            <path key={arch.d} d={arch.d} strokeWidth="1.25" vectorEffect="non-scaling-stroke" />
          ))}
          {art.arches.slice(0, -1).map((arch) => (
            <path
              key={arch.pier}
              d={`M${arch.pier} ${art.deck} V${art.deck + 9}`}
              strokeWidth="1.25"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          <path d={`M-4 ${art.deck} H124`} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        </svg>
      )}
    </span>
  );
});
