import { useState } from 'react';

import { cn } from '../../lib/cn';

/**
 * Soft brand tints for the initials fallback: the palette's blue and pink at two strengths, and
 * the warm hairline. Navy initials on each are 7:1 or better.
 */
const TONES = [
  'bg-accent-soft/35 text-primary',
  'bg-accent-2-soft/35 text-primary',
  'bg-accent-soft/70 text-primary',
  'bg-accent-2-soft/70 text-primary',
  'bg-border text-primary',
] as const;

const SIZES = {
  sm: 'size-7 text-xs',
  md: 'size-9 text-xs',
  lg: 'size-11 text-sm',
  xl: 'size-14 text-base',
} as const;

export type AvatarSize = keyof typeof SIZES;

/** Deterministic: the same person always gets the same colour. */
function toneFor(id: string): string {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return TONES[Math.abs(hash) % TONES.length] ?? TONES[0];
}

interface AvatarProps {
  user: { id: string; initials: string };
  /** Profile photo (https). Falls back to the initials if missing or if it fails to load. */
  src?: string | null | undefined;
  size?: AvatarSize;
  className?: string;
}

/**
 * Photo or initials avatar. Decorative: the person's name is always printed beside it,
 * so it is hidden from assistive tech rather than announced twice.
 */
export function Avatar({ user, src, size = 'md', className }: AvatarProps) {
  const [failed, setFailed] = useState<string | null>(null);
  const photo = src && src !== failed ? src : null;
  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid shrink-0 place-items-center overflow-hidden rounded-full font-medium select-none',
        SIZES[size],
        toneFor(user.id),
        className,
      )}
    >
      {photo ? (
        <img
          src={photo}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => {
            setFailed(photo);
          }}
          className="size-full object-cover"
        />
      ) : (
        user.initials
      )}
    </span>
  );
}
