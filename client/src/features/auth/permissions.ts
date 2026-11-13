import type { Role, Status } from './types';

/**
 * Client mirror of server/src/policies/permissions.ts, used only to decide
 * which controls to show. The API enforces the real rules; keep the two in
 * step when a rule changes.
 */

export interface Actor {
  readonly id: string;
  readonly role: Role;
  readonly status: Status;
  /** The actor's own categories (ambassadors: 1 or 2; everyone else: none). */
  readonly categoryIds: readonly string[];
}

function isApproved(actor: Actor | null): actor is Actor {
  return actor?.status === 'approved';
}

export function canWriteBlog(actor: Actor | null): boolean {
  return isApproved(actor);
}

export function canComment(actor: Actor | null): boolean {
  return isApproved(actor);
}

export function canPostQuery(actor: Actor | null): boolean {
  return isApproved(actor);
}

/** Its author, an ambassador for the query blog's category, or an admin. */
export function canReplyUnderQuery(
  actor: Actor | null,
  query: { readonly authorId: string; readonly categoryId: string },
): boolean {
  if (!isApproved(actor)) return false;
  return actor.id === query.authorId || hasCategoryPower(actor, [query.categoryId]);
}

/**
 * Remove a discussion blog, or a comment or query on a blog tagged with these categories.
 * A whole Query Blog needs canDeleteQueryBlog.
 */
export function canModerate(actor: Actor | null, categoryIds: readonly string[]): boolean {
  return isApproved(actor) && hasCategoryPower(actor, categoryIds);
}

/** The admin panel (/adminpanel): approved admins only. */
export function canUseAdminPanel(actor: Pick<Actor, 'role' | 'status'> | null): boolean {
  return actor?.status === 'approved' && actor.role === 'admin';
}

/** Start a category's Query Blog (one per category). Admins only. */
export function canCreateQueryBlog(actor: Actor | null): boolean {
  return canUseAdminPanel(actor);
}

/** Remove a whole Query Blog. Admins only; ambassadors moderate inside it. */
export function canDeleteQueryBlog(actor: Actor | null): boolean {
  return canUseAdminPanel(actor);
}

/** Approve an application: an admin, for a pending member or ambassador. */
export function canApproveMember(
  actor: Pick<Actor, 'role' | 'status'> | null,
  applicant: { readonly role: Role; readonly status: Status },
): boolean {
  return canUseAdminPanel(actor) && applicant.status === 'pending' && applicant.role !== 'admin';
}

/** Admins everywhere; ambassadors where any of the categories is one of their own. */
function hasCategoryPower(actor: Actor, categoryIds: readonly string[]): boolean {
  if (actor.role === 'admin') return true;
  return actor.role === 'ambassador' && categoryIds.some((id) => actor.categoryIds.includes(id));
}
