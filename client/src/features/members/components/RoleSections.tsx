import type { ReactNode } from 'react';

import { cn } from '../../../lib/cn';
import type { Role } from '../../auth/types';
import { ROLE_SECTIONS } from '../roles';

interface RoleSectionsProps<T extends { id: string; role: Role }> {
  /** In directory order (admins, ambassadors, members; by name), as the API returns them. */
  items: T[];
  /** How many match in each role across all pages; null until known. */
  counts: Record<Role, number> | null;
  renderItem: (item: T) => ReactNode;
  /** Dims the list while new results replace it. */
  dimmed?: boolean;
  /** Prefix for the section headings' ids. */
  idPrefix: string;
}

/**
 * A members list grouped under Admins, Ambassadors and Members headings with their counts.
 * Shared by the community directory and the admin panel's Community Directory. Sections
 * with nothing loaded yet are left out; "Show more" fills them in as pages arrive.
 */
export function RoleSections<T extends { id: string; role: Role }>({
  items,
  counts,
  renderItem,
  dimmed = false,
  idPrefix,
}: RoleSectionsProps<T>) {
  const groups = ROLE_SECTIONS.map((section) => ({
    ...section,
    items: items.filter((item) => item.role === section.role),
  })).filter((group) => group.items.length > 0);

  return (
    <div
      className={cn(
        'flex flex-col gap-10 transition-opacity',
        dimmed && 'opacity-60 motion-reduce:opacity-100',
      )}
    >
      {groups.map((group) => (
        <section key={group.role} aria-labelledby={`${idPrefix}-${group.role}`}>
          <h3
            id={`${idPrefix}-${group.role}`}
            className="flex items-baseline gap-3 border-b border-border pb-2 font-display text-h3"
          >
            {group.title}
            {counts && (
              <span className="font-sans text-sm text-text-muted">{counts[group.role]}</span>
            )}
          </h3>
          <ul className="mt-3 flex flex-col gap-2">
            {group.items.map((item) => (
              <li key={item.id}>{renderItem(item)}</li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
