import type { ExpressionBuilder } from 'kysely';
import { jsonArrayFrom } from 'kysely/helpers/postgres';

import type { Database, Db, UserRole } from '../../db/schema.ts';

/** Just what authorization needs; loaded on every authenticated request. */
export function findPrincipal(db: Db, userId: string) {
  return db
    .selectFrom('users')
    .select(['user_id as id', 'role', 'status'])
    .where('user_id', '=', userId)
    .executeTakeFirst();
}

export function findProfile(db: Db, userId: string) {
  return db
    .selectFrom('users')
    .leftJoin('referral_codes', 'referral_codes.user_id', 'users.user_id')
    .select((eb) => [
      'users.user_id',
      'users.name',
      'users.phone_number',
      'users.occupation',
      'users.role',
      'users.status',
      'users.avatar_url',
      'users.created_at',
      'referral_codes.code as referral_code',
      categoriesOf(eb),
    ])
    .where('users.user_id', '=', userId)
    .executeTakeFirst();
}

export async function insertProfile(
  db: Db,
  values: {
    userId: string;
    name: string;
    phoneNumber: string;
    occupation: string;
    role: UserRole;
    referralCodeId: string;
  },
): Promise<void> {
  await db
    .insertInto('users')
    .values({
      user_id: values.userId,
      name: values.name,
      phone_number: values.phoneNumber,
      occupation: values.occupation,
      role: values.role,
      status: 'pending',
      referral_code_id: values.referralCodeId,
    })
    .execute();
}

export async function insertCategories(
  db: Db,
  userId: string,
  catIds: readonly string[],
): Promise<void> {
  await db
    .insertInto('user_categories')
    .values(catIds.map((cat_id) => ({ user_id: userId, cat_id })))
    .execute();
}

/** An ambassador's categories as [{ id, name, color }], alphabetical. Empty for everyone else. */
function categoriesOf(eb: ExpressionBuilder<Database, 'users'>) {
  return jsonArrayFrom(
    eb
      .selectFrom('user_categories')
      .innerJoin('categories', 'categories.cat_id', 'user_categories.cat_id')
      .select(['categories.cat_id as id', 'categories.cat_name as name', 'categories.color'])
      .whereRef('user_categories.user_id', '=', 'users.user_id')
      .orderBy('categories.cat_name'),
  ).as('categories');
}

export async function selectCategoryIds(db: Db, userId: string): Promise<string[]> {
  const rows = await db
    .selectFrom('user_categories')
    .select('cat_id')
    .where('user_id', '=', userId)
    .execute();
  return rows.map((row) => row.cat_id);
}
