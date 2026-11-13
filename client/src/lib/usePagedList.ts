import { useCallback, useEffect, useState } from 'react';

/** A cursor-paginated slice of a list. `nextCursor` is null at the end. */
export interface Page<T, M = undefined> {
  items: T[];
  nextCursor: string | null;
  /** The size of the whole list, when the API reports it. */
  total?: number;
  /** Anything else the API reports about the whole list (e.g. counts per group). */
  meta?: M;
}

export type FetchPage<T, M = undefined> = (
  cursor: string | null,
  signal: AbortSignal,
) => Promise<Page<T, M>>;

export interface PagedList<T, M = undefined> {
  items: T[];
  /** `loading` covers the first page, the next page, and a reload after new filters. */
  status: 'loading' | 'ready' | 'error';
  hasMore: boolean;
  /** From the latest page; null when the API doesn't report it. */
  total: number | null;
  /** From the latest page; null when the API doesn't report it. */
  meta: M | null;
  loadMore: () => void;
  retry: () => void;
  /** Changes loaded items in place, e.g. after an action on one of them. */
  update: (change: (items: T[]) => T[]) => void;
}

/**
 * A cursor-paginated list fetched page by page ("Show more"). Not cached: lists using it
 * should be fresh when opened. `fetchPage` must be stable (module-level or memoized); a new
 * `fetchPage` (e.g. new filters) starts again from the first page. The previous items stay
 * on screen until the new ones arrive, so the layout doesn't jump, and the request for the
 * old filters is cancelled so a slow, stale response can never replace a newer one.
 */
export function usePagedList<T, M = undefined>(fetchPage: FetchPage<T, M>): PagedList<T, M> {
  const [source, setSource] = useState(() => fetchPage);
  const [items, setItems] = useState<T[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [meta, setMeta] = useState<M | null>(null);
  const [status, setStatus] = useState<PagedList<T, M>['status']>('loading');
  const [request, setRequest] = useState<{ from: string | null; attempt: number }>({
    from: null,
    attempt: 0,
  });

  if (source !== fetchPage) {
    setSource(() => fetchPage);
    setCursor(null);
    setStatus('loading');
    setRequest((r) => ({ from: null, attempt: r.attempt + 1 }));
  }

  useEffect(() => {
    const controller = new AbortController();
    source(request.from, controller.signal).then(
      (page) => {
        if (controller.signal.aborted) return;
        setItems((current) => (request.from === null ? page.items : [...current, ...page.items]));
        setCursor(page.nextCursor);
        setTotal(page.total ?? null);
        setMeta(page.meta ?? null);
        setStatus('ready');
      },
      () => {
        if (!controller.signal.aborted) setStatus('error');
      },
    );
    return () => {
      controller.abort();
    };
  }, [source, request]);

  const loadMore = useCallback(() => {
    if (cursor === null) return;
    setStatus('loading');
    setRequest((r) => ({ from: cursor, attempt: r.attempt + 1 }));
  }, [cursor]);

  const retry = useCallback(() => {
    setStatus('loading');
    setRequest((r) => ({ ...r, attempt: r.attempt + 1 }));
  }, []);

  return {
    items,
    status,
    hasMore: cursor !== null,
    total,
    meta,
    loadMore,
    retry,
    update: setItems,
  };
}
