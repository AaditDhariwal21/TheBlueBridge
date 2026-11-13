import type { RequestHandler } from 'express';

import type { Db } from '../../db/schema.ts';
import { viewerOf } from '../../middleware/authenticate.ts';
import { getMe } from './users.service.ts';

export function getMeHandler(deps: { db: Db }): RequestHandler {
  return async (req, res) => {
    res.json({ user: await getMe(deps.db, viewerOf(req)) });
  };
}
