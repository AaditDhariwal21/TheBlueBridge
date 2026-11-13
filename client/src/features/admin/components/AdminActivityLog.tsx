import { useCallback, useState } from 'react';

import { Button } from '../../../components/ui/Button';
import { LoadMoreButton } from '../../../components/ui/LoadMoreButton';
import { SelectMenu } from '../../../components/ui/SelectMenu';
import { Skeleton } from '../../../components/ui/Skeleton';
import { StateMessage } from '../../../components/ui/StateMessage';
import { cn } from '../../../lib/cn';
import { usePagedList } from '../../../lib/usePagedList';
import { RelativeTime } from '../../blogs/components/shared/RelativeTime';
import { fetchActivity } from '../api';
import { ACTION_LABELS } from '../paths';
import type { AdminAction, AdminActionEntry } from '../types';

const ACTIONS = Object.keys(ACTION_LABELS) as AdminAction[];
const WHEN = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

/** Read-only: what admins did, newest first, optionally one kind of action. */
export function AdminActivityLog() {
  const [action, setAction] = useState<AdminAction | null>(null);
  const fetchPage = useCallback(
    (cursor: string | null, signal: AbortSignal) => fetchActivity(action, cursor, signal),
    [action],
  );
  const list = usePagedList(fetchPage);
  const { items, status, hasMore } = list;
  const replacing = status === 'loading' && !hasMore && items.length > 0;

  return (
    <section aria-labelledby="admin-activity-title">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="admin-activity-title" className="text-h2">
            Activity log
          </h2>
          <p className="mt-1 text-sm text-text-muted">
            Approvals and Query Blog changes. Entries can’t be edited or removed.
          </p>
        </div>
        <SelectMenu
          label="Action"
          className="w-full sm:w-56"
          value={action ?? ''}
          options={[
            { value: '', label: 'All actions' },
            ...ACTIONS.map((a) => ({ value: a, label: ACTION_LABELS[a].filter })),
          ]}
          onChange={(value) => {
            setAction(ACTIONS.find((a) => a === value) ?? null);
          }}
        />
      </div>

      <div className="mt-6" aria-busy={status === 'loading' || undefined}>
        {status === 'error' && items.length === 0 ? (
          <StateMessage
            role="alert"
            headingLevel="h3"
            title="The log didn’t load"
            action={
              <Button variant="outline" onClick={list.retry}>
                Try again
              </Button>
            }
          >
            Check your connection and try again.
          </StateMessage>
        ) : status === 'ready' && items.length === 0 ? (
          <StateMessage role="status" headingLevel="h3" title="Nothing here yet">
            {action ? 'No entries of this kind.' : 'Admin actions will be listed here.'}
          </StateMessage>
        ) : items.length === 0 ? (
          <div className="flex flex-col gap-5 border-y border-border py-5">
            <span className="sr-only">Loading the log…</span>
            {[0, 1, 2].map((i) => (
              <div key={i}>
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="mt-2 h-3 w-1/4" />
              </div>
            ))}
          </div>
        ) : (
          <ol
            aria-label="Admin actions, newest first"
            className={cn(
              'divide-y divide-border border-y border-border transition-opacity',
              replacing && 'opacity-60',
            )}
          >
            {items.map((entry) => (
              <LogEntry key={entry.id} entry={entry} />
            ))}
          </ol>
        )}
        <LoadMoreButton list={list} failureMessage="Couldn’t load more of the log." />
      </div>
    </section>
  );
}

function LogEntry({ entry }: { entry: AdminActionEntry }) {
  const target = entry.target.type === 'blog' ? `“${entry.target.label}”` : entry.target.label;
  return (
    <li className="flex flex-col gap-1 py-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <p className="wrap-break-word">
          <span className="font-medium">{entry.admin.name}</span> {ACTION_LABELS[entry.action].verb}{' '}
          <span className="font-medium">{target}</span>
        </p>
        {entry.reason && (
          <p className="mt-1 text-sm wrap-break-word text-text-muted">Reason: {entry.reason}</p>
        )}
      </div>
      <p className="shrink-0 text-xs text-text-muted">
        <time dateTime={entry.createdAt} title={WHEN.format(new Date(entry.createdAt))}>
          {WHEN.format(new Date(entry.createdAt))}
        </time>{' '}
        · <RelativeTime iso={entry.createdAt} />
      </p>
    </li>
  );
}
