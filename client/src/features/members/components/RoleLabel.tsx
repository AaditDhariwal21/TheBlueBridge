import { cn } from '../../../lib/cn';
import { ROLE_LABELS } from '../../auth/labels';
import type { Role } from '../../auth/types';

/** Full class names, so Tailwind finds them. */
const TONE: Record<Role, string> = {
  admin: 'text-accent-2',
  ambassador: 'text-accent',
  member: 'text-text-muted',
};

/** A person's role as small spaced capitals in the role's colour (no box). */
export function RoleLabel({ role, className }: { role: Role; className?: string }) {
  return (
    <span
      className={cn(
        'text-xs font-medium tracking-caps whitespace-nowrap uppercase',
        TONE[role],
        className,
      )}
    >
      {ROLE_LABELS[role]}
    </span>
  );
}
