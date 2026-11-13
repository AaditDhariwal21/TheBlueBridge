import type { RequestHandler } from 'express';

import type { Db } from '../../db/schema.ts';
import { parseInput } from '../../lib/validation.ts';
import { adminActionsQuery } from './adminLog.schemas.ts';
import { listAdminActions } from './adminLog.service.ts';

/** Read-only: the log has no edit or delete endpoints. */
export function listAdminActionsHandler({ db }: { db: Db }): RequestHandler {
  return async (req, res) => {
    res.json(await listAdminActions(db, parseInput(adminActionsQuery, req.query)));
  };
}
