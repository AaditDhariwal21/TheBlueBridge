import { Router, type RequestHandler } from 'express';

import type { ClientIpHeader } from '../../config/env.ts';
import type { Db } from '../../db/schema.ts';
import { requireApproved } from '../../middleware/authenticate.ts';
import { searchRateLimit } from '../../middleware/rateLimits.ts';
import {
  getCommunitySizeHandler,
  getMemberProfileHandler,
  getProfileCardHandler,
  listDirectoryHandler,
} from './members.handlers.ts';

/**
 * Profiles as other people see them. The directory carries contact details (phone, email),
 * so it is for approved members only, never for anonymous visitors or scrapers.
 * GET /users/:id is the small card anyone may see (no contact details), and
 * GET /members/count only the community's size. (`/members/count` is matched before
 * `/members/:userId`, which would 404 for it anyway: "count" is not a uuid.)
 */
export function membersRoutes(deps: {
  db: Db;
  requireAuth: RequestHandler;
  clientIpHeader: ClientIpHeader | null;
}): Router {
  const members = [deps.requireAuth, requireApproved];
  const directorySearch = searchRateLimit(deps.clientIpHeader, ['q', 'roles']);
  const router = Router();
  router.get('/members', ...members, directorySearch, listDirectoryHandler(deps));
  router.get('/members/count', getCommunitySizeHandler(deps));
  router.get('/members/:userId', ...members, getMemberProfileHandler(deps));
  router.get('/users/:userId', getProfileCardHandler(deps));
  return router;
}
