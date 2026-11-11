import type { RequestHandler } from 'express';

import type { Db } from '../../db/schema.ts';
import { listCategories } from './categories.service.ts';

export function listCategoriesHandler(deps: { db: Db }): RequestHandler {
  return async (_req, res) => {
    res.json({ categories: await listCategories(deps.db) });
  };
}
