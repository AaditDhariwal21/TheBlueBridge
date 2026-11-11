import { Router, type RequestHandler } from 'express';

import type { Db } from '../../db/schema.ts';
import { requireApproved } from '../../middleware/authenticate.ts';
import {
  createBlogHandler,
  createQueryBlogHandler,
  deleteBlogHandler,
  getBlogHandler,
  getQueryBlogHandler,
  listFeedHandler,
  listMyBlogsHandler,
  listQueryBlogsHandler,
} from './blogs.handlers.ts';

/**
 * Reading is public (visitors and pending accounts browse). Writing needs an
 * approved account; the service then applies the role rules in policies/.
 * A Query Blog is a blog of type 'query': it is deleted through DELETE /blogs/:id
 * and its queries live under /blogs/:id/comments, like any blog's comments.
 */
export function blogsRoutes(deps: {
  db: Db;
  requireAuth: RequestHandler;
  limitWrites: RequestHandler;
}): Router {
  const write = [deps.requireAuth, requireApproved];
  const router = Router();
  router.get('/blogs', listFeedHandler(deps));
  router.post('/blogs', ...write, deps.limitWrites, createBlogHandler(deps));
  router.get('/blogs/:blogId', getBlogHandler(deps));
  router.delete('/blogs/:blogId', ...write, deleteBlogHandler(deps));

  router.get('/query-blogs', listQueryBlogsHandler(deps));
  router.post('/query-blogs', ...write, deps.limitWrites, createQueryBlogHandler(deps));
  router.get('/query-blogs/:blogId', getQueryBlogHandler(deps));

  router.get('/me/blogs', deps.requireAuth, listMyBlogsHandler(deps));
  return router;
}
