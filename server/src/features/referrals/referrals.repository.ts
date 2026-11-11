import { sql } from 'kysely';

import type { Db } from '../../db/schema.ts';
import { keysetBefore, type Cursor } from '../../lib/cursor.ts';

/** Whose referrals to read: one referrer's, or everyone who was referred (admins). */
export type ReferralScope = { kind: 'all' } | { kind: 'referrer'; userId: string };

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

/** users joined to the code they signed up with and that code's owner. */
function referredUsers(db: Db, scope: ReferralScope) {
  const query = db
    .selectFrom('users as u')
    .innerJoin('referral_codes as rc', 'rc.referral_code_id', 'u.referral_code_id')
    .innerJoin('users as referrer', 'referrer.user_id', 'rc.user_id');
  return scope.kind === 'referrer' ? query.where('rc.user_id', '=', scope.userId) : query;
}

/** Newest first. Fetches limit + 1 rows so the caller can tell if there is a next page. */
export function selectReferredUsers(
  db: Db,
  scope: ReferralScope,
  page: { limit: number; cursor?: Cursor | undefined },
) {
  const { cursor } = page;
  const scoped = referredUsers(db, scope);
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
export function countReferredUsers(db: Db, scope: ReferralScope) {
  return referredUsers(db, scope)
    .select(['u.status', 'u.role', sql<number>`count(*)::int`.as('count')])
    .groupBy(['u.status', 'u.role'])
    .execute();
}
