import { Router, type RequestHandler } from 'express';

import type { Db } from '../../db/schema.ts';
import { getMeHandler, getPublicProfileHandler } from './users.handlers.ts';

export function usersRoutes(deps: { db: Db; requireAuth: RequestHandler }): Router {
  const router = Router();
  router.get('/me', deps.requireAuth, getMeHandler(deps));
  router.get('/users/:id', getPublicProfileHandler(deps));
  return router;
}
