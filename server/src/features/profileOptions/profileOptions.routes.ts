import { Router } from 'express';

import type { Db } from '../../db/schema.ts';
import { listProfileOptionsHandler } from './profileOptions.handlers.ts';

/** Public: the application form's choices (sign-up happens before there is an account). */
export function profileOptionsRoutes(deps: { db: Db }): Router {
  const router = Router();
  router.get('/profile-options', listProfileOptionsHandler(deps));
  return router;
}
