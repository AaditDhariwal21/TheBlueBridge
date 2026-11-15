import type { RequestHandler } from 'express';

import type { Db } from '../../db/schema.ts';
import { parseInput } from '../../lib/validation.ts';
import { viewerOf } from '../../middleware/authenticate.ts';
import { applicationBody } from './users.schemas.ts';
import { getMe, reapply } from './users.service.ts';

export function getMeHandler(deps: { db: Db }): RequestHandler {
  return async (req, res) => {
    res.json({ user: await getMe(deps.db, viewerOf(req)) });
  };
}

/** A rejected applicant's new application; answers with her updated (pending) profile. */
export function reapplyHandler(deps: { db: Db }): RequestHandler {
  return async (req, res) => {
    const input = parseInput(applicationBody, req.body);
    res.json({ user: await reapply(deps.db, viewerOf(req), input) });
  };
}
