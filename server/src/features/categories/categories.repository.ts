import { sql } from 'kysely';

import type { Db } from '../../db/schema.ts';

export function selectCategories(db: Db) {
  return db
    .selectFrom('categories')
    .select(['cat_id', 'cat_name', 'color'])
    .orderBy('cat_name')
    .execute();
}

export async function countCategoriesByIds(db: Db, ids: readonly string[]): Promise<number> {
  const row = await db
    .selectFrom('categories')
    .select(sql<number>`count(*)::int`.as('count'))
    .where('cat_id', 'in', ids)
    .executeTakeFirstOrThrow();
  return row.count;
}
