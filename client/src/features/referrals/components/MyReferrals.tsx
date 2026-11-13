import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { LoadMoreButton } from '../../../components/ui/LoadMoreButton';
import { Skeleton } from '../../../components/ui/Skeleton';
import { usePagedList } from '../../../lib/usePagedList';
import { plural } from '../../blogs/lib/text';
import { fetchMyReferrals } from '../api';
import { ReferralRow } from './ReferralRow';

/** "People who joined using your code", on the account page, for every approved member. */
export function MyReferrals() {
  const list = usePagedList(fetchMyReferrals);
  const { items, status, total } = list;
  const firstLoad = status === 'loading' && items.length === 0;

  return (
    <Card>
      <section aria-labelledby="my-referrals-title" aria-busy={status === 'loading' || undefined}>
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 id="my-referrals-title" className="text-h3">
            People who joined using your code
          </h2>
          {total !== null && (
            <p className="text-sm text-text-muted">{plural(total, 'person', 'people')} in total</p>
          )}
        </div>

        {firstLoad && (
          <div className="mt-4 flex flex-col gap-4">
            <span className="sr-only">Loading…</span>
            {[0, 1].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="size-9 shrink-0 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="mt-2 h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {status === 'error' && items.length === 0 && (
          <div role="alert" className="mt-4 flex flex-wrap items-center gap-3 text-sm">
            <span className="text-danger">This list couldn’t be loaded.</span>
            <Button variant="outline" onClick={list.retry}>
              Try again
            </Button>
          </div>
        )}

        {status === 'ready' && items.length === 0 && (
          <p className="mt-3 text-sm text-text-muted">
            No one has joined with your code yet. When someone does, they’ll appear here with the
            status of their application.
          </p>
        )}

        {items.length > 0 && (
          <ul className="mt-2 divide-y divide-border">
            {items.map((referral) => (
              <ReferralRow key={referral.id} referral={referral} />
            ))}
          </ul>
        )}
        <LoadMoreButton list={list} failureMessage="Couldn’t load more of your referrals." />
      </section>
    </Card>
  );
}
