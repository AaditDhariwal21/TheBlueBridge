import type { UserRole, UserStatus } from '../db/schema.ts';

/**
 * Who may do what. Pure functions with no I/O, so every endpoint asks the same
 * question the same way and the rules are unit-tested in one place.
 *
 * - Only `approved` accounts have any role power. Everyone else (visitors,
 *   represented as null, and pending/rejected/suspended users) can only browse.
 * - member:     writes discussion blogs, comments and replies, posts queries.
 * - ambassador: member powers, plus answers queries and moderates, but only in
 *               their own categories (1 or 2).
 * - admin:      ambassador powers in every category, and the only role that
 *               starts Query Blogs (one per category).
 * - The author of a query, of any role, may reply under their own query.
 */

export interface Actor {
  readonly id: string;
  readonly role: UserRole;
  readonly status: UserStatus;
}

/** An actor whose own categories are known. Needed for category-scoped checks. */
export interface ScopedActor extends Actor {
  readonly categoryIds: readonly string[];
}

export function isApproved(actor: Actor | null): actor is Actor {
  return actor?.status === 'approved';
}

/** Write a discussion blog. */
export function canWriteBlog(actor: Actor | null): boolean {
  return isApproved(actor);
}

/** Comment on a discussion blog, or reply to a comment there. */
export function canComment(actor: Actor | null): boolean {
  return isApproved(actor);
}

/** Post a query (a top-level comment) on any query blog. */
export function canPostQuery(actor: Actor | null): boolean {
  return isApproved(actor);
}

/** Reply under a query: its author, an ambassador for the topic, or an admin. */
export function canReplyUnderQuery(
  actor: ScopedActor | null,
  query: { readonly authorId: string; readonly categoryId: string },
): boolean {
  if (!isApproved(actor)) return false;
  return actor.id === query.authorId || hasCategoryPower(actor, [query.categoryId]);
}

/** Delete a blog, a comment or a query on a blog tagged with these categories. */
export function canModerate(
  actor: ScopedActor | null,
  blogCategoryIds: readonly string[],
): boolean {
  return isApproved(actor) && hasCategoryPower(actor, blogCategoryIds);
}

/** Start a category's Query Blog (the database allows one per category). Admins only. */
export function canCreateQueryBlog(actor: Actor | null): boolean {
  return isApproved(actor) && actor.role === 'admin';
}

/** See every referral, not just one's own. */
export function canViewAllReferrals(actor: Actor | null): boolean {
  return isApproved(actor) && actor.role === 'admin';
}

/** Admins everywhere; ambassadors where any of the categories is one of their own. */
function hasCategoryPower(actor: ScopedActor, categoryIds: readonly string[]): boolean {
  if (actor.role === 'admin') return true;
  if (actor.role !== 'ambassador') return false;
  return categoryIds.some((id) => actor.categoryIds.includes(id));
}
