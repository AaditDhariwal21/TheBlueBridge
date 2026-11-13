import { z } from 'zod';

import type { Db, UserRole, UserStatus } from '../../db/schema.ts';
import { paginate, type Cursor } from '../../lib/cursor.ts';
import { AppError } from '../../lib/errors.ts';
import type { Viewer } from '../../middleware/authenticate.ts';
import { canApproveMember, canUseAdminPanel } from '../../policies/permissions.ts';
import { logAdminAction } from '../adminLog/adminLog.service.ts';
import type { Category } from '../categories/categories.service.ts';
import { listReferrals, type ReferralsDto } from '../referrals/referrals.service.ts';
import {
  countMembers,
  countPendingByRole,
  findApprovedProfile,
  findMemberForAdmin,
  lockApplicant,
  markApproved,
  selectMembers,
  type MemberFilter,
} from './members.repository.ts';
import { directoryCursor, type DirectoryCursor } from './members.schemas.ts';

/* ------------------------------------------------------------------ serializer */

/** A member's profile as other people see it. */
export interface PublicProfileDto {
  id: string;
  name: string;
  occupation: string;
  role: UserRole;
  avatarUrl: string | null;
  /** An ambassador's 1 or 2 categories; empty for everyone else. */
  categories: Category[];
  phoneNumber: string;
  /** From Supabase Auth; null only if the Auth user has no email. */
  email: string | null;
  joinedAt: string;
}

interface ProfileRow {
  user_id: string;
  name: string;
  occupation: string;
  role: UserRole;
  avatar_url: string | null;
  phone_number: string;
  email: string | null;
  categories: Category[];
  created_at: Date;
}

/**
 * THE serializer for one person's profile shown to someone else. Every endpoint that
 * returns profile data goes through it (or takes a subset of its output), so privacy
 * rules, such as hiding phone or email, change here and nowhere else.
 * For now it returns every profile field.
 */
export function toPublicProfile(row: ProfileRow): PublicProfileDto {
  return {
    id: row.user_id,
    name: row.name,
    occupation: row.occupation,
    role: row.role,
    avatarUrl: row.avatar_url,
    categories: row.categories,
    phoneNumber: row.phone_number,
    email: row.email,
    joinedAt: row.created_at.toISOString(),
  };
}

/** A list row: the fields a row needs, a strict subset of the public profile. */
export type MemberSummaryDto = Pick<
  PublicProfileDto,
  'id' | 'name' | 'occupation' | 'role' | 'avatarUrl'
>;

function toMemberSummary(row: {
  user_id: string;
  name: string;
  occupation: string;
  role: UserRole;
  avatar_url: string | null;
}): MemberSummaryDto {
  return {
    id: row.user_id,
    name: row.name,
    occupation: row.occupation,
    role: row.role,
    avatarUrl: row.avatar_url,
  };
}

const userId = z.uuid();

/* --------------------------------------------------------------- directory */

export interface DirectoryDto {
  members: MemberSummaryDto[];
  nextCursor: string | null;
  /** How many match in each role, across all pages. */
  counts: Record<UserRole, number>;
}

/** One page of members in directory order, with the counts per role for the same filter. */
async function pageOfMembers(
  db: Db,
  filter: MemberFilter,
  page: { limit: number; cursor?: DirectoryCursor | undefined },
) {
  const [rows, groups] = await Promise.all([
    selectMembers(db, filter, page),
    countMembers(db, filter),
  ]);
  const { items, nextCursor } = paginate(rows, page.limit, (row) =>
    directoryCursor.encode({ k: row.role_rank, n: row.name_key, id: row.user_id }),
  );
  const counts: Record<UserRole, number> = { admin: 0, ambassador: 0, member: 0 };
  for (const { role, count } of groups) counts[role] = count;
  return { items, nextCursor, counts };
}

/**
 * Approved members, admins first, then ambassadors, then members, each by name. Optionally
 * searched (name or occupation) and limited to some roles; the order stays the same.
 */
export async function listDirectory(
  db: Db,
  query: {
    limit: number;
    cursor?: DirectoryCursor | undefined;
    q?: string | undefined;
    roles?: UserRole[] | undefined;
  },
): Promise<DirectoryDto> {
  const { items, nextCursor, counts } = await pageOfMembers(
    db,
    { status: 'approved', q: query.q, roles: query.roles },
    query,
  );
  return { members: items.map(toMemberSummary), nextCursor, counts };
}

/** How many approved people the community has (admins, ambassadors and members). Public. */
export async function getCommunitySize(db: Db): Promise<number> {
  const groups = await countMembers(db, { status: 'approved' });
  return groups.reduce((total, group) => total + group.count, 0);
}

/** An approved member's full profile. Unknown, unapproved and malformed ids all get one 404. */
export async function getMemberProfile(db: Db, id: string): Promise<PublicProfileDto> {
  const row = userId.safeParse(id).success ? await findApprovedProfile(db, id) : undefined;
  if (!row) throw new AppError('NOT_FOUND', 'This member doesn’t exist or isn’t active.');
  return toPublicProfile(row);
}

/** GET /users/:id, open to anyone: never email, phone or status. */
export type ProfileCardDto = Pick<
  PublicProfileDto,
  'id' | 'name' | 'occupation' | 'role' | 'avatarUrl' | 'categories'
>;

export async function getProfileCard(db: Db, id: string): Promise<ProfileCardDto> {
  const { name, occupation, role, avatarUrl, categories } = await getMemberProfile(db, id);
  return { id, name, occupation, role, avatarUrl, categories };
}

/* ------------------------------------------------------------------- admin */

export interface AdminMemberSummaryDto extends MemberSummaryDto {
  status: UserStatus;
}

export interface AdminMemberDto {
  member: PublicProfileDto & { status: UserStatus; reviewedAt: string | null };
  /** Whose referral code they joined with; null for the root admin. */
  referredBy: { id: string; name: string; role: UserRole } | null;
  /** The people who joined with their code: the first page and the totals. */
  referrals: ReferralsDto;
}

const REFERRALS_FIRST_PAGE = 10;

/** Everyone, in directory order, optionally filtered by status, role and search. */
export async function listMembersForAdmin(
  db: Db,
  query: {
    limit: number;
    cursor?: DirectoryCursor | undefined;
    q?: string | undefined;
    status?: UserStatus | undefined;
    role?: UserRole | undefined;
  },
): Promise<{
  members: AdminMemberSummaryDto[];
  nextCursor: string | null;
  counts: Record<UserRole, number>;
}> {
  const filter = {
    status: query.status,
    q: query.q,
    roles: query.role === undefined ? undefined : [query.role],
  };
  const { items, nextCursor, counts } = await pageOfMembers(db, filter, query);
  return {
    members: items.map((row) => ({ ...toMemberSummary(row), status: row.status })),
    nextCursor,
    counts,
  };
}

export async function getMemberForAdmin(db: Db, id: string): Promise<AdminMemberDto> {
  const row = userId.safeParse(id).success ? await findMemberForAdmin(db, id) : undefined;
  if (!row) throw new AppError('NOT_FOUND', 'This member doesn’t exist.');
  return {
    member: {
      ...toPublicProfile(row),
      status: row.status,
      reviewedAt: row.reviewed_at?.toISOString() ?? null,
    },
    referredBy:
      row.referrer_id === null || row.referrer_name === null || row.referrer_role === null
        ? null
        : { id: row.referrer_id, name: row.referrer_name, role: row.referrer_role },
    referrals: await listReferrals(db, row.user_id, { limit: REFERRALS_FIRST_PAGE }),
  };
}

/** Everyone who joined with this member's code, page by page. */
export async function listMemberReferrals(
  db: Db,
  id: string,
  page: { limit: number; cursor?: Cursor | undefined },
): Promise<ReferralsDto> {
  if (!userId.safeParse(id).success) throw new AppError('NOT_FOUND', 'This member doesn’t exist.');
  return listReferrals(db, id, page);
}

/**
 * Approves a pending member or ambassador. The role stays what they applied for. The
 * approval and its log entry are one transaction, with the applicant's row locked first.
 */
export async function approveMember(
  db: Db,
  viewer: Viewer,
  id: string,
  reason: string | null,
): Promise<AdminMemberDto> {
  if (!canUseAdminPanel(viewer)) throw new AppError('FORBIDDEN', 'Only admins can approve.');
  if (!userId.safeParse(id).success) throw new AppError('NOT_FOUND', 'This member doesn’t exist.');
  await db.transaction().execute(async (trx) => {
    const applicant = await lockApplicant(trx, id);
    if (!applicant) throw new AppError('NOT_FOUND', 'This member doesn’t exist.');
    if (!canApproveMember(viewer, applicant)) {
      throw new AppError('CONFLICT', 'This account isn’t waiting for approval.');
    }
    await markApproved(trx, id, viewer.id);
    await logAdminAction(trx, {
      adminId: viewer.id,
      action: applicant.role === 'ambassador' ? 'ambassador_approved' : 'member_approved',
      targetId: id,
      targetLabel: applicant.name,
      reason,
    });
  });
  return getMemberForAdmin(db, id);
}

/** For the admin overview: how many applications wait, by the role applied for. */
export async function getPendingCounts(
  db: Db,
): Promise<{ total: number; members: number; ambassadors: number }> {
  const counts = { total: 0, members: 0, ambassadors: 0 };
  for (const { role, count } of await countPendingByRole(db)) {
    counts.total += count;
    if (role === 'member') counts.members += count;
    if (role === 'ambassador') counts.ambassadors += count;
  }
  return counts;
}
