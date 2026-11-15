import { Router, type RequestHandler } from 'express';

import type { Db } from '../../db/schema.ts';
import { getMeHandler, reapplyHandler } from './users.handlers.ts';

/**
 * The signed-in user's own account. Reapplying is open to rejected applicants only (the
 * service checks), and limited per account like other writes.
 */
export function usersRoutes(deps: {
  db: Db;
  requireAuth: RequestHandler;
  limitWrites: RequestHandler;
}): Router {
  const router = Router();
  router.get('/me', deps.requireAuth, getMeHandler(deps));
  router.post('/me/reapply', deps.requireAuth, deps.limitWrites, reapplyHandler(deps));
  return router;
}
