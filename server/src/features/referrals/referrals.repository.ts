import { sql } from 'kysely';

import type { Db } from '../../db/schema.ts';
import { keysetBefore, type Cursor } from '../../lib/cursor.ts';

/**
 * The code's id if it exists and its owner is approved. With `lockOwner`, the
 * owner row is share-locked until the transaction ends, so a concurrent status
 * change (e.g. suspension) waits instead of slipping in before commit.
 */
export async function findUsableCode(
  db: Db,
  code: string,
  options: { lockOwner?: boolean } = {},
): Promise<string | undefined> {
  const row = await db
    .selectFrom('referral_codes')
    .innerJoin('users as owner', 'owner.user_id', 'referral_codes.user_id')
    .select('referral_codes.referral_code_id')
    .where('referral_codes.code', '=', code)
    .where('owner.status', '=', 'approved')
    .$if(options.lockOwner === true, (qb) => qb.forShare('owner'))
    .executeTakeFirst();
  return row?.referral_code_id;
}

/** False if the code is already taken by someone else (the caller retries with a new one). */
export async function insertCode(db: Db, userId: string, code: string): Promise<boolean> {
  const row = await db
    .insertInto('referral_codes')
    .values({ user_id: userId, code })
    .onConflict((oc) => oc.column('code').doNothing())
    .returning('referral_code_id')
    .executeTakeFirst();
  return row !== undefined;
}

/**
 * The users who signed up with one referrer's code, joined to that referrer. The code is
 * found by its owner (referral_codes_user_id_key), its users by users_referral_code_idx.
 */
function referredUsers(db: Db, referrerId: string) {
  return db
    .selectFrom('users as u')
    .innerJoin('referral_codes as rc', 'rc.referral_code_id', 'u.referral_code_id')
    .innerJoin('users as referrer', 'referrer.user_id', 'rc.user_id')
    .where('rc.user_id', '=', referrerId);
}

/** Newest first. Fetches limit + 1 rows so the caller can tell if there is a next page. */
export function selectReferredUsers(
  db: Db,
  referrerId: string,
  page: { limit: number; cursor?: Cursor | undefined },
) {
  const { cursor } = page;
  const scoped = referredUsers(db, referrerId);
  const query =
    cursor === undefined ? scoped : scoped.where(keysetBefore('u.created_at', 'u.user_id', cursor));
  return query
    .select([
      'u.user_id',
      'u.name',
      'u.occupation',
      'u.role',
      'u.status',
      'u.avatar_url',
      'u.created_at',
      sql<string>`u.created_at::text`.as('created_at_key'),
      'referrer.user_id as referrer_id',
      'referrer.name as referrer_name',
    ])
    .orderBy('u.created_at', 'desc')
    .orderBy('u.user_id', 'desc')
    .limit(page.limit + 1)
    .execute();
}

/** One row per (status, role) combination that occurs. */
export function countReferredUsers(db: Db, referrerId: string) {
  return referredUsers(db, referrerId)
    .select(['u.status', 'u.role', sql<number>`count(*)::int`.as('count')])
    .groupBy(['u.status', 'u.role'])
    .execute();
}
