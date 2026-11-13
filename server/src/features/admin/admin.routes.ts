import { Router, type RequestHandler } from 'express';

import type { Db } from '../../db/schema.ts';
import { requireAdmin } from '../../middleware/authenticate.ts';
import { adminRateLimit } from '../../middleware/rateLimits.ts';
import { listAdminActionsHandler } from '../adminLog/adminLog.handlers.ts';
import { createQueryBlogHandler, deleteQueryBlogHandler } from '../blogs/blogs.handlers.ts';
import {
  approveMemberHandler,
  getMemberForAdminHandler,
  getOverviewHandler,
  listMemberReferralsHandler,
  listMembersForAdminHandler,
} from '../members/members.handlers.ts';

/**
 * Mounted at /admin: the admin panel's API. Every request, to any path here, must carry a
 * valid token (401), stay within the per-admin rate limit (429) and belong to an approved
 * admin (403), in that order. The handlers belong to the features that own the data.
 * Query Blogs are listed by the public GET /query-blogs (at most one per category).
 */
export function adminRoutes(deps: { db: Db; requireAuth: RequestHandler }): Router {
  const router = Router();
  router.use(deps.requireAuth, adminRateLimit(), requireAdmin);

  router.get('/overview', getOverviewHandler(deps));

  router.get('/members', listMembersForAdminHandler(deps));
  router.get('/members/:userId', getMemberForAdminHandler(deps));
  router.get('/members/:userId/referrals', listMemberReferralsHandler(deps));
  router.post('/members/:userId/approve', approveMemberHandler(deps));

  router.post('/query-blogs', createQueryBlogHandler(deps));
  router.delete('/query-blogs/:blogId', deleteQueryBlogHandler(deps));

  router.get('/action-logs', listAdminActionsHandler(deps));
  return router;
}
