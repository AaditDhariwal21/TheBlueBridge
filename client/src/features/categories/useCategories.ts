import { apiRequest } from '../../lib/api';
import { useQuery } from '../../lib/useQuery';
import type { Category } from './types';

export type CategoriesState =
  { status: 'loading' } | { status: 'error' } | { status: 'ready'; categories: Category[] };

async function fetchCategories(signal: AbortSignal): Promise<Category[]> {
  const data = (await apiRequest('/categories', { signal })) as { categories: Category[] };
  return data.categories;
}

/** All categories, alphabetical, with loading and error states and a retry. */
export function useCategories(): CategoriesState & { retry: () => void } {
  const { status, data, retry } = useQuery('categories', fetchCategories);
  return status === 'ready' && data
    ? { status, categories: data, retry }
    : { status: status === 'ready' ? 'loading' : status, retry };
}
