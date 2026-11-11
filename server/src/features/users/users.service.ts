import { z } from 'zod';

import type { Db, UserRole, UserStatus } from '../../db/schema.ts';
import { AppError } from '../../lib/errors.ts';
import type { Viewer } from '../../middleware/authenticate.ts';
import type { ScopedActor } from '../../policies/permissions.ts';
import type { Category } from '../categories/categories.service.ts';
import {
  findApprovedPublicProfile,
  findPrincipal,
  findProfile,
  insertCategories,
  insertProfile,
  selectCategoryIds,
} from './users.repository.ts';

/** GET /me: everything about the signed-in user. */
export interface MeDto {
  id: string;
  name: string;
  email: string | null;
  phoneNumber: string;
  occupation: string;
  role: UserRole;
  status: UserStatus;
  avatarUrl: string | null;
  /** An ambassador's 1 or 2 categories; empty for members and admins. */
  categories: Category[];
  /** Theirs to share. Only works for others while this user is approved. */
  referralCode: string | null;
  createdAt: string;
}

/** GET /users/:id: safe to show anyone. Never email, phone or status. */
export interface PublicProfileDto {
  id: string;
  name: string;
  occupation: string;
  role: UserRole;
  avatarUrl: string | null;
  categories: Category[];
}

/** id, role and status, for requireAuth. */
export function getPrincipal(db: Db, id: string) {
  return findPrincipal(db, id);
}

export async function getMe(db: Db, viewer: Viewer): Promise<MeDto> {
  const profile = await findProfile(db, viewer.id);
  if (!profile) throw new AppError('NOT_FOUND', 'Profile not found.');
  return {
    id: profile.user_id,
    name: profile.name,
    email: viewer.email,
    phoneNumber: profile.phone_number,
    occupation: profile.occupation,
    role: profile.role,
    status: profile.status,
    avatarUrl: profile.avatar_url,
    categories: profile.categories,
    referralCode: profile.referral_code,
    createdAt: profile.created_at.toISOString(),
  };
}

/**
 * The viewer with their own categories, for category-scoped permission checks.
 * Only ambassadors have categories, so nobody else costs a query.
 */
export async function getScopedActor(db: Db, viewer: Viewer): Promise<ScopedActor> {
  const categoryIds = viewer.role === 'ambassador' ? await selectCategoryIds(db, viewer.id) : [];
  return { id: viewer.id, role: viewer.role, status: viewer.status, categoryIds };
}

const userId = z.uuid();

/** Approved users only. Unknown, unapproved and malformed ids all get the same 404. */
export async function getPublicProfile(db: Db, id: string): Promise<PublicProfileDto> {
  const profile = userId.safeParse(id).success
    ? await findApprovedPublicProfile(db, id)
    : undefined;
  if (!profile) throw new AppError('NOT_FOUND', 'User not found.');
  return {
    id: profile.user_id,
    name: profile.name,
    occupation: profile.occupation,
    role: profile.role,
    avatarUrl: profile.avatar_url,
    categories: profile.categories,
  };
}

/** Inserts a pending profile and, for ambassadors, their categories. Run inside a transaction. */
export async function createProfile(
  trx: Db,
  input: {
    userId: string;
    name: string;
    phoneNumber: string;
    occupation: string;
    role: 'member' | 'ambassador';
    referralCodeId: string;
    categoryIds: readonly string[];
  },
): Promise<void> {
  await insertProfile(trx, input);
  if (input.categoryIds.length > 0) {
    await insertCategories(trx, input.userId, input.categoryIds);
  }
}
