import type { CategoryColor, Db } from './schema.ts';

/** The categories for now. Safe to run repeatedly: existing names get their colour updated. */
export const SEED_CATEGORIES = [
  { name: 'Health', color: 'pink' },
  { name: 'Finance', color: 'green' },
  { name: 'Tech', color: 'blue' },
  { name: 'Entrepreneurship', color: 'orange' },
  { name: 'Legal', color: 'black' },
] as const satisfies readonly { name: string; color: CategoryColor }[];

/** Returns how many categories were inserted or updated. */
export async function seedCategories(db: Db): Promise<number> {
  const rows = await db
    .insertInto('categories')
    .values(SEED_CATEGORIES.map(({ name, color }) => ({ cat_name: name, color })))
    .onConflict((oc) =>
      oc.column('cat_name').doUpdateSet((eb) => ({ color: eb.ref('excluded.color') })),
    )
    .returning('cat_id')
    .execute();
  return rows.length;
}
