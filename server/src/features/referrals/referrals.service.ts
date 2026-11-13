import {
  USER_ROLES,
  USER_STATUSES,
  type Db,
  type UserRole,
  type UserStatus,
} from '../../db/schema.ts';
import {
  generateReferralCode,
  isWellFormedReferralCode,
  normalizeReferralCode,
} from '../../lib/referralCode.ts';
import { encodeCursor, paginate, type Cursor } from '../../lib/cursor.ts';
import {
  countReferredUsers,
  findUsableCode,
  insertCode,
  selectReferredUsers,
} from './referrals.repository.ts';

export interface ReferralDto {
  id: string;
  name: string;
  occupation: string;
  role: UserRole;
  status: UserStatus;
  avatarUrl: string | null;
  joinedAt: string;
  referredBy: { id: string; name: string };
}

export interface ReferralsDto {
  referrals: ReferralDto[];
  /** Pass back as ?cursor= for the next page; null on the last page. */
  nextCursor: string | null;
  /** Across all pages. */
  counts: {
    total: number;
    byStatus: Record<UserStatus, number>;
    byRole: Record<UserRole, number>;
  };
}

/**
 * The referral code's id when it can be used to sign up: well-formed, existing,
 * and owned by an approved user. Undefined in every other case, so callers give
 * one generic answer.
 */
export async function findUsableReferralCodeId(
  db: Db,
  rawCode: string,
  options: { lockOwner?: boolean } = {},
): Promise<string | undefined> {
  const code = normalizeReferralCode(rawCode);
  if (!isWellFormedReferralCode(code)) return undefined;
  return findUsableCode(db, code, options);
}

const MAX_CODE_ATTEMPTS = 5;

/** Gives a new user their own code. Collisions are astronomically rare; retried anyway. */
export async function issueReferralCode(trx: Db, userId: string): Promise<void> {
  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    if (await insertCode(trx, userId, generateReferralCode())) return;
  }
  throw new Error('Could not generate a unique referral code');
}

/**
 * The people who joined with one member's referral code, newest first, with counts. The
 * caller decides whose: the signed-in member's own (GET /me/referrals), or any member's
 * for an admin (GET /admin/members/:id). Codes themselves are never listed.
 */
export async function listReferrals(
  db: Db,
  referrerId: string,
  page: { limit: number; cursor?: Cursor | undefined },
): Promise<ReferralsDto> {
  const [rows, groups] = await Promise.all([
    selectReferredUsers(db, referrerId, page),
    countReferredUsers(db, referrerId),
  ]);

  const { items, nextCursor } = paginate(rows, page.limit, (row) =>
    encodeCursor({ createdAt: row.created_at_key, id: row.user_id }),
  );
  const counts: ReferralsDto['counts'] = {
    total: 0,
    byStatus: zeroed(USER_STATUSES),
    byRole: zeroed(USER_ROLES),
  };
  for (const group of groups) {
    counts.total += group.count;
    counts.byStatus[group.status] += group.count;
    counts.byRole[group.role] += group.count;
  }

  return {
    referrals: items.map((row) => ({
      id: row.user_id,
      name: row.name,
      occupation: row.occupation,
      role: row.role,
      status: row.status,
      avatarUrl: row.avatar_url,
      joinedAt: row.created_at.toISOString(),
      referredBy: { id: row.referrer_id, name: row.referrer_name },
    })),
    nextCursor,
    counts,
  };
}

function zeroed<K extends string>(keys: readonly K[]): Record<K, number> {
  return Object.fromEntries(keys.map((key) => [key, 0])) as Record<K, number>;
}
