import { after } from './time';
import type { SeedUserKey } from './users';

/** One seeded comment. `at` is minutes after the thread's start; replies must come after parents. */
export interface SeedEntry {
  id: string;
  author: SeedUserKey;
  body: string;
  at: number;
  parent?: string;
}

export interface SeedComment {
  id: string;
  author: SeedUserKey;
  body: string;
  createdAt: string;
  parentId: string | null;
}

/** Minutes in `n` days, for readable offsets in long-running threads. */
export const days = (n: number) => n * 24 * 60;

export function thread(startedAt: string, entries: SeedEntry[]): SeedComment[] {
  return entries.map(({ id, author, body, at, parent }) => ({
    id,
    author,
    body,
    createdAt: after(startedAt, at),
    parentId: parent ?? null,
  }));
}
