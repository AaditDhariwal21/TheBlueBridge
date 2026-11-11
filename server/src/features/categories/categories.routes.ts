import { Router } from 'express';

import type { Db } from '../../db/schema.ts';
import { listCategoriesHandler } from './categories.handlers.ts';

/** Public: the signup form's ambassador category picker. */
export function categoriesRoutes(deps: { db: Db }): Router {
  const router = Router();
  router.get('/categories', listCategoriesHandler(deps));
  return router;
}
