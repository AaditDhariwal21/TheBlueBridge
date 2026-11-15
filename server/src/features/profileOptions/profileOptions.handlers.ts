import type { RequestHandler } from 'express';

import type { Db } from '../../db/schema.ts';
import { listProfileOptions } from './profileOptions.service.ts';

export function listProfileOptionsHandler(deps: { db: Db }): RequestHandler {
  return async (_req, res) => {
    res.json({ options: await listProfileOptions(deps.db) });
  };
}
