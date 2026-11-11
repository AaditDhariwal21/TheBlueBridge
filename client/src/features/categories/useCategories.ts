import { useCallback, useEffect, useState } from 'react';

import { apiRequest } from '../../lib/api';
import type { Category } from './types';

export type CategoriesState =
  { status: 'loading' } | { status: 'error' } | { status: 'ready'; categories: Category[] };

/** One request per page load, shared by every component that needs the list. */
let request: Promise<Category[]> | null = null;

function loadCategories(): Promise<Category[]> {
  request ??= (apiRequest('/categories') as Promise<{ categories: Category[] }>).then(
    (data) => data.categories,
    (error: unknown) => {
      request = null; // let a retry ask again
      throw error;
    },
  );
  return request;
}

/** All categories, alphabetical, with loading and error states and a retry. */
export function useCategories(): CategoriesState & { retry: () => void } {
  const [state, setState] = useState<CategoriesState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    loadCategories().then(
      (categories) => {
        if (!cancelled) setState({ status: 'ready', categories });
      },
      () => {
        if (!cancelled) setState({ status: 'error' });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((n) => n + 1);
  }, []);

  return { ...state, retry };
}
