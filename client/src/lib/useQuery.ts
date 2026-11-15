import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';

import { getSnapshot, load, setQueryData, subscribe, type Loader } from './queryCache';

export interface QueryResult<T> {
  /** `loading` only while there is nothing to show yet; refreshes happen in place. */
  status: 'loading' | 'ready' | 'error';
  data: T | undefined;
  retry: () => void;
  /** Replaces the cached value, e.g. with what an action returned. */
  set: (data: T) => void;
}

/**
 * One value from the API, cached under `key` (lib/queryCache.ts): shown at once if cached,
 * loaded again every time a view using it mounts or the key changes, and again when the tab
 * regains focus. `loader` may change between renders; the latest one is used.
 */
export function useQuery<T>(key: string, loader: Loader<T>): QueryResult<T> {
  const snapshot = useCachedSnapshot(key);
  const loaderRef = useLatest(loader);

  useEffect(() => {
    void load(key, (signal) => loaderRef.current(signal));
  }, [key, loaderRef]);

  const retry = useCallback(() => {
    void load(key, (signal) => loaderRef.current(signal));
  }, [key, loaderRef]);
  const set = useCallback(
    (data: T) => {
      setQueryData(key, data);
    },
    [key],
  );

  return {
    status: snapshot.hasData ? 'ready' : snapshot.failed ? 'error' : 'loading',
    data: snapshot.hasData ? (snapshot.data as T) : undefined,
    retry,
    set,
  };
}

/** A cached value that something else loads or sets; `fallback` until then. */
export function useQueryData<T>(key: string, fallback: T): T {
  const snapshot = useCachedSnapshot(key);
  return snapshot.hasData ? (snapshot.data as T) : fallback;
}

export function useCachedSnapshot(key: string) {
  const subscribeToKey = useCallback((listener: () => void) => subscribe(key, listener), [key]);
  return useSyncExternalStore(subscribeToKey, () => getSnapshot(key));
}

/** A ref that always holds the latest value, for callbacks that must not re-run effects. */
export function useLatest<T>(value: T) {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  });
  return ref;
}
