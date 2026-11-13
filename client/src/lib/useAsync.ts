import { useCallback, useEffect, useState } from 'react';

export interface AsyncResult<T> {
  status: 'loading' | 'ready' | 'error';
  data: T | undefined;
  retry: () => void;
  /** Replaces the loaded value, e.g. with what an action returned. */
  set: (data: T) => void;
}

/**
 * One value loaded from the API, with loading and error states and a retry. `load` must
 * be stable (memoized): a new `load` loads again, and the earlier request is cancelled so
 * its answer can never overwrite the newer one.
 */
export function useAsync<T>(load: (signal: AbortSignal) => Promise<T>): AsyncResult<T> {
  const [source, setSource] = useState(() => load);
  const [status, setStatus] = useState<AsyncResult<T>['status']>('loading');
  const [data, setData] = useState<T | undefined>(undefined);
  const [attempt, setAttempt] = useState(0);

  if (source !== load) {
    setSource(() => load);
    setStatus('loading');
    setData(undefined);
  }

  useEffect(() => {
    const controller = new AbortController();
    source(controller.signal).then(
      (value) => {
        if (controller.signal.aborted) return;
        setData(value);
        setStatus('ready');
      },
      () => {
        if (!controller.signal.aborted) setStatus('error');
      },
    );
    return () => {
      controller.abort();
    };
  }, [source, attempt]);

  const retry = useCallback(() => {
    setStatus('loading');
    setAttempt((n) => n + 1);
  }, []);
  const set = useCallback((value: T) => {
    setData(value);
    setStatus('ready');
  }, []);

  return { status, data, retry, set };
}
