import { useCallback, useEffect, useState } from 'react';

import type { Page } from '../model/types';

export interface PagedList<T> {
  items: T[];
  status: 'loading' | 'ready' | 'error';
  hasMore: boolean;
  loadMore: () => void;
  retry: () => void;
}

/**
 * A cursor-paginated list fetched page by page ("Show more"). Not cached: used
 * for the member's own lists, which should always be fresh when opened.
 * `fetchPage` must be stable (module-level or memoized).
 */
export function usePagedList<T>(
  fetchPage: (cursor: string | null) => Promise<Page<T>>,
): PagedList<T> {
  const [items, setItems] = useState<T[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [status, setStatus] = useState<PagedList<T>['status']>('loading');
  const [request, setRequest] = useState<{ from: string | null; attempt: number }>({
    from: null,
    attempt: 0,
  });

  useEffect(() => {
    let cancelled = false;
    fetchPage(request.from).then(
      (page) => {
        if (cancelled) return;
        setItems((current) => (request.from === null ? page.items : [...current, ...page.items]));
        setCursor(page.nextCursor);
        setHasMore(page.nextCursor !== null);
        setStatus('ready');
      },
      () => {
        if (!cancelled) setStatus('error');
      },
    );
    return () => {
      cancelled = true;
    };
  }, [fetchPage, request]);

  const loadMore = useCallback(() => {
    if (cursor === null) return;
    setStatus('loading');
    setRequest((r) => ({ from: cursor, attempt: r.attempt + 1 }));
  }, [cursor]);

  const retry = useCallback(() => {
    setStatus('loading');
    setRequest((r) => ({ ...r, attempt: r.attempt + 1 }));
  }, []);

  return { items, status, hasMore, loadMore, retry };
}
