import type { ReactNode } from 'react';

import { CategoryDot } from '../../../components/ui/CategoryDot';
import { ROLE_LABELS } from '../labels';
import type { Me } from '../types';

/** The facts of an account as a definition list. */
export function AccountSummary({ me, roleLabel }: { me: Me; roleLabel: string }) {
  const rows: [string, ReactNode][] = [
    ['Name', me.name],
    ['Email', me.email ?? '—'],
    ['Occupation', me.occupation],
    [roleLabel, ROLE_LABELS[me.role]],
  ];
  if (me.role === 'ambassador') {
    rows.push([
      'Categories',
      me.categories.length === 0 ? (
        '—'
      ) : (
        <span className="flex flex-wrap gap-x-4 gap-y-1">
          {me.categories.map((category) => (
            <span key={category.id} className="inline-flex items-center gap-1.5">
              <CategoryDot color={category.color} />
              {category.name}
            </span>
          ))}
        </span>
      ),
    ]);
  }

  return (
    <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[auto_1fr]">
      {rows.map(([term, detail]) => (
        <div key={term} className="contents">
          <dt className="text-text-muted">{term}</dt>
          <dd className="-mt-2 wrap-break-word sm:mt-0">{detail}</dd>
        </div>
      ))}
    </dl>
  );
}
