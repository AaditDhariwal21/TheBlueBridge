import { useEffect } from 'react';

import type { PagedList } from '../../lib/usePagedList';
import { Button } from './Button';
import { useToast } from './toast';

interface LoadMoreButtonProps {
  list: Pick<PagedList<unknown>, 'items' | 'status' | 'hasMore' | 'loadMore' | 'retry'>;
  label?: string;
  /** Toasted when the next page fails, e.g. "Couldn’t load more members." */
  failureMessage: string;
}

/**
 * "Show more" under a paged list: one button that keeps its place (no layout jump) and
 * shows progress. A failed next page is reported in a toast with "Try again", and the
 * button itself becomes "Try again".
 */
export function LoadMoreButton({ list, label = 'Show more', failureMessage }: LoadMoreButtonProps) {
  const toast = useToast();
  const { status, items, hasMore, loadMore, retry } = list;
  const failedMore = status === 'error' && items.length > 0;

  useEffect(() => {
    if (!failedMore) return;
    toast.error(failureMessage, { action: { label: 'Try again', onClick: retry } });
  }, [failedMore, failureMessage, retry, toast]);

  if (!hasMore && !failedMore) return null;
  const loading = status === 'loading';
  return (
    <Button
      variant="outline"
      onClick={() => {
        if (loading) return;
        if (failedMore) retry();
        else loadMore();
      }}
      aria-disabled={loading || undefined}
      className="mt-4 w-full"
    >
      {loading ? 'Loading…' : failedMore ? 'Try again' : label}
    </Button>
  );
}
