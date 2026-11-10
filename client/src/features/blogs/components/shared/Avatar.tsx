import { cn } from '../../../../lib/cn';
import type { User } from '../../model/types';

/** Brand-only colourways, each with AA contrast for the initials. */
const TONES = [
  'bg-primary text-on-primary',
  'bg-accent-soft text-primary',
  'bg-accent-2 text-on-primary',
  'bg-accent text-on-primary',
  'bg-accent-2-soft text-primary',
] as const;

const SIZES = {
  sm: 'size-7 text-xs',
  md: 'size-9 text-xs',
  lg: 'size-11 text-sm',
} as const;

export type AvatarSize = keyof typeof SIZES;

/** Deterministic: the same person always gets the same colour. */
function toneFor(id: string): string {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return TONES[Math.abs(hash) % TONES.length] ?? TONES[0];
}

interface AvatarProps {
  user: Pick<User, 'id' | 'initials'>;
  size?: AvatarSize;
  className?: string;
}

/**
 * Initials avatar. Decorative: the person's name is always printed beside it,
 * so it is hidden from assistive tech rather than announced twice.
 */
export function Avatar({ user, size = 'md', className }: AvatarProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid shrink-0 place-items-center rounded-full font-medium select-none',
        SIZES[size],
        toneFor(user.id),
        className,
      )}
    >
      {user.initials}
    </span>
  );
}
