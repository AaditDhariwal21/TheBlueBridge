import { Router, type RequestHandler } from 'express';

import type { Db } from '../../db/schema.ts';
import type { ClientIpHeader } from '../../config/env.ts';
import { requireApproved } from '../../middleware/authenticate.ts';
import { searchRateLimit } from '../../middleware/rateLimits.ts';
import {
  createBlogHandler,
  createQueryBlogHandler,
  deleteBlogHandler,
  getBlogHandler,
  getQueryBlogHandler,
  listFeedHandler,
  listMemberBlogsHandler,
  listMyBlogsHandler,
  listQueryBlogsHandler,
} from './blogs.handlers.ts';

/**
 * Reading is public (visitors and pending accounts browse). Writing needs an
 * approved account; the service then applies the role rules in policies/.
 * A Query Blog is a blog of type 'query': admins remove it through DELETE /blogs/:id or
 * DELETE /admin/query-blogs/:id, and its queries live under /blogs/:id/comments.
 * POST /query-blogs is the original route for starting one; the admin panel uses
 * POST /admin/query-blogs, which runs the same handler.
 */
export function blogsRoutes(deps: {
  db: Db;
  requireAuth: RequestHandler;
  limitWrites: RequestHandler;
  clientIpHeader: ClientIpHeader | null;
}): Router {
  const write = [deps.requireAuth, requireApproved];
  const router = Router();
  const feedSearch = searchRateLimit(deps.clientIpHeader, ['q', 'categories']);
  router.get('/blogs', feedSearch, listFeedHandler(deps));
  router.post('/blogs', ...write, deps.limitWrites, createBlogHandler(deps));
  router.get('/blogs/:blogId', getBlogHandler(deps));
  router.delete('/blogs/:blogId', ...write, deleteBlogHandler(deps));

  router.get('/query-blogs', listQueryBlogsHandler(deps));
  router.post('/query-blogs', ...write, deps.limitWrites, createQueryBlogHandler(deps));
  router.get('/query-blogs/:blogId', getQueryBlogHandler(deps));

  router.get('/me/blogs', deps.requireAuth, listMyBlogsHandler(deps));
  // On a member's profile, which only approved members can open.
  router.get('/members/:userId/blogs', ...write, listMemberBlogsHandler(deps));
  return router;
}
