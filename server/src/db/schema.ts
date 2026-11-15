import type { ColumnType, Generated, GeneratedAlways, Kysely } from 'kysely';

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

/** What the admin action log records (admin_action_logs_action_check). */
export type AdminAction =
  | 'member_approved'
  | 'ambassador_approved'
  | 'member_rejected'
  | 'ambassador_rejected'
  | 'query_blog_created'
  | 'query_blog_deleted';
export const ADMIN_ACTIONS = [
  'member_approved',
  'ambassador_approved',
  'member_rejected',
  'ambassador_rejected',
  'query_blog_created',
  'query_blog_deleted',
] as const satisfies AdminAction[];
export type AdminTargetType = 'user' | 'blog';

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
  /** The latest approval or rejection note (0012); null when there is none. */
  review_note: string | null;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
  /** 0 admin, 1 ambassador, 2 member: the member directory's order (0008). */
  role_rank: GeneratedAlways<number>;
  /*
   * The application (0013). Null for users who joined before it existed; the API requires
   * them on every new application.
   */
  maiden_name: string | null;
  city: string | null;
  state: string | null;
  /** ISO 3166-1 alpha-2. */
  country_code: string | null;
  school_pass_year: number | null;
  school_name: string | null;
  /** A year such as "2012", or "NA". */
  college_pass_year: string | null;
  college_name: string | null;
  highest_degree: string | null;
  profession: string | null;
  linkedin_url: string | null;
  journey_stage_id: number | null;
  journey_stage_other: string | null;
  connection_other: string | null;
  join_reason_other: string | null;
  /** Ambassadors only. */
  weekly_hours_id: number | null;
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
  /** tsvector of title (weight A) and body (B), for Feed search (0009). Read as text. */
  search_vector: GeneratedAlways<string>;
}

export interface CommentsTable {
  comment_id: Generated<string>;
  blog_id: string;
  /** Null only once a deleted comment has been scrubbed by the purge (0011). */
  user_id: string | null;
  parent_comment_id: string | null;
  /** Null only once a deleted comment has been scrubbed by the purge (0011). */
  body: string | null;
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

/** A profile option set (0013): jodhpur_connections, journey_stages, join_reasons, weekly_hours_options. */
interface OptionColumns {
  code: string;
  label: string;
  sort_order: number;
  active: Generated<boolean>;
}

export interface JodhpurConnectionsTable extends OptionColumns {
  connection_id: GeneratedAlways<number>;
}
export interface JourneyStagesTable extends OptionColumns {
  journey_stage_id: GeneratedAlways<number>;
}
export interface JoinReasonsTable extends OptionColumns {
  join_reason_id: GeneratedAlways<number>;
}
export interface WeeklyHoursOptionsTable extends OptionColumns {
  weekly_hours_id: GeneratedAlways<number>;
}

export interface UserJodhpurConnectionsTable {
  user_id: string;
  connection_id: number;
}

export interface UserJoinReasonsTable {
  user_id: string;
  join_reason_id: number;
}

/** One run of public.purge_soft_deleted() (0011). Written only by that function. */
export interface PurgeRunsTable {
  run_id: GeneratedAlways<string>;
  started_at: Date;
  finished_at: Date;
  cutoff: Date;
  blogs_deleted: number;
  blog_comments_deleted: number;
  comments_deleted: number;
  comments_scrubbed: number;
  complete: boolean;
}

/** Append-only (0007): every column is insert-only, so an update does not type-check. */
type InsertOnly<T> = ColumnType<T, T, never>;

export interface AdminActionLogsTable {
  log_id: ColumnType<string, string | undefined, never>;
  admin_id: InsertOnly<string>;
  action: InsertOnly<AdminAction>;
  target_type: InsertOnly<AdminTargetType>;
  /** A plain id, deliberately not a foreign key (see the migration). */
  target_id: InsertOnly<string>;
  /** The target's name or title when the action happened. */
  target_label: InsertOnly<string>;
  reason: InsertOnly<string | null>;
  created_at: ColumnType<Date, Date | undefined, never>;
}

/**
 * Supabase Auth's users (schema auth), read-only. The API reads email from here to show
 * profiles and never copies it into public.
 */
export interface AuthUsersTable {
  id: ColumnType<string, never, never>;
  email: ColumnType<string | null, never, never>;
}

export interface Database {
  categories: CategoriesTable;
  users: UsersTable;
  referral_codes: ReferralCodesTable;
  blogs: BlogsTable;
  comments: CommentsTable;
  blogs_categories: BlogsCategoriesTable;
  user_categories: UserCategoriesTable;
  admin_action_logs: AdminActionLogsTable;
  jodhpur_connections: JodhpurConnectionsTable;
  journey_stages: JourneyStagesTable;
  join_reasons: JoinReasonsTable;
  weekly_hours_options: WeeklyHoursOptionsTable;
  user_jodhpur_connections: UserJodhpurConnectionsTable;
  user_join_reasons: UserJoinReasonsTable;
  purge_runs: PurgeRunsTable;
  'auth.users': AuthUsersTable;
}

/** A connection or an open transaction; repositories accept either. */
export type Db = Kysely<Database>;
