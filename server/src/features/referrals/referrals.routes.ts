import { Router, type RequestHandler } from 'express';

import type { Db } from '../../db/schema.ts';
import { requireApproved } from '../../middleware/authenticate.ts';
import { listReferralsHandler } from './referrals.handlers.ts';

/** Referring is an approved member's privilege, so pending accounts get 403 here. */
export function referralsRoutes(deps: { db: Db; requireAuth: RequestHandler }): Router {
  const router = Router();
  router.get('/me/referrals', deps.requireAuth, requireApproved, listReferralsHandler(deps));
  return router;
}
