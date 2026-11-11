import type { RequestHandler } from 'express';
import { z } from 'zod';

import type { Db } from '../../db/schema.ts';
import { cursorParam } from '../../lib/cursor.ts';
import { parseInput } from '../../lib/validation.ts';
import { viewerOf } from '../../middleware/authenticate.ts';
import { listReferrals } from './referrals.service.ts';

const listReferralsQuery = z.strictObject({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: cursorParam.optional(),
});

export function listReferralsHandler(deps: { db: Db }): RequestHandler {
  return async (req, res) => {
    const page = parseInput(listReferralsQuery, req.query);
    res.json(await listReferrals(deps.db, viewerOf(req), page));
  };
}
