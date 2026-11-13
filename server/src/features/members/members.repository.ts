import { sql, type ExpressionBuilder } from 'kysely';
import { jsonArrayFrom } from 'kysely/helpers/postgres';

import type { Database, Db, UserRole, UserStatus } from '../../db/schema.ts';
import type { DirectoryCursor } from './members.schemas.ts';

type ProfileScope = ExpressionBuilder<
  Database & { u: Database['users']; au: Database['auth.users'] },
  'u' | 'au'
>;

/**
 * Every profile field, for toPublicProfile. Email comes from Supabase Auth in the same
 * query (a join on its primary key), never copied into public and never one lookup per user.
 */
function profileColumns(eb: ProfileScope) {
  return [
    'u.user_id',
    'u.name',
    'u.occupation',
    'u.role',
    'u.avatar_url',
    'u.phone_number',
    'u.created_at',
    'au.email',
    // An ambassador's categories, alphabetical; empty for everyone else.
    jsonArrayFrom(
      eb
        .selectFrom('user_categories as uc')
        .innerJoin('categories as c', 'c.cat_id', 'uc.cat_id')
        .select(['c.cat_id as id', 'c.cat_name as name', 'c.color'])
        .whereRef('uc.user_id', '=', 'u.user_id')
        .orderBy('c.cat_name'),
    ).as('categories'),
  ] as const;
}

function profiles(db: Db) {
  return db.selectFrom('users as u').leftJoin('auth.users as au', 'au.id', 'u.user_id');
}

/** An approved user's full profile; undefined for anyone else. */
export function findApprovedProfile(db: Db, userId: string) {
  return profiles(db)
    .select((eb) => profileColumns(eb))
    .where('u.user_id', '=', userId)
    .where('u.status', '=', 'approved')
    .executeTakeFirst();
}

/**
 * Who a members list shows. The community directory always asks for approved users only;
 * the admin panel may ask for any status.
 */
export interface MemberFilter {
  status?: UserStatus | undefined;
  /** Matches anywhere in the name or the occupation, case-insensitively. */
  q?: string | undefined;
  roles?: readonly UserRole[] | undefined;
}

function filteredMembers(db: Db, filter: MemberFilter) {
  let query = db.selectFrom('users as u');
  if (filter.status !== undefined) query = query.where('u.status', '=', filter.status);
  if (filter.roles !== undefined) query = query.where('u.role', 'in', filter.roles);
  if (filter.q !== undefined) {
    const pattern = containsPattern(filter.q);
    query = query.where((eb) =>
      eb.or([eb('u.name', 'ilike', pattern), eb('u.occupation', 'ilike', pattern)]),
    );
  }
  return query;
}

/**
 * Members in directory order: admins first, then ambassadors, then members; by name
 * (case-insensitive) within each, user_id breaking ties. Keyset on exactly
 * (role_rank, lower(name), user_id), so each page is a range scan of users_directory_idx
 * (approved only) or users_admin_directory_idx (any status); filters only drop rows from it.
 * Fetches limit + 1.
 */
export function selectMembers(
  db: Db,
  filter: MemberFilter,
  page: { limit: number; cursor?: DirectoryCursor | undefined },
) {
  const base = filteredMembers(db, filter);
  const { cursor } = page;
  const query =
    cursor === undefined
      ? base
      : base.where(
          sql<boolean>`(u.role_rank, lower(u.name), u.user_id) > (${cursor.k}, ${cursor.n}, ${cursor.id}::uuid)`,
        );
  return query
    .select([
      'u.user_id',
      'u.name',
      'u.occupation',
      'u.role',
      'u.status',
      'u.avatar_url',
      'u.role_rank',
      sql<string>`lower(u.name)`.as('name_key'),
    ])
    .orderBy('u.role_rank')
    .orderBy(sql`lower(u.name)`)
    .orderBy('u.user_id')
    .limit(page.limit + 1)
    .execute();
}

/** How many match in each role, with the same filter. */
export function countMembers(db: Db, filter: MemberFilter) {
  return filteredMembers(db, filter)
    .select(['u.role', sql<number>`count(*)::int`.as('count')])
    .groupBy('u.role')
    .execute();
}

/** `%term%` for ILIKE, with the pattern characters in the term taken literally. */
function containsPattern(term: string): string {
  return `%${term.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}

/** Any user's full profile, status and review, and who referred them (null for the root admin). */
export function findMemberForAdmin(db: Db, userId: string) {
  return profiles(db)
    .leftJoin('referral_codes as used', 'used.referral_code_id', 'u.referral_code_id')
    .leftJoin('users as referrer', 'referrer.user_id', 'used.user_id')
    .select((eb) => [
      ...profileColumns(eb),
      'u.status',
      'u.reviewed_at',
      'referrer.user_id as referrer_id',
      'referrer.name as referrer_name',
      'referrer.role as referrer_role',
    ])
    .where('u.user_id', '=', userId)
    .executeTakeFirst();
}

/**
 * The applicant, locked until the transaction ends, so two admins approving at once are
 * serialised and the second sees the first's result.
 */
export function lockApplicant(trx: Db, userId: string) {
  return trx
    .selectFrom('users')
    .select(['user_id', 'name', 'role', 'status'])
    .where('user_id', '=', userId)
    .forNoKeyUpdate()
    .executeTakeFirst();
}

export async function markApproved(trx: Db, userId: string, reviewerId: string): Promise<void> {
  await trx
    .updateTable('users')
    .set({ status: 'approved', reviewed_by: reviewerId, reviewed_at: sql<Date>`now()` })
    .where('user_id', '=', userId)
    .execute();
}

/** Pending applications by role (users_pending_queue_idx). */
export function countPendingByRole(db: Db) {
  return db
    .selectFrom('users')
    .select(['role', sql<number>`count(*)::int`.as('count')])
    .where('status', '=', 'pending')
    .groupBy('role')
    .execute();
}
