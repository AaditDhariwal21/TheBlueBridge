import { useCallback, useEffect, useState } from 'react';

import { extend, getSnapshot, load, updateQueryData, type Snapshot } from './queryCache';
import { useCachedSnapshot, useLatest } from './useQuery';

/** A cursor-paginated slice of a list. `nextCursor` is null at the end. */
export interface Page<T, M = undefined> {
  items: T[];
  nextCursor: string | null;
  /** The size of the whole list, when the API reports it. */
  total?: number;
  /** Anything else the API reports about the whole list (e.g. counts per group). */
  meta?: M;
}

/** Fetches `limit` items after `cursor` (null: from the start). */
export type FetchPage<T, M = undefined> = (
  cursor: string | null,
  limit: number,
  signal: AbortSignal,
) => Promise<Page<T, M>>;

export interface PagedList<T, M = undefined> {
  items: T[];
  /**
   * `loading`: the first page, the next page, or new filters whose results aren't cached
   * yet (the previous items stay on screen meanwhile). Refreshes happen in place.
   */
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

/** How a list is cached: everything loaded so far. */
export interface ListData<T, M = undefined> {
  items: T[];
  nextCursor: string | null;
  total: number | null;
  meta: M | null;
}

/** The API's largest page; a refresh of a long list is fetched in pages of this size. */
const MAX_LIMIT = 50;

/**
 * A cursor-paginated list ("Show more"), cached under `key` (lib/queryCache.ts). Like
 * useQuery it loads again on every mount and when the tab regains focus: the refresh
 * fetches as many items as are on screen, from the start, so new items appear, removed
 * ones go, and the list keeps its length and scroll position. New filters mean a new key;
 * until their first page arrives, the previous items stay (dimmed by the caller).
 */
export function usePagedList<T, M = undefined>(
  key: string,
  fetchPage: FetchPage<T, M>,
  options: { pageSize: number; firstPageSize?: number },
): PagedList<T, M> {
  const snapshot = useCachedSnapshot(key);
  const fetchRef = useLatest(fetchPage);
  const { pageSize, firstPageSize = pageSize } = options;

  const refresh = useCallback(
    async (signal: AbortSignal): Promise<ListData<T, M>> => {
      const cached = listOf<T, M>(getSnapshot(key));
      const target = Math.max(cached?.items.length ?? 0, firstPageSize);
      const items: T[] = [];
      let cursor: string | null = null;
      let last: Page<T, M>;
      do {
        last = await fetchRef.current(cursor, Math.min(target - items.length, MAX_LIMIT), signal);
        items.push(...last.items);
        cursor = last.nextCursor;
      } while (cursor !== null && items.length < target);
      return { items, nextCursor: cursor, total: last.total ?? null, meta: last.meta ?? null };
    },
    [key, firstPageSize, fetchRef],
  );

  useEffect(() => {
    void load(key, refresh);
  }, [key, refresh]);

  const current = listOf<T, M>(snapshot);
  // The last list shown, kept on screen while a new key's first page loads.
  const [previous, setPrevious] = useState<ListData<T, M> | null>(null);
  if (current && current !== previous) setPrevious(current);

  const loadMore = useCallback(() => {
    void extend<ListData<T, M>>(key, async (list, signal) => {
      if (list.nextCursor === null) return list;
      const page = await fetchRef.current(list.nextCursor, pageSize, signal);
      return {
        items: [...list.items, ...page.items],
        nextCursor: page.nextCursor,
        total: page.total ?? null,
        meta: page.meta ?? null,
      };
    });
  }, [key, pageSize, fetchRef]);

  const retry = useCallback(() => {
    if (getSnapshot(key).failed === 'more') loadMore();
    else void load(key, refresh);
  }, [key, refresh, loadMore]);

  const update = useCallback(
    (change: (items: T[]) => T[]) => {
      updateQueryData<ListData<T, M>>(key, (list) => ({ ...list, items: change(list.items) }));
    },
    [key],
  );

  if (!current) {
    // The previous items are only a placeholder while loading: no "Show more" for them.
    const shown = snapshot.failed ? null : previous;
    return {
      items: shown?.items ?? [],
      status: snapshot.failed ? 'error' : 'loading',
      hasMore: false,
      total: shown?.total ?? null,
      meta: shown?.meta ?? null,
      loadMore,
      retry,
      update,
    };
  }
  return {
    items: current.items,
    status:
      snapshot.pending === 'more' ? 'loading' : snapshot.failed === 'more' ? 'error' : 'ready',
    hasMore: current.nextCursor !== null,
    total: current.total,
    meta: current.meta,
    loadMore,
    retry,
    update,
  };
}

function listOf<T, M>(snapshot: Snapshot): ListData<T, M> | null {
  return snapshot.hasData ? (snapshot.data as ListData<T, M>) : null;
}
