import type { RequestHandler } from 'express';

import type { Db } from '../../db/schema.ts';
import { viewerOf } from '../../middleware/authenticate.ts';
import { getMe, getPublicProfile } from './users.service.ts';

export function getMeHandler(deps: { db: Db }): RequestHandler {
  return async (req, res) => {
    res.json({ user: await getMe(deps.db, viewerOf(req)) });
  };
}

export function getPublicProfileHandler(deps: { db: Db }): RequestHandler<{ id: string }> {
  return async (req, res) => {
    res.json({ user: await getPublicProfile(deps.db, req.params.id) });
  };
}
