import type { CategoryColor, Db } from '../../db/schema.ts';
import { countCategoriesByIds, selectCategories } from './categories.repository.ts';

export interface Category {
  id: string;
  name: string;
  color: CategoryColor;
}

export async function listCategories(db: Db): Promise<Category[]> {
  const rows = await selectCategories(db);
  return rows.map((row) => ({ id: row.cat_id, name: row.cat_name, color: row.color }));
}

/** True when every id names a category. Ids must be distinct. */
export async function allCategoriesExist(db: Db, ids: readonly string[]): Promise<boolean> {
  if (ids.length === 0) return true;
  return (await countCategoriesByIds(db, ids)) === ids.length;
}
