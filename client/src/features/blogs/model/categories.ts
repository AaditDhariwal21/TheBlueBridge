import type { Category, CategoryId } from './types';

export const CATEGORIES: readonly Category[] = [
  { id: 'career', label: 'Career', tone: 'blue' },
  { id: 'finance', label: 'Finance', tone: 'pink' },
  { id: 'health', label: 'Health', tone: 'blue' },
  { id: 'entrepreneurship', label: 'Entrepreneurship', tone: 'pink' },
  { id: 'work-life', label: 'Work & Life', tone: 'blue' },
  { id: 'local', label: 'Local Opportunities', tone: 'pink' },
  { id: 'tech', label: 'Tech', tone: 'blue' },
];

const BY_ID = new Map<CategoryId, Category>(CATEGORIES.map((c) => [c.id, c]));

export function getCategory(id: CategoryId): Category {
  // Every CategoryId is in CATEGORIES; the fallback only guards against drift.
  return BY_ID.get(id) ?? { id, label: id, tone: 'blue' };
}

export function isCategoryId(value: string): value is CategoryId {
  return BY_ID.has(value as CategoryId);
}
