import type { ReactNode } from 'react';

import { CategoryDot } from '../../../components/ui/CategoryDot';
import type { MemberProfile } from '../types';

const MONTH_YEAR = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' });

const LINK =
  'text-text underline decoration-accent-soft underline-offset-4 wrap-anywhere hover:decoration-text';

/** A profile's details as a definition list: contact, categories, joined. */
export function ProfileDetails({
  profile,
  extra = [],
  omitOccupation = false,
}: {
  profile: MemberProfile;
  /** Further rows, e.g. an admin's view of status. */
  extra?: [string, ReactNode][];
  /** When the occupation is already shown above the details. */
  omitOccupation?: boolean;
}) {
  const rows: [string, ReactNode][] = [
    [
      'Phone',
      <a key="phone" href={`tel:${profile.phoneNumber}`} className={LINK}>
        {profile.phoneNumber}
      </a>,
    ],
    [
      'Email',
      profile.email ? (
        <a key="email" href={`mailto:${profile.email}`} className={LINK}>
          {profile.email}
        </a>
      ) : (
        '—'
      ),
    ],
  ];
  if (!omitOccupation) rows.unshift(['Occupation', profile.occupation]);
  if (profile.role === 'ambassador' && profile.categories.length > 0) {
    rows.push([
      'Ambassador for',
      <span key="categories" className="flex flex-wrap gap-x-4 gap-y-1">
        {profile.categories.map((category) => (
          <span key={category.id} className="inline-flex items-center gap-1.5">
            <CategoryDot color={category.color} />
            {category.name}
          </span>
        ))}
      </span>,
    ]);
  }
  rows.push(['Joined', MONTH_YEAR.format(new Date(profile.joinedAt))], ...extra);

  return (
    <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[auto_1fr]">
      {rows.map(([term, detail]) => (
        <div key={term} className="contents">
          <dt className="text-text-muted">{term}</dt>
          <dd className="-mt-2 min-w-0 sm:mt-0">{detail}</dd>
        </div>
      ))}
    </dl>
  );
}
