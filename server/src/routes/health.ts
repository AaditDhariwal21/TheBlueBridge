import type { Handler } from '../http.ts';
import { sendJson } from '../http.ts';

/** Liveness check for load balancers, uptime monitors and the dev proxy. */
export const health: Handler = (_req, res) => {
  sendJson(res, 200, { status: 'ok', uptime: Math.round(process.uptime()) });
};
