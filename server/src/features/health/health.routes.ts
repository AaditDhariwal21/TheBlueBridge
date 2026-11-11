import { Router } from 'express';

/** Liveness for load balancers, uptime monitors and the dev proxy. Touches nothing. */
export function healthRoutes(): Router {
  const router = Router();
  router.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });
  return router;
}
