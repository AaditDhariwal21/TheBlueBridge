import type { RequestHandler } from 'express';

import type { Db } from '../../db/schema.ts';
import { parseInput } from '../../lib/validation.ts';
import { viewerOf } from '../../middleware/authenticate.ts';
import { listReferralsQuery } from './referrals.schemas.ts';
import { listReferrals } from './referrals.service.ts';

/** The signed-in member's own referrals only, whatever their role. */
export function listReferralsHandler(deps: { db: Db }): RequestHandler {
  return async (req, res) => {
    const page = parseInput(listReferralsQuery, req.query);
    res.json(await listReferrals(deps.db, viewerOf(req).id, page));
  };
}
