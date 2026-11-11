import type { ColumnType, Generated, Kysely } from 'kysely';

import type { RichDoc } from '../lib/richText.ts';

/**
 * Kysely's view of the database. Hand-maintained: the SQL migrations in
 * ./migrations are the source of truth, and this file must match them.
 * Column names stay snake_case here; repositories map rows to camelCase DTOs.
 */

export type UserRole = 'member' | 'ambassador' | 'admin';
export type UserStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
export type BlogType = 'discussion' | 'query';
/** A named palette entry; the client maps it to a design token. */
export type CategoryColor = 'pink' | 'green' | 'blue' | 'orange' | 'black';

export const USER_ROLES = ['member', 'ambassador', 'admin'] as const satisfies UserRole[];
export const USER_STATUSES = [
  'pending',
  'approved',
  'rejected',
  'suspended',
] as const satisfies UserStatus[];

export interface CategoriesTable {
  cat_id: Generated<string>;
  cat_name: string;
  color: CategoryColor;
}

export interface UsersTable {
  user_id: string;
  name: string;
  phone_number: string;
  occupation: string;
  role: UserRole;
  status: Generated<UserStatus>;
  avatar_url: string | null;
  referral_code_id: string | null;
  reviewed_by: string | null;
  reviewed_at: Date | null;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface ReferralCodesTable {
  referral_code_id: Generated<string>;
  user_id: string;
  code: string;
  created_at: Generated<Date>;
}

export interface BlogsTable {
  blog_id: Generated<string>;
  user_id: string;
  type: BlogType;
  title: string;
  /** Plain text; for formatted blogs, derived from `content`. */
  body: string;
  /** jsonb: written as a JSON string, read back parsed. */
  content: ColumnType<RichDoc | null, string | null, string | null>;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
  deleted_at: Date | null;
  deleted_by: string | null;
}

export interface CommentsTable {
  comment_id: Generated<string>;
  blog_id: string;
  user_id: string;
  parent_comment_id: string | null;
  body: string;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
  deleted_at: Date | null;
  deleted_by: string | null;
}

export interface BlogsCategoriesTable {
  blog_id: string;
  cat_id: string;
}

export interface UserCategoriesTable {
  user_id: string;
  cat_id: string;
}

export interface Database {
  categories: CategoriesTable;
  users: UsersTable;
  referral_codes: ReferralCodesTable;
  blogs: BlogsTable;
  comments: CommentsTable;
  blogs_categories: BlogsCategoriesTable;
  user_categories: UserCategoriesTable;
}

/** A connection or an open transaction; repositories accept either. */
export type Db = Kysely<Database>;
