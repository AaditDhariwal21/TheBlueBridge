import type { AdminAction } from './types';

export const ADMIN_PATH = '/adminpanel';

/** The panel's sections, in navigation order. */
export const ADMIN_SECTIONS = [
  { to: ADMIN_PATH, label: 'Overview', end: true },
  { to: `${ADMIN_PATH}/members`, label: 'Community Directory', end: false },
  { to: `${ADMIN_PATH}/query-blogs`, label: 'Query Blogs', end: false },
  { to: `${ADMIN_PATH}/activity`, label: 'Activity log', end: false },
] as const;

export const pendingMembersPath = `${ADMIN_PATH}/members?status=pending`;

/** How each logged action reads: "<admin> approved member <name>". */
export const ACTION_LABELS: Record<AdminAction, { verb: string; filter: string }> = {
  member_approved: { verb: 'approved member', filter: 'Member approved' },
  ambassador_approved: { verb: 'approved ambassador', filter: 'Ambassador approved' },
  query_blog_created: { verb: 'started the Query Blog', filter: 'Query Blog started' },
  query_blog_deleted: { verb: 'removed the Query Blog', filter: 'Query Blog removed' },
};
