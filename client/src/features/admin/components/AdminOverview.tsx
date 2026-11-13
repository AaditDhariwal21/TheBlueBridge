import { Link } from 'react-router';

import { Button } from '../../../components/ui/Button';
import { buttonClasses } from '../../../components/ui/buttonClasses';
import { Card } from '../../../components/ui/Card';
import { Skeleton } from '../../../components/ui/Skeleton';
import { useAsync } from '../../../lib/useAsync';
import { plural } from '../../blogs/lib/text';
import { fetchOverview } from '../api';
import { ADMIN_PATH, pendingMembersPath } from '../paths';

const QUICK_LINKS = [
  {
    to: `${ADMIN_PATH}/members`,
    title: 'Community Directory',
    text: 'Everyone by role: see who invited whom, and approve applications.',
  },
  {
    to: `${ADMIN_PATH}/query-blogs`,
    title: 'Query Blogs',
    text: 'Start a category’s Query Blog, or remove one.',
  },
  {
    to: `${ADMIN_PATH}/activity`,
    title: 'Activity log',
    text: 'Every approval and Query Blog change, with who did it and why.',
  },
] as const;

/** The panel's landing section: what is waiting, and the way to everything else. */
export function AdminOverview() {
  const overview = useAsync(fetchOverview);
  const pending = overview.data;

  return (
    <section aria-labelledby="admin-overview-title">
      <h2 id="admin-overview-title" className="text-h2">
        Overview
      </h2>

      <Card
        accent="pink"
        className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        aria-busy={overview.status === 'loading' || undefined}
      >
        {pending ? (
          <>
            <div>
              <p className="text-sm text-text-muted">Waiting for approval</p>
              <p className="mt-1 font-display text-h1">{pending.total.toLocaleString('en-IN')}</p>
              <p className="mt-1 text-sm text-text-muted">
                {plural(pending.members, 'member', 'members')} ·{' '}
                {plural(pending.ambassadors, 'ambassador', 'ambassadors')}
              </p>
            </div>
            {pending.total > 0 ? (
              <Link to={pendingMembersPath} className={buttonClasses()}>
                Review applications
              </Link>
            ) : (
              <p className="text-sm text-text-muted">You’re all caught up.</p>
            )}
          </>
        ) : overview.status === 'error' ? (
          <div role="alert" className="flex flex-wrap items-center gap-3 text-sm">
            <span className="text-danger">The pending count couldn’t be loaded.</span>
            <Button variant="outline" onClick={overview.retry}>
              Try again
            </Button>
          </div>
        ) : (
          <div className="w-full">
            <span className="sr-only">Loading…</span>
            <Skeleton className="h-3 w-32" />
            <Skeleton className="mt-3 h-10 w-16" />
            <Skeleton className="mt-3 h-3 w-48" />
          </div>
        )}
      </Card>

      <h3 className="mt-10 font-sans text-xs tracking-caps text-text-muted uppercase">
        Quick links
      </h3>
      <ul className="mt-3 grid gap-3 sm:grid-cols-3">
        {QUICK_LINKS.map((link) => (
          <li key={link.to}>
            <Link
              to={link.to}
              className="group block h-full border border-border bg-surface p-4 transition-colors hover:border-border-strong"
            >
              <span className="font-display text-h3 decoration-accent-soft underline-offset-4 group-hover:underline">
                {link.title}
              </span>
              <span className="mt-1 block text-sm text-text-muted">{link.text}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
