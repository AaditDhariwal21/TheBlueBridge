import { Router, type RequestHandler } from 'express';

import type { Db } from '../../db/schema.ts';
import { requireApproved } from '../../middleware/authenticate.ts';
import {
  createCommentHandler,
  deleteCommentHandler,
  listCommentsHandler,
  listMemberCommentsHandler,
  listMyCommentsHandler,
} from './comments.handlers.ts';

/** Comments, queries and replies on a blog of either type. Reading is public. */
export function commentsRoutes(deps: {
  db: Db;
  requireAuth: RequestHandler;
  limitWrites: RequestHandler;
}): Router {
  const write = [deps.requireAuth, requireApproved];
  const router = Router();
  router.get('/blogs/:blogId/comments', listCommentsHandler(deps));
  router.post('/blogs/:blogId/comments', ...write, deps.limitWrites, createCommentHandler(deps));
  router.delete('/blogs/:blogId/comments/:commentId', ...write, deleteCommentHandler(deps));
  router.get('/me/comments', deps.requireAuth, listMyCommentsHandler(deps));
  // On a member's profile, which only approved members can open.
  router.get('/members/:userId/comments', ...write, listMemberCommentsHandler(deps));
  return router;
}
