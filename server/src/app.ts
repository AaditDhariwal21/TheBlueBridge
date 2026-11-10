import type { IncomingMessage, ServerResponse } from 'node:http';

import { sendError, type Handler } from './http.ts';
import { health } from './routes/health.ts';

/** Route table: path → method → handler. Add new endpoints here. */
const ROUTES: Record<string, Partial<Record<string, Handler>>> = {
  '/api/health': { GET: health },
};

/** Top-level request handler: routing, 404/405 and a last-resort 500. */
export async function app(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const started = performance.now();
  res.on('finish', () => {
    const ms = (performance.now() - started).toFixed(1);
    console.log(`${req.method ?? '?'} ${req.url ?? ''} ${res.statusCode} ${ms}ms`);
  });

  try {
    // Parse against a fixed base; never trust the Host header for routing.
    const { pathname } = new URL(req.url ?? '/', 'http://localhost');
    const methods = ROUTES[pathname];
    if (!methods) {
      sendError(res, 404, 'Not found');
      return;
    }

    const handler = methods[req.method ?? ''];
    if (!handler) {
      res.setHeader('Allow', Object.keys(methods).join(', '));
      sendError(res, 405, 'Method not allowed');
      return;
    }

    await handler(req, res);
  } catch (error) {
    // Log details server-side only; never leak internals to clients.
    console.error(error);
    if (!res.headersSent) sendError(res, 500, 'Internal server error');
    else res.end();
  }
}
